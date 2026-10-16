import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Order, ServiceItem, UserAccount, SheetsConfig, SyncQueueItem } from '@/types';
import { INITIAL_CUSTOMERS, INITIAL_ORDERS, INITIAL_SERVICES, INITIAL_USERS } from './initialData';

interface LaundryDB extends DBSchema {
  orders: {
    key: string;
    value: Order;
    indexes: { 'by-date': string; 'by-customer': string; 'by-status': string };
  };
  customers: {
    key: string;
    value: Customer;
    indexes: { 'by-name': string; 'by-phone': string };
  };
  services: {
    key: string;
    value: ServiceItem;
    indexes: { 'by-category': string };
  };
  users: {
    key: string;
    value: UserAccount;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'laundry_pwa_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LaundryDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<LaundryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Orders
        if (!db.objectStoreNames.contains('orders')) {
          const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
          orderStore.createIndex('by-date', 'createdAt');
          orderStore.createIndex('by-customer', 'customerId');
          orderStore.createIndex('by-status', 'progressStatus');
        }

        // Customers
        if (!db.objectStoreNames.contains('customers')) {
          const custStore = db.createObjectStore('customers', { keyPath: 'id' });
          custStore.createIndex('by-name', 'name');
          custStore.createIndex('by-phone', 'phone');
        }

        // Services
        if (!db.objectStoreNames.contains('services')) {
          const srvStore = db.createObjectStore('services', { keyPath: 'id' });
          srvStore.createIndex('by-category', 'category');
        }

        // Users
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // Sync Queue
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }

        // Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// Initialize seed data if empty (only on the very first time ever)
export async function initDatabaseDefaults() {
  const db = await getDB();
  if (!db) return;

  // One-time cleanup: wipe dummy orders and customers from existing browsers
  const isDummyCleaned = await db.get('settings', 'dummy_cleared_v1');
  if (!isDummyCleaned) {
    const tx = db.transaction(['orders', 'customers', 'settings'], 'readwrite');
    await tx.objectStore('orders').clear();
    await tx.objectStore('customers').clear();
    await tx.objectStore('settings').put(true, 'dummy_cleared_v1');
    await tx.objectStore('settings').put(true, 'database_initialized');
    await tx.done;
  }

  const isInitialized = await db.get('settings', 'database_initialized');
  if (!isInitialized) {
    const servicesCount = await db.count('services');
    const usersCount = await db.count('users');

    // If existing database already has services or users, mark as initialized without re-seeding
    if (servicesCount > 0 || usersCount > 0) {
      await db.put('settings', true, 'database_initialized');
    } else {
      // First-time fresh install: load initial services and single user
      const txServices = db.transaction('services', 'readwrite');
      for (const item of INITIAL_SERVICES) {
        await txServices.store.put(item);
      }
      await txServices.done;

      const txUsers = db.transaction('users', 'readwrite');
      for (const item of INITIAL_USERS) {
        await txUsers.store.put(item);
      }
      await txUsers.done;

      await db.put('settings', true, 'database_initialized');
    }
  }

  // Ensure current user is synced to single user Mama Sela
  const currentUsers = await db.getAll('users');
  if (
    currentUsers.length === 0 ||
    currentUsers.some((u) => u.name === 'Budi Santoso' || u.name === 'Siti Rahma')
  ) {
    const tx = db.transaction('users', 'readwrite');
    await tx.store.clear();
    for (const item of INITIAL_USERS) {
      await tx.store.put(item);
    }
    await tx.done;
  }
}

// Helper CRUD operations
export async function getAllOrders(): Promise<Order[]> {
  const db = await getDB();
  if (!db) return [];
  const orders = await db.getAll('orders');
  for (const o of orders) {
    if (!o.createdAt || o.createdAt === 'Invalid Date') {
      o.createdAt = new Date().toISOString();
      await db.put('orders', o);
    }
  }
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveOrder(order: Order): Promise<void> {
  const db = await getDB();
  if (!db) return;
  if (!order.createdAt || order.createdAt === 'Invalid Date') {
    order.createdAt = new Date().toISOString();
  }
  await db.put('orders', order);
  // add to sync queue
  await queueSync('orders', 'update', order);
}

export async function deleteOrder(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('orders', id);
  await queueSync('orders', 'delete', { id });
}

export async function getAllCustomers(): Promise<Customer[]> {
  const db = await getDB();
  if (!db) return [];
  const list = await db.getAll('customers');
  for (const c of list) {
    if (!c.createdAt || c.createdAt === 'Invalid Date') {
      c.createdAt = new Date().toISOString();
      await db.put('customers', c);
    }
  }
  return list;
}

export async function saveCustomer(customer: Customer): Promise<void> {
  const db = await getDB();
  if (!db) return;
  if (!customer.createdAt || customer.createdAt === 'Invalid Date') {
    customer.createdAt = new Date().toISOString();
  }
  await db.put('customers', customer);
  await queueSync('customers', 'update', customer);
}

export async function deleteCustomer(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('customers', id);
  await queueSync('customers', 'delete', { id });
}

export async function getAllServices(): Promise<ServiceItem[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('services');
}

export async function saveService(service: ServiceItem): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('services', service);
  await queueSync('services', 'update', service);
}

export async function deleteService(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('services', id);
  await queueSync('services', 'delete', { id });
}

export async function getAllUsers(): Promise<UserAccount[]> {
  const db = await getDB();
  if (!db) return INITIAL_USERS;
  return await db.getAll('users');
}

export async function saveUser(user: UserAccount): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('users', user);
}

// Queue for Google Sheets Sync
export async function queueSync(entity: SyncQueueItem['entity'], action: SyncQueueItem['action'], data: any) {
  const db = await getDB();
  if (!db) return;
  const item: SyncQueueItem = {
    id: `${entity}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    entity,
    action,
    data,
    timestamp: new Date().toISOString(),
  };
  await db.put('syncQueue', item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  if (!db) return [];
  return await db.getAll('syncQueue');
}

export async function clearSyncQueue(ids: string[]): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const tx = db.transaction('syncQueue', 'readwrite');
  for (const id of ids) {
    await tx.store.delete(id);
  }
  await tx.done;
}

export const DEFAULT_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzX_noq0WTTrRXVfSj2rbPS3XGm4CRaPmvx53mDzEJyoVUwqkj5R5DzzbgcKc445N_7/exec';

export async function getSheetsConfig(): Promise<SheetsConfig> {
  const db = await getDB();
  if (!db) {
    return { scriptUrl: DEFAULT_SCRIPT_URL, autoSync: true };
  }
  const config = await db.get('settings', 'sheetsConfig');
  if (!config || !config.scriptUrl || !config.scriptUrl.trim()) {
    return { scriptUrl: DEFAULT_SCRIPT_URL, autoSync: true };
  }
  return config;
}

export async function saveSheetsConfig(config: SheetsConfig): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('settings', config, 'sheetsConfig');
}
