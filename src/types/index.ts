export interface Customer {
  id: string; // e.g. CUST-001
  name: string;
  phone: string;
  address: string;
  createdAt: string; // ISO date
}

export type ServiceCategory = 'Kiloan' | 'Satuan';
export type UnitType = 'kg' | 'pcs';
export type VariantSize = 'S' | 'M' | 'L';

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  variant?: VariantSize;
  unit: UnitType;
  price: number; // Harga Jual
  hpp: number;   // Harga Pokok Penjualan
  profitMarginPercent: number; // ((price - hpp) / price) * 100
}

export type SpeedType = 'Normal' | 'Express' | 'Kilat';

export interface OrderItemDetail {
  id: string;
  serviceId: string;
  name: string;
  variant?: VariantSize;
  unit: UnitType;
  qty: number;
  price: number;
  total: number;
}

export type PaymentStatus = 'Belum Bayar' | 'Lunas';
export type PaymentMethod = 'Cash' | 'QRIS';
export type OrderProgressStatus = 'Proses' | 'Packing' | 'Selesai';

export interface Order {
  id: string; // e.g. ORD-20261016-001
  customerId: string;
  customerName: string;
  customerPhone: string;
  createdAt: string; // Tanggal Masuk
  completedAt?: string; // Tanggal Selesai Aktual
  estimatedCompletion: string; // Tanggal Estimasi Selesai
  mainService: string; // e.g. "Cuci setrika", "Setrika", "Cuci lipat", or "Hanya Satuan"
  speed: SpeedType;
  speedFee: number; // Normal: 0, Express: 8000, Kilat: 13000
  actualWeight: number; // Berat timbangan real
  billedWeight: number; // Min 3 kg rule
  items: OrderItemDetail[]; // Bedcover, Selimut, dll.
  mainServiceTotal: number;
  itemsTotal: number;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  progressStatus: OrderProgressStatus;
  notes?: string;
  cashierName: string;
  syncedToSheets?: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: 'Admin' | 'Kasir';
  isActive: boolean;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  cashierName: string;
}

export interface SheetsConfig {
  scriptUrl: string;
  sheetId?: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface SyncQueueItem {
  id: string;
  entity: 'orders' | 'customers' | 'services' | 'payments';
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}
