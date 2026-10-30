import { Customer, Order, ServiceItem, SpeedItem, UserAccount } from '@/types';
import { calculateProfitMargin } from './utils';

export const INITIAL_SPEEDS: SpeedItem[] = [
  {
    id: 'SPD-01',
    name: 'Normal',
    durationLabel: '2 Hari',
    durationHours: 48,
    fee: 0,
  },
  {
    id: 'SPD-02',
    name: 'Express',
    durationLabel: '1 Hari',
    durationHours: 24,
    fee: 8000,
  },
  {
    id: 'SPD-03',
    name: 'Kilat',
    durationLabel: '8 Jam',
    durationHours: 8,
    fee: 13000,
  },
];

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'SRV-01',
    name: 'Cuci setrika',
    category: 'Kiloan',
    unit: 'kg',
    price: 6000,
    hpp: 2500,
    profitMarginPercent: calculateProfitMargin(6000, 2500),
  },
  {
    id: 'SRV-02',
    name: 'Setrika',
    category: 'Kiloan',
    unit: 'kg',
    price: 5000,
    hpp: 1500,
    profitMarginPercent: calculateProfitMargin(5000, 1500),
  },
  {
    id: 'SRV-03',
    name: 'Cuci lipat',
    category: 'Kiloan',
    unit: 'kg',
    price: 5000,
    hpp: 2000,
    profitMarginPercent: calculateProfitMargin(5000, 2000),
  },
  // Bedcover Satuan
  {
    id: 'SRV-04',
    name: 'Bedcover',
    variant: 'S',
    category: 'Satuan',
    unit: 'pcs',
    price: 10000,
    hpp: 3500,
    profitMarginPercent: calculateProfitMargin(10000, 3500),
  },
  {
    id: 'SRV-05',
    name: 'Bedcover',
    variant: 'M',
    category: 'Satuan',
    unit: 'pcs',
    price: 15000,
    hpp: 5500,
    profitMarginPercent: calculateProfitMargin(15000, 5500),
  },
  {
    id: 'SRV-06',
    name: 'Bedcover',
    variant: 'L',
    category: 'Satuan',
    unit: 'pcs',
    price: 25000,
    hpp: 9000,
    profitMarginPercent: calculateProfitMargin(25000, 9000),
  },
  // Selimut Satuan
  {
    id: 'SRV-07',
    name: 'Selimut',
    variant: 'S',
    category: 'Satuan',
    unit: 'pcs',
    price: 10000,
    hpp: 3000,
    profitMarginPercent: calculateProfitMargin(10000, 3000),
  },
  {
    id: 'SRV-08',
    name: 'Selimut',
    variant: 'M',
    category: 'Satuan',
    unit: 'pcs',
    price: 15000,
    hpp: 5000,
    profitMarginPercent: calculateProfitMargin(15000, 5000),
  },
  {
    id: 'SRV-09',
    name: 'Selimut',
    variant: 'L',
    category: 'Satuan',
    unit: 'pcs',
    price: 25000,
    hpp: 8000,
    profitMarginPercent: calculateProfitMargin(25000, 8000),
  },
];

// Empty for production use
export const INITIAL_CUSTOMERS: Customer[] = [];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-01',
    name: 'Mama Sela',
    username: 'mamasela',
    role: 'Admin',
    isActive: true,
  },
];

// Empty for production use
export const INITIAL_ORDERS: Order[] = [];
