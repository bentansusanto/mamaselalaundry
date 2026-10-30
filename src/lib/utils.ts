import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Order, ServiceItem, SpeedItem, SpeedType } from '@/types';

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

export function formatWeight(weight: number): string {
  if (weight === undefined || weight === null || isNaN(weight)) return '0';
  return String(weight).replace('.', ',');
}

export function parseSafeDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Try native parse first
  const nativeDate = new Date(trimmed);
  if (!isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  // Handle DD/MM/YYYY or D/M/YYYY with optional time like "16/10/2026, 17.15.00"
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2})[.:](\d{1,2})(?:[.:](\d{1,2}))?)?/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
    const min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const parsed = new Date(year, month, day, hour, min, sec);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString || dateString === 'Invalid Date' || dateString === 'null' || dateString === 'undefined') return '-';
  const date = parseSafeDate(dateString);
  if (!date) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '-';
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString || dateString === 'Invalid Date' || dateString === 'null' || dateString === 'undefined') return '-';
  const date = parseSafeDate(dateString);
  if (!date) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '-';
  }
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

export const SPEED_FEES: Record<string, number> = {
  Normal: 0,
  Express: 10000,
  Kilat: 15000,
};

export const SPEED_SECONDARY_FEES: Record<string, number> = {
  Normal: 0,
  Express: 6000,
  Kilat: 9000,
};

/**
 * Normalizes a SpeedItem so legacy seeded fees (8000 / 13000) and missing feeSecondary
 * are automatically upgraded to:
 * - Express: Cuci Setrika = Rp 10.000/kg, Setrika & Cuci Lipat = Rp 6.000/kg
 * - Kilat:   Cuci Setrika = Rp 15.000/kg, Setrika & Cuci Lipat = Rp 9.000/kg
 */
export function normalizeSpeedTariffs(sp: SpeedItem): SpeedItem {
  const lower = String(sp.name || '').trim().toLowerCase();
  const isNormal = lower === 'normal' || sp.id === 'SPD-01';
  const isExpress = lower.includes('express') || sp.id === 'SPD-02';
  const isKilat = lower.includes('kilat') || sp.id === 'SPD-03';

  if (isNormal) {
    return {
      ...sp,
      fee: 0,
      feeSecondary: 0,
    };
  }

  let fee = Number(sp.fee) || 0;
  let feeSecondary = sp.feeSecondary !== undefined && sp.feeSecondary !== null ? Number(sp.feeSecondary) : undefined;

  if (isExpress) {
    if (fee <= 0 || fee === 8000) fee = 10000;
    if (!feeSecondary || feeSecondary <= 0) feeSecondary = 6000;
  } else if (isKilat) {
    if (fee <= 0 || fee === 13000) fee = 15000;
    if (!feeSecondary || feeSecondary <= 0) feeSecondary = 9000;
  } else if (fee > 0 && (feeSecondary === undefined || feeSecondary <= 0)) {
    feeSecondary = fee;
  }

  return {
    ...sp,
    fee,
    feeSecondary: feeSecondary ?? 0,
  };
}

/**
 * Mengecek apakah layanan kiloan adalah kategori "Setrika" (saja) atau "Cuci Lipat"
 * (bukan "Cuci Setrika").
 */
export function isSetrikaOrCuciLipatService(serviceName?: string): boolean {
  const lower = String(serviceName || '').trim().toLowerCase();
  if (!lower) return false;
  const isCuciSetrika = lower.includes('cuci') && lower.includes('setrika');
  if (isCuciSetrika) return false;
  return lower.includes('setrika') || lower.includes('lipat');
}

/**
 * Menghitung harga per kg layanan kiloan berdasarkan layanan & kecepatan yang dipilih:
 * - Normal: mengikuti harga layanan kiloan (misal Cuci Setrika Rp 6.000/7.000, Setrika Rp 5.000, Cuci Lipat Rp 5.000)
 * - Express:
 *   - Cuci Setrika: Rp 10.000/kg
 *   - Setrika & Cuci Lipat: Rp 6.000/kg
 * - Kilat:
 *   - Cuci Setrika: Rp 15.000/kg
 *   - Setrika & Cuci Lipat: Rp 9.000/kg
 */
export function getKiloanPricePerKg(
  service: Pick<ServiceItem, 'name' | 'price'> | null | undefined,
  speed: SpeedItem | null | undefined
): number {
  if (!service) return 0;
  if (!speed) return service.price;

  const normSpd = normalizeSpeedTariffs(speed);
  const lowerSpd = normSpd.name.trim().toLowerCase();

  if (lowerSpd === 'normal' || (normSpd.fee <= 0 && (!normSpd.feeSecondary || normSpd.feeSecondary <= 0))) {
    return service.price;
  }

  if (isSetrikaOrCuciLipatService(service.name)) {
    return normSpd.feeSecondary && normSpd.feeSecondary > 0 ? normSpd.feeSecondary : normSpd.fee;
  }

  return normSpd.fee > 0 ? normSpd.fee : service.price;
}

/**
 * Resolves the SpeedItem related to an Order (via foreign key speedId or matching speed name).
 */
export function resolveOrderSpeed(
  order: Pick<Order, 'speedId' | 'speed' | 'speedFee' | 'speedDuration'>,
  speeds: SpeedItem[] = []
): SpeedItem {
  if (order.speedId) {
    const byId = speeds.find((s) => s.id === order.speedId);
    if (byId) {
      const norm = normalizeSpeedTariffs(byId);
      return {
        ...norm,
        fee: norm.fee > 0 ? norm.fee : (order.speedFee || 0),
      };
    }
  }
  const orderSpeedName = String(order.speed || 'Normal').trim().toLowerCase();
  const byName = speeds.find((s) => s.name.trim().toLowerCase() === orderSpeedName);
  if (byName) {
    const norm = normalizeSpeedTariffs(byName);
    return {
      ...norm,
      fee: norm.fee > 0 ? norm.fee : (order.speedFee || 0),
    };
  }
  const fallbackDuration =
    order.speedDuration ||
    (orderSpeedName === 'kilat' ? '8 Jam' : orderSpeedName === 'express' ? '1 Hari' : '2 Hari');
  const fallbackHours =
    orderSpeedName === 'kilat' ? 8 : orderSpeedName === 'express' ? 24 : 48;
  return normalizeSpeedTariffs({
    id: order.speedId || 'SPD-01',
    name: order.speed || 'Normal',
    durationLabel: fallbackDuration,
    durationHours: fallbackHours,
    fee: order.speedFee && order.speedFee > 0 ? order.speedFee : (SPEED_FEES[order.speed] || 0),
    feeSecondary: SPEED_SECONDARY_FEES[order.speed] || 0,
  });
}

export function calculateProfitMargin(price: number, hpp: number): number {
  if (price <= 0) return 0;
  const margin = ((price - hpp) / price) * 100;
  return Math.round(margin * 10) / 10;
}

/**
 * Aturan Pembulatan Total Bayar:
 * - Jika total bayar memiliki pecahan rupiah (mod 1000) >= 50 (contoh: Rp 45.100, Rp 45.600, Rp 45.050),
 *   maka dibulatkan ke atas menjadi ribuan berikutnya (contoh: 46.000).
 * - Jika kurang dari 45.050 / pecahan < 50 (contoh: Rp 45.000, Rp 45.040, dll),
 *   maka dibulatkan ke bawah (contoh: 45.000).
 */
export function roundPaymentTotal(amount: number): number {
  if (amount <= 0) return 0;
  const roundedAmount = Math.round(amount);
  const remainder = roundedAmount % 1000;
  if (remainder >= 50) {
    return roundedAmount - remainder + 1000;
  }
  return roundedAmount - remainder;
}

