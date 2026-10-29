import { createClient } from '@/utils/supabase/client';
import { Customer, Order, OrderItemDetail, ServiceItem, VariantSize } from '@/types';
import { INITIAL_SERVICES } from './initialData';
import {
  saveCustomer,
  deleteCustomer,
  saveOrder,
  deleteOrder,
  saveService,
  deleteService,
  getAllCustomers,
  getAllOrders,
  getAllServices,
  getDeletedServiceIds,
  getSyncQueue,
  clearSyncQueue,
  getDB,
} from './db';

// Supabase client instance
export const supabase = createClient();

let isSyncRunning = false;

function parseOrderItems(rawItems: any): OrderItemDetail[] {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string' && rawItems.trim()) {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeRemoteService(s: any): ServiceItem {
  let name = String(s.name || '').trim();
  let variant: VariantSize | undefined = s.variant || undefined;

  // Normalize legacy seeded rows like "Bedcover S" with null variant
  if (!variant && s.category === 'Satuan') {
    const match = name.match(/^(Bedcover|Selimut)\s+(S|M|L)$/i);
    if (match) {
      name = match[1];
      variant = match[2].toUpperCase() as VariantSize;
    }
  }

  return {
    id: s.id,
    name,
    category: s.category === 'Satuan' ? 'Satuan' : 'Kiloan',
    variant,
    unit: s.unit || (s.category === 'Satuan' ? 'pcs' : 'kg'),
    price: Number(s.price) || 0,
    hpp: Number(s.hpp) || 0,
    profitMarginPercent: Number(s.profit_margin_percent) || 0,
  };
}

/**
 * Fetch all data from Supabase and safely merge into local IndexedDB
 * without wiping out unsynced local data or default Kiloan/Satuan services.
 */
export async function pullFromSupabase(): Promise<{
  customers: Customer[];
  orders: Order[];
  services: ServiceItem[];
}> {
  try {
    const [custRes, ordRes, srvRes, queue, deletedServiceIds, localServices, localOrders, localCustomers] =
      await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('services').select('*'),
        getSyncQueue(),
        getDeletedServiceIds(),
        getAllServices(),
        getAllOrders(),
        getAllCustomers(),
      ]);

    const db = await getDB();

    const pendingOrderDeletes = new Set(
      queue.filter((q) => q.entity === 'orders' && q.action === 'delete').map((q) => q.data?.id)
    );
    const pendingOrderUpdates = new Map<string, Order>();
    queue
      .filter((q) => q.entity === 'orders' && q.action === 'update' && q.data?.id)
      .forEach((q) => pendingOrderUpdates.set(q.data.id, q.data));

    const pendingCustomerDeletes = new Set(
      queue.filter((q) => q.entity === 'customers' && q.action === 'delete').map((q) => q.data?.id)
    );
    const pendingCustomerUpdates = new Map<string, Customer>();
    queue
      .filter((q) => q.entity === 'customers' && q.action === 'update' && q.data?.id)
      .forEach((q) => pendingCustomerUpdates.set(q.data.id, q.data));

    const pendingServiceDeletes = new Set([
      ...deletedServiceIds,
      ...queue.filter((q) => q.entity === 'services' && q.action === 'delete').map((q) => q.data?.id),
    ]);
    const pendingServiceUpdates = new Map<string, ServiceItem>();
    queue
      .filter((q) => q.entity === 'services' && q.action === 'update' && q.data?.id)
      .forEach((q) => pendingServiceUpdates.set(q.data.id, q.data));

    // 1. Merge Customers
    const remoteCustomers: Customer[] = (custRes.data || [])
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '-',
        createdAt: c.created_at || new Date().toISOString(),
      }))
      .filter((c) => !pendingCustomerDeletes.has(c.id));

    const mergedCustomersMap = new Map<string, Customer>();
    for (const c of remoteCustomers) {
      mergedCustomersMap.set(c.id, c);
    }
    pendingCustomerUpdates.forEach((c, id) => {
      mergedCustomersMap.set(id, c);
    });
    const customers = Array.from(mergedCustomersMap.values());

    // 2. Merge Orders
    const remoteOrders: Order[] = (ordRes.data || [])
      .map((o: any) => {
        const parsedItems = parseOrderItems(o.items);
        const hasMainTotal = o.main_service_total !== undefined && o.main_service_total !== null;
        return {
          id: o.id,
          customerId: o.customer_id || '',
          customerName: o.customer_name || 'Pelanggan',
          customerPhone: o.customer_phone || '',
          createdAt: o.created_at || new Date().toISOString(),
          estimatedCompletion: o.estimated_completion || new Date().toISOString(),
          completedAt: o.completed_at || undefined,
          mainService: o.main_service || 'Cuci setrika',
          speed: o.speed || 'Normal',
          speedFee: Number(o.speed_fee) || 0,
          actualWeight: Number(o.actual_weight) || 0,
          billedWeight: Number(o.billed_weight) || 0,
          items: parsedItems,
          mainServiceTotal: hasMainTotal ? Number(o.main_service_total) : Number(o.total_price) || 0,
          itemsTotal: Number(o.items_total) || parsedItems.reduce((s, it) => s + (Number(it.total) || 0), 0),
          totalPrice: Number(o.total_price) || 0,
          paymentStatus: o.payment_status || 'Belum Bayar',
          paymentMethod: o.payment_method || 'Cash',
          paymentDate: o.payment_date || undefined,
          progressStatus: o.progress_status || 'Proses',
          notes: o.notes || '',
          cashierName: o.cashier_name || 'Mama Sela',
        };
      })
      .filter((o) => !pendingOrderDeletes.has(o.id));

    const mergedOrdersMap = new Map<string, Order>();
    for (const o of remoteOrders) {
      mergedOrdersMap.set(o.id, o);
    }
    pendingOrderUpdates.forEach((o, id) => {
      mergedOrdersMap.set(id, o);
    });
    const orders = Array.from(mergedOrdersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. Merge Services (Never wipe local or default services!)
    const remoteServicesRaw: ServiceItem[] = (srvRes.data || [])
      .map(normalizeRemoteService)
      .filter((s) => !pendingServiceDeletes.has(s.id));

    // Calculate highest SRV-XX number so we can rescue any collided custom services
    let maxSrvNum = INITIAL_SERVICES.length;
    for (const s of [...localServices, ...remoteServicesRaw]) {
      const m = s.id.match(/^SRV-(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxSrvNum) maxSrvNum = n;
      }
    }

    const mergedServicesMap = new Map<string, ServiceItem>();
    const servicesToPushToSupabase: ServiceItem[] = [];

    // Seed with INITIAL_SERVICES first (unless explicitly deleted by user)
    for (const defSrv of INITIAL_SERVICES) {
      if (!pendingServiceDeletes.has(defSrv.id)) {
        mergedServicesMap.set(defSrv.id, defSrv);
      }
    }

    // Layer local services (rescuing any custom service that collided with SRV-01..SRV-09)
    for (const locSrv of localServices) {
      if (pendingServiceDeletes.has(locSrv.id)) continue;
      const defMatch = INITIAL_SERVICES.find((d) => d.id === locSrv.id);
      if (
        defMatch &&
        (locSrv.name.toLowerCase().trim() !== defMatch.name.toLowerCase().trim() ||
          locSrv.category !== defMatch.category)
      ) {
        // Custom service collided with default ID: give it a new non-colliding ID
        maxSrvNum += 1;
        const rescued: ServiceItem = {
          ...locSrv,
          id: `SRV-${String(maxSrvNum).padStart(2, '0')}`,
        };
        mergedServicesMap.set(rescued.id, rescued);
        servicesToPushToSupabase.push(rescued);
      } else {
        mergedServicesMap.set(locSrv.id, locSrv);
      }
    }

    // Layer remote services (also rescuing if a remote custom service collided with SRV-01..SRV-09)
    const remoteIds = new Set<string>();
    for (const remSrv of remoteServicesRaw) {
      remoteIds.add(remSrv.id);
      const defMatch = INITIAL_SERVICES.find((d) => d.id === remSrv.id);
      if (
        defMatch &&
        (remSrv.name.toLowerCase().trim() !== defMatch.name.toLowerCase().trim() ||
          remSrv.category !== defMatch.category)
      ) {
        // Check if this custom service is already in mergedServicesMap under another ID
        const alreadyExists = Array.from(mergedServicesMap.values()).some(
          (existing) =>
            existing.name.toLowerCase().trim() === remSrv.name.toLowerCase().trim() &&
            existing.category === remSrv.category &&
            (existing.variant || '') === (remSrv.variant || '')
        );
        if (!alreadyExists) {
          maxSrvNum += 1;
          const rescued: ServiceItem = {
            ...remSrv,
            id: `SRV-${String(maxSrvNum).padStart(2, '0')}`,
          };
          mergedServicesMap.set(rescued.id, rescued);
          servicesToPushToSupabase.push(rescued);
        }
        // Also ensure default service is restored in Supabase
        if (!pendingServiceDeletes.has(defMatch.id)) {
          mergedServicesMap.set(defMatch.id, defMatch);
          servicesToPushToSupabase.push(defMatch);
        }
      } else {
        mergedServicesMap.set(remSrv.id, remSrv);
      }
    }

    // Apply any pending local updates from syncQueue on top
    pendingServiceUpdates.forEach((srv, id) => {
      if (!pendingServiceDeletes.has(id)) {
        mergedServicesMap.set(id, srv);
      }
    });

    const services = Array.from(mergedServicesMap.values()).sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );

    // Any service in merged list not yet in remoteIds should be synced up to Supabase
    if (!srvRes.error) {
      for (const s of services) {
        if (!remoteIds.has(s.id) && !servicesToPushToSupabase.some((x) => x.id === s.id)) {
          servicesToPushToSupabase.push(s);
        }
      }
    }

    if (db) {
      if (!custRes.error) {
        const txC = db.transaction('customers', 'readwrite');
        await txC.store.clear();
        for (const c of customers) {
          await txC.store.put(c);
        }
        await txC.done;
      }

      if (!ordRes.error) {
        const txO = db.transaction('orders', 'readwrite');
        await txO.store.clear();
        for (const o of orders) {
          await txO.store.put(o);
        }
        await txO.done;
      }

      if (services.length > 0) {
        const txS = db.transaction('services', 'readwrite');
        await txS.store.clear();
        for (const s of services) {
          await txS.store.put(s);
        }
        await txS.done;
      }
    }

    // Push any missing default/rescued services to Supabase in background
    if (servicesToPushToSupabase.length > 0 && typeof window !== 'undefined' && navigator.onLine) {
      Promise.allSettled(servicesToPushToSupabase.map((s) => syncServiceToSupabase(s))).catch(() => {});
    }

    return {
      customers: !custRes.error ? customers : localCustomers,
      orders: !ordRes.error ? orders : localOrders,
      services,
    };
  } catch (err) {
    console.error('Error pulling data from Supabase:', err);
    const [customers, orders, services] = await Promise.all([
      getAllCustomers(),
      getAllOrders(),
      getAllServices(),
    ]);
    return { customers, orders, services };
  }
}

/**
 * Realtime Supabase Subscription
 * Listens for INSERT, UPDATE, DELETE events across customers, orders, and services
 */
export function subscribeToSupabaseRealtime(onDataChanged: () => void) {
  const channel = supabase
    .channel('mama-selalaundry-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customers' },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          await deleteCustomer(payload.old.id, true);
        } else if (payload.new) {
          const c = payload.new;
          await saveCustomer(
            {
              id: c.id,
              name: c.name,
              phone: c.phone || '',
              address: c.address || '-',
              createdAt: c.created_at,
            },
            true
          );
        }
        onDataChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          await deleteOrder(payload.old.id, true);
        } else if (payload.new) {
          const o = payload.new;
          const parsedItems = parseOrderItems(o.items);
          const hasMainTotal = o.main_service_total !== undefined && o.main_service_total !== null;
          await saveOrder(
            {
              id: o.id,
              customerId: o.customer_id || '',
              customerName: o.customer_name || 'Pelanggan',
              customerPhone: o.customer_phone || '',
              createdAt: o.created_at,
              estimatedCompletion: o.estimated_completion,
              completedAt: o.completed_at || undefined,
              mainService: o.main_service || 'Cuci setrika',
              speed: o.speed || 'Normal',
              speedFee: Number(o.speed_fee) || 0,
              actualWeight: Number(o.actual_weight) || 0,
              billedWeight: Number(o.billed_weight) || 0,
              items: parsedItems,
              mainServiceTotal: hasMainTotal ? Number(o.main_service_total) : Number(o.total_price) || 0,
              itemsTotal:
                Number(o.items_total) || parsedItems.reduce((s, it) => s + (Number(it.total) || 0), 0),
              totalPrice: Number(o.total_price) || 0,
              paymentStatus: o.payment_status || 'Belum Bayar',
              paymentMethod: o.payment_method || 'Cash',
              paymentDate: o.payment_date || undefined,
              progressStatus: o.progress_status || 'Proses',
              notes: o.notes || '',
              cashierName: o.cashier_name || 'Mama Sela',
            },
            true
          );
        }
        onDataChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'services' },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          await deleteService(payload.old.id, true);
        } else if (payload.new) {
          const s = payload.new;
          await saveService(normalizeRemoteService(s), true);
        }
        onDataChanged();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Upsert Customer to Supabase
 */
export async function syncCustomerToSupabase(customer: Customer): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      created_at: customer.createdAt,
    });
    if (error) {
      console.error('Supabase customer upsert error:', error);
      return false;
    }
    const queue = await getSyncQueue();
    const ids = queue.filter((q) => q.entity === 'customers' && q.data?.id === customer.id).map((q) => q.id);
    if (ids.length > 0) await clearSyncQueue(ids);
    return true;
  } catch (e) {
    console.error('Supabase customer error:', e);
    return false;
  }
}

/**
 * Delete Customer from Supabase
 */
export async function deleteCustomerFromSupabase(id: string): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.error('Supabase customer delete error:', error);
      return false;
    }
    const queue = await getSyncQueue();
    const qIds = queue.filter((q) => q.entity === 'customers' && q.data?.id === id).map((q) => q.id);
    if (qIds.length > 0) await clearSyncQueue(qIds);
    return true;
  } catch (e) {
    console.error('Supabase customer delete error:', e);
    return false;
  }
}

/**
 * Upsert Order to Supabase
 */
export async function syncOrderToSupabase(order: Order): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('orders').upsert({
      id: order.id,
      customer_id: order.customerId,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      created_at: order.createdAt,
      estimated_completion: order.estimatedCompletion,
      completed_at: order.completedAt || null,
      main_service: order.mainService,
      speed: order.speed,
      speed_fee: order.speedFee,
      actual_weight: order.actualWeight,
      billed_weight: order.billedWeight,
      items: order.items || [],
      main_service_total: order.mainServiceTotal,
      items_total: order.itemsTotal,
      total_price: order.totalPrice,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      payment_date: order.paymentDate || null,
      progress_status: order.progressStatus,
      notes: order.notes || '',
      cashier_name: order.cashierName,
    });
    if (error) {
      console.error('Supabase order upsert error:', error);
      return false;
    }
    const queue = await getSyncQueue();
    const ids = queue.filter((q) => q.entity === 'orders' && q.data?.id === order.id).map((q) => q.id);
    if (ids.length > 0) await clearSyncQueue(ids);
    return true;
  } catch (e) {
    console.error('Supabase order error:', e);
    return false;
  }
}

/**
 * Delete Order from Supabase
 */
export async function deleteOrderFromSupabase(id: string): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      console.error('Supabase order delete error:', error);
      return false;
    }
    const queue = await getSyncQueue();
    const qIds = queue.filter((q) => q.entity === 'orders' && q.data?.id === id).map((q) => q.id);
    if (qIds.length > 0) await clearSyncQueue(qIds);
    return true;
  } catch (e) {
    console.error('Supabase order delete error:', e);
    return false;
  }
}

/**
 * Upsert Service to Supabase
 */
export async function syncServiceToSupabase(service: ServiceItem): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('services').upsert({
      id: service.id,
      name: service.name,
      category: service.category,
      variant: service.variant || null,
      unit: service.unit,
      price: service.price,
      hpp: service.hpp,
      profit_margin_percent: service.profitMarginPercent,
    });
    if (error) {
      // Fallback if variant column does not exist in remote schema
      const fallbackRes = await supabase.from('services').upsert({
        id: service.id,
        name: service.variant ? `${service.name} ${service.variant}` : service.name,
        category: service.category,
        unit: service.unit,
        price: service.price,
        hpp: service.hpp,
        profit_margin_percent: service.profitMarginPercent,
      });
      if (fallbackRes.error) {
        console.error('Supabase service upsert error:', error);
        return false;
      }
    }
    const queue = await getSyncQueue();
    const ids = queue.filter((q) => q.entity === 'services' && q.data?.id === service.id).map((q) => q.id);
    if (ids.length > 0) await clearSyncQueue(ids);
    return true;
  } catch (e) {
    console.error('Supabase service error:', e);
    return false;
  }
}

/**
 * Delete Service from Supabase
 */
export async function deleteServiceFromSupabase(id: string): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) {
      console.error('Supabase service delete error:', error);
      return false;
    }
    const queue = await getSyncQueue();
    const qIds = queue.filter((q) => q.entity === 'services' && q.data?.id === id).map((q) => q.id);
    if (qIds.length > 0) await clearSyncQueue(qIds);
    return true;
  } catch (e) {
    console.error('Supabase service delete error:', e);
    return false;
  }
}

/**
 * Flush all offline queue changes to Supabase when reconnected, then pull latest data
 */
export async function syncOfflineQueueToSupabase(): Promise<{
  success: boolean;
  syncedCount: number;
  customers: Customer[];
  orders: Order[];
  services: ServiceItem[];
}> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0, customers: [], orders: [], services: [] };
  }

  if (isSyncRunning) {
    const [customers, orders, services] = await Promise.all([
      getAllCustomers(),
      getAllOrders(),
      getAllServices(),
    ]);
    return { success: true, syncedCount: 0, customers, orders, services };
  }

  isSyncRunning = true;
  try {
    const queue = await getSyncQueue();
    const processedIds: string[] = [];

    for (const item of queue) {
      try {
        let ok = false;
        if (item.entity === 'orders') {
          if (item.action === 'delete') {
            ok = await deleteOrderFromSupabase(item.data.id);
          } else {
            ok = await syncOrderToSupabase(item.data);
          }
        } else if (item.entity === 'customers') {
          if (item.action === 'delete') {
            ok = await deleteCustomerFromSupabase(item.data.id);
          } else {
            ok = await syncCustomerToSupabase(item.data);
          }
        } else if (item.entity === 'services') {
          if (item.action === 'delete') {
            ok = await deleteServiceFromSupabase(item.data.id);
          } else {
            ok = await syncServiceToSupabase(item.data);
          }
        }
        if (ok) {
          processedIds.push(item.id);
        }
      } catch (itemErr) {
        console.error('Failed to process offline queue item:', item, itemErr);
      }
    }

    if (processedIds.length > 0) {
      await clearSyncQueue(processedIds);
    }

    // Pull merged fresh data from Supabase
    const freshData = await pullFromSupabase();

    return {
      success: true,
      syncedCount: processedIds.length,
      customers: freshData.customers,
      orders: freshData.orders,
      services: freshData.services,
    };
  } catch (err) {
    console.error('Error syncing offline queue to Supabase:', err);
    return { success: false, syncedCount: 0, customers: [], orders: [], services: [] };
  } finally {
    isSyncRunning = false;
  }
}

