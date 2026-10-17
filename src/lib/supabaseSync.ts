import { createClient } from '@/utils/supabase/client';
import { Customer, Order, ServiceItem } from '@/types';
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
  getSyncQueue,
  clearSyncQueue,
  getDB,
} from './db';

// Supabase client instance
export const supabase = createClient();

/**
 * Fetch all data from Supabase and sync into local IndexedDB
 */
export async function pullFromSupabase(): Promise<{
  customers: Customer[];
  orders: Order[];
  services: ServiceItem[];
}> {
  try {
    const [custRes, ordRes, srvRes] = await Promise.all([
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('*'),
    ]);

    const db = await getDB();

    const customers: Customer[] = (custRes.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      address: c.address || '-',
      createdAt: c.created_at || new Date().toISOString(),
    }));

    const orders: Order[] = (ordRes.data || []).map((o: any) => ({
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
      items: Array.isArray(o.items) ? o.items : [],
      mainServiceTotal: Number(o.main_service_total) || Number(o.total_price) || 0,
      itemsTotal: Number(o.items_total) || 0,
      totalPrice: Number(o.total_price) || 0,
      paymentStatus: o.payment_status || 'Belum Bayar',
      paymentMethod: o.payment_method || 'Cash',
      paymentDate: o.payment_date || undefined,
      progressStatus: o.progress_status || 'Proses',
      notes: o.notes || '',
      cashierName: o.cashier_name || 'Mama Sela',
    }));

    const services: ServiceItem[] = (srvRes.data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      category: s.category || 'Kiloan',
      variant: s.variant || undefined,
      unit: s.unit || 'kg',
      price: Number(s.price) || 0,
      hpp: Number(s.hpp) || 0,
      profitMarginPercent: Number(s.profit_margin_percent) || 0,
    }));

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

      if (!srvRes.error && services.length > 0) {
        const txS = db.transaction('services', 'readwrite');
        await txS.store.clear();
        for (const s of services) {
          await txS.store.put(s);
        }
        await txS.done;
      }
    }

    return { customers, orders, services };
  } catch (err) {
    console.error('Error pulling data from Supabase:', err);
    return { customers: [], orders: [], services: [] };
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
        console.log('Realtime change in customers:', payload);
        if (payload.eventType === 'DELETE') {
          await deleteCustomer(payload.old.id);
        } else if (payload.new) {
          const c = payload.new;
          await saveCustomer({
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            address: c.address || '-',
            createdAt: c.created_at,
          });
        }
        onDataChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      async (payload) => {
        console.log('Realtime change in orders:', payload);
        if (payload.eventType === 'DELETE') {
          await deleteOrder(payload.old.id);
        } else if (payload.new) {
          const o = payload.new;
          await saveOrder({
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
            items: Array.isArray(o.items) ? o.items : [],
            mainServiceTotal: Number(o.main_service_total) || Number(o.total_price) || 0,
            itemsTotal: Number(o.items_total) || 0,
            totalPrice: Number(o.total_price) || 0,
            paymentStatus: o.payment_status || 'Belum Bayar',
            paymentMethod: o.payment_method || 'Cash',
            paymentDate: o.payment_date || undefined,
            progressStatus: o.progress_status || 'Proses',
            notes: o.notes || '',
            cashierName: o.cashier_name || 'Mama Sela',
          });
        }
        onDataChanged();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'services' },
      async (payload) => {
        console.log('Realtime change in services:', payload);
        if (payload.eventType === 'DELETE') {
          await deleteService(payload.old.id);
        } else if (payload.new) {
          const s = payload.new;
          await saveService({
            id: s.id,
            name: s.name,
            category: s.category || 'Kiloan',
            variant: s.variant || undefined,
            unit: s.unit || 'kg',
            price: Number(s.price) || 0,
            hpp: Number(s.hpp) || 0,
            profitMarginPercent: Number(s.profit_margin_percent) || 0,
          });
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
    // Clear from local offline queue on success
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
      items: order.items,
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
      console.error('Supabase service upsert error:', error);
      return false;
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

  try {
    const queue = await getSyncQueue();
    const processedIds: string[] = [];

    for (const item of queue) {
      try {
        if (item.entity === 'orders') {
          if (item.action === 'delete') {
            await deleteOrderFromSupabase(item.data.id);
          } else {
            await syncOrderToSupabase(item.data);
          }
          processedIds.push(item.id);
        } else if (item.entity === 'customers') {
          if (item.action === 'delete') {
            await deleteCustomerFromSupabase(item.data.id);
          } else {
            await syncCustomerToSupabase(item.data);
          }
          processedIds.push(item.id);
        } else if (item.entity === 'services') {
          if (item.action === 'delete') {
            await deleteServiceFromSupabase(item.data.id);
          } else {
            await syncServiceToSupabase(item.data);
          }
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
  }
}

