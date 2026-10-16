import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SpeedType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Ketentuan Minimum Berat:
 * Minimum berat adalah 3 kg.
 * Jika berat < 2 kg (atau kurang dari ketentuan minimum 3 kg),
 * sistem tetap menghitung beban setara 3 kg.
 */
export function calculateBilledWeight(actualWeight: number): number {
  if (actualWeight <= 0) return 0;
  if (actualWeight < 3) return 3;
  return actualWeight;
}

export const SPEED_FEES: Record<SpeedType, number> = {
  Normal: 0,
  Express: 8000,
  Kilat: 13000,
};

export function calculateProfitMargin(price: number, hpp: number): number {
  if (price <= 0) return 0;
  const margin = ((price - hpp) / price) * 100;
  return Math.round(margin * 10) / 10;
}
