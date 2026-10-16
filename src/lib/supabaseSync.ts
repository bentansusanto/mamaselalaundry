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
  getDB,
} from './db';

// Supabase client instance
const supabase = createClient();

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
      if (customers.length > 0) {
        const txC = db.transaction('customers', 'readwrite');
        for (const c of customers) {
          await txC.store.put(c);
        }
        await txC.done;
      }

      if (orders.length > 0) {
        const txO = db.transaction('orders', 'readwrite');
        for (const o of orders) {
          await txO.store.put(o);
        }
        await txO.done;
      }

      if (services.length > 0) {
        const txS = db.transaction('services', 'readwrite');
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
export async function syncCustomerToSupabase(customer: Customer) {
  try {
    const { error } = await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      created_at: customer.createdAt,
    });
    if (error) console.error('Supabase customer upsert error:', error);
  } catch (e) {
    console.error('Supabase customer error:', e);
  }
}

/**
 * Delete Customer from Supabase
 */
export async function deleteCustomerFromSupabase(id: string) {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) console.error('Supabase customer delete error:', error);
  } catch (e) {
    console.error('Supabase customer delete error:', e);
  }
}

/**
 * Upsert Order to Supabase
 */
export async function syncOrderToSupabase(order: Order) {
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
    if (error) console.error('Supabase order upsert error:', error);
  } catch (e) {
    console.error('Supabase order error:', e);
  }
}

/**
 * Delete Order from Supabase
 */
export async function deleteOrderFromSupabase(id: string) {
  try {
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) console.error('Supabase order delete error:', error);
  } catch (e) {
    console.error('Supabase order delete error:', e);
  }
}

/**
 * Upsert Service to Supabase
 */
export async function syncServiceToSupabase(service: ServiceItem) {
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
    if (error) console.error('Supabase service upsert error:', error);
  } catch (e) {
    console.error('Supabase service error:', e);
  }
}

/**
 * Delete Service from Supabase
 */
export async function deleteServiceFromSupabase(id: string) {
  try {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) console.error('Supabase service delete error:', error);
  } catch (e) {
    console.error('Supabase service delete error:', e);
  }
}
