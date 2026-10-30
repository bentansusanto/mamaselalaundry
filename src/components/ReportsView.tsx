'use client';

import React, { useState } from 'react';
import { Order, SpeedItem } from '@/types';
import { INITIAL_SPEEDS } from '@/lib/initialData';
import { formatRupiah, formatDate, parseSafeDate, resolveOrderSpeed } from '@/lib/utils';
import { BarChart3, Download, TrendingUp, DollarSign, CreditCard, Scale, CheckCircle, Banknote, QrCode } from 'lucide-react';

interface ReportsViewProps {
  orders: Order[];
  speeds?: SpeedItem[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ orders, speeds = INITIAL_SPEEDS }) => {
  const [filterPeriod, setFilterPeriod] = useState<'Month' | 'Quarter' | 'Years'>('Month');
  const speedList = speeds && speeds.length > 0 ? speeds : INITIAL_SPEEDS;

  // Filter orders based on period
  const filteredOrders = React.useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return (orders || []).filter((o) => {
      if (!o) return false;
      const orderDate = parseSafeDate(o.createdAt);
      if (!orderDate) return false;
      if (filterPeriod === 'Month') {
        return (
          orderDate.getMonth() === currentMonth &&
          orderDate.getFullYear() === currentYear
        );
      }
      if (filterPeriod === 'Quarter') {
        const orderQ = Math.floor(orderDate.getMonth() / 3);
        const currentQ = Math.floor(currentMonth / 3);
        return orderQ === currentQ && orderDate.getFullYear() === currentYear;
      }
      // Years
      return orderDate.getFullYear() === currentYear;
    });
  }, [orders, filterPeriod]);

  // Calculations
  const grossRevenue = filteredOrders.reduce((acc, o) => acc + (o.paymentStatus === 'Lunas' ? o.totalPrice : 0), 0);
  const totalKg = filteredOrders.reduce((acc, o) => acc + o.billedWeight, 0);
  const totalOrders = filteredOrders.length;
  const aov = totalOrders > 0 ? Math.round(grossRevenue / totalOrders) : 0;

  // Rough estimation of net profit based on ~45% average HPP margin
  const estimatedHpp = Math.round(grossRevenue * 0.42);
  const netProfit = grossRevenue - estimatedHpp;

  // Payment Breakdown
  const cashTotal = filteredOrders
    .filter((o) => o.paymentMethod === 'Cash' && o.paymentStatus === 'Lunas')
    .reduce((acc, o) => acc + o.totalPrice, 0);

  const qrisTotal = filteredOrders
    .filter((o) => o.paymentMethod === 'QRIS' && o.paymentStatus === 'Lunas')
    .reduce((acc, o) => acc + o.totalPrice, 0);

  // Speed Breakdown
  const normalCount = filteredOrders.filter((o) => o.speed === 'Normal').length;
  const expressCount = filteredOrders.filter((o) => o.speed === 'Express').length;
  const kilatCount = filteredOrders.filter((o) => o.speed === 'Kilat').length;

  const handleExportCSV = () => {
    const headers = [
      'ID Order',
      'Pelanggan',
      'No HP',
      'Tanggal',
      'Layanan',
      'Kecepatan',
      'Berat (Kg)',
      'Total (Rp)',
      'Metode Bayar',
      'Status Bayar',
      'Status Order',
    ];

    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.customerName}"`,
      o.customerPhone,
      o.createdAt,
      `"${o.mainService}"`,
      o.speed,
      o.billedWeight,
      o.totalPrice,
      o.paymentMethod,
      o.paymentStatus,
      o.progressStatus,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-laundry-${filterPeriod.toLowerCase()}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      {/* Filter Tabs & Export */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
          {(['Month', 'Quarter', 'Years'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setFilterPeriod(p)}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterPeriod === p
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p === 'Month' ? 'Bulan Ini' : p === 'Quarter' ? 'Kuartal' : 'Tahun Ini'}
            </button>
          ))}
        </div>

        <button
          onClick={handleExportCSV}
          title="Download CSV"
          className="p-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition active:scale-95 flex items-center gap-1 text-xs font-semibold"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">CSV</span>
        </button>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Omset</span>
          <p className="text-base font-extrabold text-blue-600 mt-1">{formatRupiah(grossRevenue)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{totalOrders} Transaksi</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Estimasi Profit</span>
          <p className="text-base font-extrabold text-green-600 mt-1">{formatRupiah(netProfit)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Est. HPP ~{formatRupiah(estimatedHpp)}</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Total Berat Laundry</span>
          <p className="text-base font-extrabold text-slate-800 mt-1">{totalKg.toFixed(1)} Kg</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Termasuk aturan min 3kg</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium">Rata-rata Order (AOV)</span>
          <p className="text-base font-extrabold text-slate-800 mt-1">{formatRupiah(aov)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Per transaksi</p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
          Komposisi Metode Pembayaran
        </h3>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-blue-600" />
                Tunai (Cash)
              </span>
              <span>{formatRupiah(cashTotal)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{
                  width: `${grossRevenue > 0 ? (cashTotal / grossRevenue) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-600 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-green-600" />
                QRIS Digital
              </span>
              <span>{formatRupiah(qrisTotal)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
              <div
                className="bg-green-500 h-full rounded-full"
                style={{
                  width: `${grossRevenue > 0 ? (qrisTotal / grossRevenue) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Speed Choice Breakdown (Dinamis dari Tabel Kecepatan) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
        <h3 className="font-bold text-xs text-slate-900">Breakdown Pilihan Kecepatan</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {speedList.map((spd) => {
            const count = filteredOrders.filter((o) => {
              const resolved = resolveOrderSpeed(o, speedList);
              return resolved.id === spd.id || resolved.name.toLowerCase() === spd.name.toLowerCase();
            }).length;
            const lower = spd.name.toLowerCase();
            const isExp = lower.includes('express');
            const isKil = lower.includes('kilat');
            const cardStyle = isKil
              ? 'bg-green-50 border-green-200 text-green-800'
              : isExp
              ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
              : 'bg-slate-50 border-slate-200 text-slate-800';

            return (
              <div key={spd.id} className={`p-2 rounded-xl border ${cardStyle}`}>
                <span className="text-[10px] opacity-80 block font-semibold">{spd.name}</span>
                <span className="text-[9px] opacity-65 block">{spd.durationLabel}</span>
                <p className="font-extrabold text-sm mt-0.5">{count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
