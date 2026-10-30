import { createClient } from '@/utils/supabase/client';
import { Customer, Order, OrderItemDetail, ServiceItem, SpeedItem, VariantSize } from '@/types';
import { INITIAL_SERVICES, INITIAL_SPEEDS } from './initialData';
import { normalizeSpeedTariffs } from './utils';
import {
  saveCustomer,
  deleteCustomer,
  saveOrder,
  deleteOrder,
  saveService,
  deleteService,
  saveSpeed,
  deleteSpeed,
  getAllCustomers,
  getAllOrders,
  getAllServices,
  getAllSpeeds,
  getDeletedServiceIds,
  getDeletedSpeedIds,
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

function normalizeRemoteSpeed(sp: any): SpeedItem {
  // Supports rows from public.speeds table OR fallback rows stored in public.services with category='Kecepatan'
  const isFromServicesFallback = sp.category === 'Kecepatan';
  const rawSecondary = isFromServicesFallback
    ? sp.profit_margin_percent && Number(sp.profit_margin_percent) > 100
      ? Number(sp.profit_margin_percent)
      : undefined
    : sp.fee_secondary ?? sp.feeSecondary;

  return normalizeSpeedTariffs({
    id: sp.id,
    name: String(sp.name || 'Normal').trim(),
    durationLabel: String(
      isFromServicesFallback ? sp.unit || '2 Hari' : sp.duration_label || sp.durationLabel || '2 Hari'
    ).trim(),
    durationHours: Number(
      isFromServicesFallback ? sp.hpp || 48 : sp.duration_hours ?? sp.durationHours ?? 48
    ),
    fee: Number(isFromServicesFallback ? sp.price ?? 0 : sp.fee ?? 0),
    feeSecondary: rawSecondary !== undefined && rawSecondary !== null ? Number(rawSecondary) : undefined,
  });
}

/**
 * Fetch all data from Supabase and safely merge into local IndexedDB
 * without wiping out unsynced local data or default Kiloan/Satuan/Speeds data.
 */
export async function pullFromSupabase(): Promise<{
  customers: Customer[];
  orders: Order[];
  services: ServiceItem[];
  speeds: SpeedItem[];
}> {
  try {
    const [
      custRes,
      ordRes,
      srvRes,
      spdRes,
      queue,
      deletedServiceIds,
      deletedSpeedIds,
      localServices,
      localSpeeds,
      localOrders,
      localCustomers,
    ] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*'),
      supabase.from('speeds').select('*'),
      getSyncQueue(),
      getDeletedServiceIds(),
      getDeletedSpeedIds(),
      getAllServices(),
      getAllSpeeds(),
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

    const pendingSpeedDeletes = new Set([
      ...deletedSpeedIds,
      ...queue.filter((q) => q.entity === 'speeds' && q.action === 'delete').map((q) => q.data?.id),
    ]);
    const pendingSpeedUpdates = new Map<string, SpeedItem>();
    queue
      .filter((q) => q.entity === 'speeds' && q.action === 'update' && q.data?.id)
      .forEach((q) => pendingSpeedUpdates.set(q.data.id, q.data));

    // 0. Merge Speeds FIRST so Orders can resolve their foreign key relation (speed_id -> speeds)
    const fallbackSpeedRowsFromServices = (srvRes.data || []).filter(
      (s: any) => s.category === 'Kecepatan' || String(s.id || '').startsWith('SPD-')
    );
    const rawSpeedSource =
      !spdRes.error && Array.isArray(spdRes.data) && spdRes.data.length > 0
        ? spdRes.data
        : fallbackSpeedRowsFromServices;

    const remoteSpeedsRaw: SpeedItem[] = rawSpeedSource
      .map(normalizeRemoteSpeed)
      .filter((sp) => !pendingSpeedDeletes.has(sp.id));

    const mergedSpeedsMap = new Map<string, SpeedItem>();
    const speedsToPushToSupabase: SpeedItem[] = [];

    for (const defSpd of INITIAL_SPEEDS) {
      if (!pendingSpeedDeletes.has(defSpd.id)) {
        mergedSpeedsMap.set(defSpd.id, defSpd);
      }
    }
    for (const locSpd of localSpeeds) {
      if (!pendingSpeedDeletes.has(locSpd.id)) {
        mergedSpeedsMap.set(locSpd.id, normalizeSpeedTariffs(locSpd));
      }
    }
    const remoteSpeedIds = new Set<string>();
    for (const remSpd of remoteSpeedsRaw) {
      remoteSpeedIds.add(remSpd.id);
      mergedSpeedsMap.set(remSpd.id, normalizeSpeedTariffs(remSpd));
    }
    pendingSpeedUpdates.forEach((sp, id) => {
      if (!pendingSpeedDeletes.has(id)) {
        mergedSpeedsMap.set(id, normalizeSpeedTariffs(sp));
      }
    });

    const speeds = Array.from(mergedSpeedsMap.values()).sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );

    for (const sp of speeds) {
      const rawRem = rawSpeedSource.find((r: any) => r.id === sp.id);
      const needsTariffUpgrade =
        rawRem &&
        (Number(rawRem.fee ?? rawRem.price ?? 0) !== sp.fee ||
          (sp.feeSecondary && Number(rawRem.fee_secondary ?? rawRem.feeSecondary ?? 0) !== sp.feeSecondary));
      if (!remoteSpeedIds.has(sp.id) || needsTariffUpgrade) {
        speedsToPushToSupabase.push(sp);
      }
    }

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

    // 2. Merge Orders (Resolved with relation to Speeds table!)
    const remoteOrders: Order[] = (ordRes.data || [])
      .map((o: any) => {
        const parsedItems = parseOrderItems(o.items);
        const hasMainTotal = o.main_service_total !== undefined && o.main_service_total !== null;
        const relatedSpd =
          (o.speed_id && speeds.find((s) => s.id === o.speed_id)) ||
          speeds.find(
            (s) => s.name.trim().toLowerCase() === String(o.speed || 'Normal').trim().toLowerCase()
          );
        const hasSpeedFee = o.speed_fee !== undefined && o.speed_fee !== null;
        return {
          id: o.id,
          customerId: o.customer_id || '',
          customerName: o.customer_name || 'Pelanggan',
          customerPhone: o.customer_phone || '',
          createdAt: o.created_at || new Date().toISOString(),
          estimatedCompletion: o.estimated_completion || new Date().toISOString(),
          completedAt: o.completed_at || undefined,
          mainService: o.main_service || 'Cuci setrika',
          speedId: relatedSpd ? relatedSpd.id : o.speed_id || 'SPD-01',
          speed: relatedSpd ? relatedSpd.name : o.speed || 'Normal',
          speedFee: hasSpeedFee ? Number(o.speed_fee) : relatedSpd ? relatedSpd.fee : 0,
          speedDuration: relatedSpd ? relatedSpd.durationLabel : undefined,
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
      const relatedSpd =
        (o.speedId && speeds.find((s) => s.id === o.speedId)) ||
        speeds.find((s) => s.name.trim().toLowerCase() === String(o.speed || 'Normal').trim().toLowerCase());
      mergedOrdersMap.set(id, {
        ...o,
        speedId: relatedSpd ? relatedSpd.id : o.speedId || 'SPD-01',
        speed: relatedSpd ? relatedSpd.name : o.speed || 'Normal',
        speedDuration: relatedSpd ? relatedSpd.durationLabel : o.speedDuration,
      });
    });
    const orders = Array.from(mergedOrdersMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. Merge Services (Never wipe local or default services, and exclude SPD fallback rows)
    const remoteServicesRaw: ServiceItem[] = (srvRes.data || [])
      .filter((s: any) => s.category !== 'Kecepatan' && !String(s.id || '').startsWith('SPD-'))
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

      if (speeds.length > 0) {
        const txSpd = db.transaction('speeds', 'readwrite');
        await txSpd.store.clear();
        for (const sp of speeds) {
          await txSpd.store.put(sp);
        }
        await txSpd.done;
      }
    }

    // Push any missing default/rescued services & speeds to Supabase in background
    if (typeof window !== 'undefined' && navigator.onLine) {
      if (servicesToPushToSupabase.length > 0) {
        Promise.allSettled(servicesToPushToSupabase.map((s) => syncServiceToSupabase(s))).catch(() => {});
      }
      if (speedsToPushToSupabase.length > 0) {
        Promise.allSettled(speedsToPushToSupabase.map((sp) => syncSpeedToSupabase(sp))).catch(() => {});
      }
    }

    return {
      customers: !custRes.error ? customers : localCustomers,
      orders: !ordRes.error ? orders : localOrders,
      services,
      speeds,
    };
  } catch (err) {
    console.error('Error pulling data from Supabase:', err);
    const [customers, orders, services, speeds] = await Promise.all([
      getAllCustomers(),
      getAllOrders(),
      getAllServices(),
      getAllSpeeds(),
    ]);
    return { customers, orders, services, speeds };
  }
}

/**
 * Realtime Supabase Subscription
 * Listens for INSERT, UPDATE, DELETE events across customers, orders, services, and speeds
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
          const currentSpeeds = await getAllSpeeds();
          const relatedSpd =
            (o.speed_id && currentSpeeds.find((s) => s.id === o.speed_id)) ||
            currentSpeeds.find(
              (s) => s.name.trim().toLowerCase() === String(o.speed || 'Normal').trim().toLowerCase()
            );
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
              speedId: relatedSpd ? relatedSpd.id : o.speed_id || 'SPD-01',
              speed: relatedSpd ? relatedSpd.name : o.speed || 'Normal',
              speedFee:
                o.speed_fee !== undefined && o.speed_fee !== null
                  ? Number(o.speed_fee)
                  : relatedSpd
                  ? relatedSpd.fee
                  : 0,
              speedDuration: relatedSpd ? relatedSpd.durationLabel : undefined,
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
          const delId = String(payload.old?.id || '');
          if (delId.startsWith('SPD-')) {
            await deleteSpeed(delId, true);
          } else {
            await deleteService(delId, true);
          }
        } else if (payload.new) {
          const s = payload.new;
          if (s.category === 'Kecepatan' || String(s.id || '').startsWith('SPD-')) {
            await saveSpeed(normalizeRemoteSpeed(s), true);
          } else {
            await saveService(normalizeRemoteService(s), true);
          }
        }
        onDataChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'speeds' },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          await deleteSpeed(payload.old.id, true);
        } else if (payload.new) {
          await saveSpeed(normalizeRemoteSpeed(payload.new), true);
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
 * Upsert Order to Supabase (with speed_id relation + automatic fallback if speed_id column not yet migrated)
 */
export async function syncOrderToSupabase(order: Order): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const basePayload = {
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
    };

    const { error } = await supabase.from('orders').upsert({
      ...basePayload,
      speed_id: order.speedId || null,
    });

    if (error) {
      // Fallback if speed_id column or foreign key is not yet migrated in remote Supabase table
      const fallbackRes = await supabase.from('orders').upsert(basePayload);
      if (fallbackRes.error) {
        console.error('Supabase order upsert error:', fallbackRes.error);
        return false;
      }
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
 * Upsert Speed to Supabase (public.speeds table with automatic fallback to public.services if speeds table not created yet)
 */
export async function syncSpeedToSupabase(speed: SpeedItem): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    const normalized = normalizeSpeedTariffs(speed);
    const { error } = await supabase.from('speeds').upsert({
      id: normalized.id,
      name: normalized.name,
      duration_label: normalized.durationLabel,
      duration_hours: normalized.durationHours,
      fee: normalized.fee,
      fee_secondary: normalized.feeSecondary ?? 0,
    });
    if (error) {
      // Try public.speeds without fee_secondary column first
      const retrySpeeds = await supabase.from('speeds').upsert({
        id: normalized.id,
        name: normalized.name,
        duration_label: normalized.durationLabel,
        duration_hours: normalized.durationHours,
        fee: normalized.fee,
      });
      if (retrySpeeds.error) {
        // Fallback: also persist in public.services with category='Kecepatan' if speeds table hasn't been created in Supabase yet
        const fallbackRes = await supabase.from('services').upsert({
          id: normalized.id,
          name: normalized.name,
          category: 'Kecepatan',
          unit: normalized.durationLabel,
          price: normalized.fee,
          hpp: normalized.durationHours,
          profit_margin_percent: normalized.feeSecondary ?? 0,
        });
        if (fallbackRes.error) {
          console.error('Supabase speed upsert error:', error);
          return false;
        }
      }
    }
    const queue = await getSyncQueue();
    const ids = queue.filter((q) => q.entity === 'speeds' && q.data?.id === speed.id).map((q) => q.id);
    if (ids.length > 0) await clearSyncQueue(ids);
    return true;
  } catch (e) {
    console.error('Supabase speed error:', e);
    return false;
  }
}

/**
 * Delete Speed from Supabase
 */
export async function deleteSpeedFromSupabase(id: string): Promise<boolean> {
  if (typeof window !== 'undefined' && !navigator.onLine) return false;
  try {
    await supabase.from('speeds').delete().eq('id', id);
    await supabase.from('services').delete().eq('id', id);
    const queue = await getSyncQueue();
    const qIds = queue.filter((q) => q.entity === 'speeds' && q.data?.id === id).map((q) => q.id);
    if (qIds.length > 0) await clearSyncQueue(qIds);
    return true;
  } catch (e) {
    console.error('Supabase speed delete error:', e);
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
  speeds: SpeedItem[];
}> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { success: false, syncedCount: 0, customers: [], orders: [], services: [], speeds: [] };
  }

  if (isSyncRunning) {
    const [customers, orders, services, speeds] = await Promise.all([
      getAllCustomers(),
      getAllOrders(),
      getAllServices(),
      getAllSpeeds(),
    ]);
    return { success: true, syncedCount: 0, customers, orders, services, speeds };
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
        } else if (item.entity === 'speeds') {
          if (item.action === 'delete') {
            ok = await deleteSpeedFromSupabase(item.data.id);
          } else {
            ok = await syncSpeedToSupabase(item.data);
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
      speeds: freshData.speeds,
    };
  } catch (err) {
    console.error('Error syncing offline queue to Supabase:', err);
    return { success: false, syncedCount: 0, customers: [], orders: [], services: [], speeds: [] };
  } finally {
    isSyncRunning = false;
  }
}

