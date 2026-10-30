import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Customer, Order, ServiceItem, SpeedItem, UserAccount, SheetsConfig, SyncQueueItem } from '@/types';
import { INITIAL_CUSTOMERS, INITIAL_ORDERS, INITIAL_SERVICES, INITIAL_SPEEDS, INITIAL_USERS } from './initialData';
import { normalizeSpeedTariffs } from './utils';

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
  speeds: {
    key: string;
    value: SpeedItem;
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
const DB_VERSION = 2;

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

        // Speeds (Tabel Kecepatan)
        if (!db.objectStoreNames.contains('speeds')) {
          db.createObjectStore('speeds', { keyPath: 'id' });
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

  // Second cleanup: reset orders and customers as requested by user
  const isResetV2 = await db.get('settings', 'reset_orders_customers_v2');
  if (!isResetV2) {
    const tx = db.transaction(['orders', 'customers', 'syncQueue', 'settings'], 'readwrite');
    await tx.objectStore('orders').clear();
    await tx.objectStore('customers').clear();
    await tx.objectStore('syncQueue').clear();
    await tx.objectStore('settings').put(true, 'reset_orders_customers_v2');
    await tx.done;
  }

  // Third cleanup: clear orders and customers for new format ORD-001-dd-mm-yyyy
  const isResetV3 = await db.get('settings', 'reset_orders_customers_v3');
  if (!isResetV3) {
    const tx = db.transaction(['orders', 'customers', 'syncQueue', 'settings'], 'readwrite');
    await tx.objectStore('orders').clear();
    await tx.objectStore('customers').clear();
    await tx.objectStore('syncQueue').clear();
    await tx.objectStore('settings').put(true, 'reset_orders_customers_v3');
    await tx.done;
  }

  // Fourth cleanup: force complete wipe of orders, customers and syncQueue
  const isResetV4 = await db.get('settings', 'reset_orders_customers_v4');
  if (!isResetV4) {
    const tx = db.transaction(['orders', 'customers', 'syncQueue', 'settings'], 'readwrite');
    await tx.objectStore('orders').clear();
    await tx.objectStore('customers').clear();
    await tx.objectStore('syncQueue').clear();
    await tx.objectStore('settings').put(true, 'reset_orders_customers_v4');
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

  // Fifth migration: restore missing default Kiloan & Satuan services and rescue any collided custom services
  const isServicesRestoredV5 = await db.get('settings', 'restore_services_v5');
  if (!isServicesRestoredV5) {
    const existingServices = await db.getAll('services');
    const deletedIds: string[] = (await db.get('settings', 'deleted_service_ids')) || [];

    // Find max numeric ID across INITIAL_SERVICES and existingServices
    let maxNum = INITIAL_SERVICES.length;
    for (const s of existingServices) {
      const m = s.id.match(/^SRV-(\d+)/i);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    }

    const txS = db.transaction('services', 'readwrite');

    // If any custom service accidentally got an ID in SRV-01..SRV-09 (due to previous length+1 bug),
    // move that custom service to a new SRV-XX ID so neither custom nor default service is lost
    for (const existing of existingServices) {
      const defaultMatch = INITIAL_SERVICES.find((d) => d.id === existing.id);
      if (
        defaultMatch &&
        (existing.name.toLowerCase().trim() !== defaultMatch.name.toLowerCase().trim() ||
          existing.category !== defaultMatch.category)
      ) {
        maxNum += 1;
        const rescuedService: ServiceItem = {
          ...existing,
          id: `SRV-${String(maxNum).padStart(2, '0')}`,
        };
        await txS.store.put(rescuedService);
      }
    }

    // Ensure all INITIAL_SERVICES (Kiloan & Satuan) exist unless explicitly deleted
    for (const defItem of INITIAL_SERVICES) {
      if (!deletedIds.includes(defItem.id)) {
        const current = await txS.store.get(defItem.id);
        if (
          !current ||
          current.name.toLowerCase().trim() !== defItem.name.toLowerCase().trim() ||
          current.category !== defItem.category
        ) {
          await txS.store.put(defItem);
        }
      }
    }
    await txS.done;
    await db.put('settings', true, 'restore_services_v5');
  }

  // Safety check: if services store is ever completely empty (or missing an entire category when not deleted), re-seed defaults
  const currentServices = await db.getAll('services');
  const deletedServiceIds: string[] = (await db.get('settings', 'deleted_service_ids')) || [];
  if (currentServices.length === 0) {
    const txS = db.transaction('services', 'readwrite');
    for (const item of INITIAL_SERVICES) {
      if (!deletedServiceIds.includes(item.id)) {
        await txS.store.put(item);
      }
    }
    await txS.done;
  }

  // Initialize / restore Speeds table (Tabel Kecepatan) and link existing Orders
  const currentSpeeds = await db.getAll('speeds');
  const deletedSpeedIds: string[] = (await db.get('settings', 'deleted_speed_ids')) || [];
  const isSpeedsSeededV2 = await db.get('settings', 'speeds_seeded_v2');
  if (!isSpeedsSeededV2 || currentSpeeds.length === 0) {
    const txSpd = db.transaction('speeds', 'readwrite');
    for (const spd of INITIAL_SPEEDS) {
      if (!deletedSpeedIds.includes(spd.id)) {
        const existingSpd = await txSpd.store.get(spd.id);
        if (!existingSpd) {
          await txSpd.store.put(spd);
        } else {
          await txSpd.store.put(normalizeSpeedTariffs(existingSpd));
        }
      }
    }
    await txSpd.done;
    await db.put('settings', true, 'speeds_seeded_v2');
  }

  // Backfill speedId relation on existing orders so all orders link to speeds table
  const allSpeedsNow = await db.getAll('speeds');
  const existingOrders = await db.getAll('orders');
  let ordersNeedUpdate = false;
  for (const ord of existingOrders) {
    const matchedSpd =
      (ord.speedId && allSpeedsNow.find((s) => s.id === ord.speedId)) ||
      allSpeedsNow.find((s) => s.name.trim().toLowerCase() === String(ord.speed || 'Normal').trim().toLowerCase());
    if (matchedSpd && (ord.speedId !== matchedSpd.id || ord.speedDuration !== matchedSpd.durationLabel)) {
      ord.speedId = matchedSpd.id;
      ord.speed = matchedSpd.name;
      ord.speedDuration = matchedSpd.durationLabel;
      ordersNeedUpdate = true;
    }
  }
  if (ordersNeedUpdate) {
    const txOrd = db.transaction('orders', 'readwrite');
    for (const ord of existingOrders) {
      await txOrd.store.put(ord);
    }
    await txOrd.done;
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

export async function getDeletedServiceIds(): Promise<string[]> {
  const db = await getDB();
  if (!db) return [];
  return (await db.get('settings', 'deleted_service_ids')) || [];
}

export async function getDeletedSpeedIds(): Promise<string[]> {
  const db = await getDB();
  if (!db) return [];
  return (await db.get('settings', 'deleted_speed_ids')) || [];
}

// Helper CRUD operations
export async function getAllOrders(): Promise<Order[]> {
  const db = await getDB();
  if (!db) return [];
  const [orders, speeds] = await Promise.all([db.getAll('orders'), db.getAll('speeds')]);
  const speedsList = speeds.length > 0 ? speeds : INITIAL_SPEEDS;
  for (const o of orders) {
    if (!o.createdAt || o.createdAt === 'Invalid Date') {
      o.createdAt = new Date().toISOString();
      await db.put('orders', o);
    }
    if (!Array.isArray(o.items)) {
      if (typeof o.items === 'string') {
        try {
          o.items = JSON.parse(o.items);
        } catch {
          o.items = [];
        }
      } else {
        o.items = [];
      }
    }
    // Resolve relation to speeds table
    const relatedSpeed =
      (o.speedId && speedsList.find((s) => s.id === o.speedId)) ||
      speedsList.find((s) => s.name.trim().toLowerCase() === String(o.speed || 'Normal').trim().toLowerCase());
    if (relatedSpeed) {
      o.speedId = relatedSpeed.id;
      o.speed = relatedSpeed.name;
      o.speedDuration = relatedSpeed.durationLabel;
      if (o.speedFee === undefined || o.speedFee === null) {
        o.speedFee = relatedSpeed.fee;
      }
    }
  }
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveOrder(order: Order, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  if (!order.createdAt || order.createdAt === 'Invalid Date') {
    order.createdAt = new Date().toISOString();
  }
  if (!Array.isArray(order.items)) {
    order.items = [];
  }
  await db.put('orders', order);
  if (!skipQueue) {
    await queueSync('orders', 'update', order);
  }
}

export async function deleteOrder(id: string, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('orders', id);
  if (!skipQueue) {
    await queueSync('orders', 'delete', { id });
  }
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

export async function saveCustomer(customer: Customer, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  if (!customer.createdAt || customer.createdAt === 'Invalid Date') {
    customer.createdAt = new Date().toISOString();
  }
  await db.put('customers', customer);
  if (!skipQueue) {
    await queueSync('customers', 'update', customer);
  }
}

export async function deleteCustomer(id: string, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('customers', id);
  if (!skipQueue) {
    await queueSync('customers', 'delete', { id });
  }
}

export async function getAllServices(): Promise<ServiceItem[]> {
  const db = await getDB();
  if (!db) return INITIAL_SERVICES;
  const list = await db.getAll('services');
  return list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export async function saveService(service: ServiceItem, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put('services', service);
  const deletedIds: string[] = (await db.get('settings', 'deleted_service_ids')) || [];
  if (deletedIds.includes(service.id)) {
    await db.put(
      'settings',
      deletedIds.filter((id) => id !== service.id),
      'deleted_service_ids'
    );
  }
  if (!skipQueue) {
    await queueSync('services', 'update', service);
  }
}

export async function deleteService(id: string, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('services', id);
  const deletedIds: string[] = (await db.get('settings', 'deleted_service_ids')) || [];
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    await db.put('settings', deletedIds, 'deleted_service_ids');
  }
  if (!skipQueue) {
    await queueSync('services', 'delete', { id });
  }
}

export async function getAllSpeeds(): Promise<SpeedItem[]> {
  const db = await getDB();
  if (!db) return INITIAL_SPEEDS;
  const list = await db.getAll('speeds');
  if (list.length === 0) return INITIAL_SPEEDS;
  return list
    .map(normalizeSpeedTariffs)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

export async function saveSpeed(speed: SpeedItem, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const normalized = normalizeSpeedTariffs(speed);
  await db.put('speeds', normalized);
  const deletedIds: string[] = (await db.get('settings', 'deleted_speed_ids')) || [];
  if (deletedIds.includes(speed.id)) {
    await db.put(
      'settings',
      deletedIds.filter((id) => id !== speed.id),
      'deleted_speed_ids'
    );
  }
  // Keep related orders synchronized with this speed's latest name and durationLabel
  const allOrders = await db.getAll('orders');
  const relatedOrders = allOrders.filter(
    (o) =>
      o.speedId === speed.id ||
      (!o.speedId && String(o.speed || '').trim().toLowerCase() === speed.name.trim().toLowerCase())
  );
  if (relatedOrders.length > 0) {
    const txO = db.transaction('orders', 'readwrite');
    for (const o of relatedOrders) {
      o.speedId = speed.id;
      o.speed = speed.name;
      o.speedDuration = speed.durationLabel;
      await txO.store.put(o);
    }
    await txO.done;
  }
  if (!skipQueue) {
    await queueSync('speeds', 'update', speed);
  }
}

export async function deleteSpeed(id: string, skipQueue = false): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete('speeds', id);
  const deletedIds: string[] = (await db.get('settings', 'deleted_speed_ids')) || [];
  if (!deletedIds.includes(id)) {
    deletedIds.push(id);
    await db.put('settings', deletedIds, 'deleted_speed_ids');
  }
  if (!skipQueue) {
    await queueSync('speeds', 'delete', { id });
  }
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
