'use client';

import React, { useState } from 'react';
import { Customer, Order, ServiceItem } from '@/types';
import { formatRupiah, formatDateTime, parseSafeDate } from '@/lib/utils';
import { TrendingUp, Users, ShoppingBag, ArrowUpRight, Clock, Star, Plus, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface DashboardViewProps {
  orders: Order[];
  customers: Customer[];
  services: ServiceItem[];
  onGoToPos: () => void;
  onGoToOrders?: () => void;
  onViewReceipt: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  customers,
  services,
  onGoToPos,
  onGoToOrders,
  onViewReceipt,
}) => {
  const [chartPeriod, setChartPeriod] = useState<'Month' | 'Quarter' | 'Years'>('Month');

  // Stats calculation
  const totalRevenue = (orders || []).reduce(
    (sum, o) => sum + (o.paymentStatus === 'Lunas' ? (o.totalPrice || 0) : 0),
    0
  );
  const unpaidOrders = (orders || []).filter((o) => o.paymentStatus === 'Belum Bayar');
  const totalUnpaid = unpaidOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const activeOrders = (orders || []).filter((o) => o.progressStatus !== 'Selesai');
  const totalOrdersCount = (orders || []).length;

  // Chart Data preparation based on Period (100% Real Data)
  const chartData = React.useMemo(() => {
    if (chartPeriod === 'Month') {
      // Days of the month (recent 7 days)
      const daysMap: Record<string, number> = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
        daysMap[dayLabel] = 0;
      }

      (orders || []).forEach((o) => {
        const d = parseSafeDate(o.createdAt);
        if (d) {
          const dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
          if (daysMap[dayLabel] !== undefined) {
            daysMap[dayLabel] += o.totalPrice || 0;
          }
        }
      });

      return Object.entries(daysMap).map(([name, total]) => ({ name, total }));
    }

    if (chartPeriod === 'Quarter') {
      // Months of current Quarter
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startMonth = currentQuarter * 3;
      const quarterMap: Record<string, number> = {};

      for (let i = 0; i < 3; i++) {
        const d = new Date(currentYear, startMonth + i, 1);
        const mLabel = d.toLocaleString('id-ID', { month: 'short' });
        quarterMap[mLabel] = 0;
      }

      (orders || []).forEach((o) => {
        const d = parseSafeDate(o.createdAt);
        if (d && d.getFullYear() === currentYear) {
          const mLabel = d.toLocaleString('id-ID', { month: 'short' });
          if (quarterMap[mLabel] !== undefined) {
            quarterMap[mLabel] += o.totalPrice || 0;
          }
        }
      });

      return Object.entries(quarterMap).map(([name, total]) => ({ name, total }));
    }

    // Years (Real monthly breakdown of recent 6 months, strictly 0 initialized)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const yearMap: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const mLabel = d.toLocaleString('id-ID', { month: 'short' });
      yearMap[mLabel] = 0;
    }

    (orders || []).forEach((o) => {
      const d = parseSafeDate(o.createdAt);
      if (d) {
        try {
          const mLabel = d.toLocaleString('id-ID', { month: 'short' });
          if (yearMap[mLabel] !== undefined) {
            yearMap[mLabel] += o.totalPrice || 0;
          }
        } catch {}
      }
    });

    return Object.entries(yearMap).map(([name, total]) => ({ name, total }));
  }, [orders, chartPeriod]);

  // Top Services calculation
  const topServices = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (orders || []).forEach((o) => {
      if (o.mainService) {
        counts[o.mainService] = (counts[o.mainService] || 0) + 1;
      }
      (o.items || []).forEach((item) => {
        if (item && item.name) {
          counts[item.name] = (counts[item.name] || 0) + (item.qty || 1);
        }
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [orders]);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Quick Action & Greeting Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-blue-100 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-200" />
            Selamat Datang
          </span>
          <h2 className="text-base font-bold leading-tight">Mama Sela Laundry</h2>
          <p className="text-[11px] text-blue-100 mt-0.5">Kelola pesanan & kasir dengan mudah</p>
        </div>
        <button
          onClick={onGoToPos}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-blue-50 font-bold text-xs transition active:scale-95 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Order Baru
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Total Pendapatan Lunas */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Total Pendapatan</span>
            <div className="p-1.5 rounded-lg bg-green-100 text-green-700">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-black text-slate-900 mt-1">{formatRupiah(totalRevenue)}</p>
          <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5 mt-0.5">
            <ArrowUpRight className="w-3 h-3" /> Kas & QRIS lunas
          </span>
        </div>

        {/* Belum Dibayar (Pending) */}
        <div
          onClick={onGoToOrders}
          className={`bg-white rounded-2xl p-3 border shadow-sm transition ${
            onGoToOrders ? 'cursor-pointer hover:border-amber-400 active:scale-98' : ''
          } ${totalUnpaid > 0 ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'}`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium text-amber-800">Belum Dibayar</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-black text-amber-700 mt-1">{formatRupiah(totalUnpaid)}</p>
          <span className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center justify-between">
            <span>{unpaidOrders.length} order belum lunas</span>
            {onGoToOrders && totalUnpaid > 0 && <span className="text-[9px] underline">Lihat →</span>}
          </span>
        </div>

        {/* Pelanggan */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Pelanggan</span>
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-black text-slate-900 mt-1">{customers.length} Orang</p>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            Terdaftar di sistem
          </span>
        </div>

        {/* Pesanan Aktif */}
        <div
          onClick={onGoToOrders}
          className={`bg-white rounded-2xl p-3 border border-slate-200 shadow-sm transition ${
            onGoToOrders ? 'cursor-pointer hover:border-blue-400 active:scale-98' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-medium">Pesanan Aktif</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-black text-slate-900 mt-1">{activeOrders.length} Order</p>
          <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">
            Sedang diproses laundry
          </span>
        </div>
      </div>

      {/* Sales Report Chart with Month, Quarter, Years Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900">Grafik Penjualan</h3>
            <p className="text-[10px] text-slate-400">Total omset laundry</p>
          </div>

          {/* Period Filter Buttons */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl text-[10px] font-semibold">
            {(['Month', 'Quarter', 'Years'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setChartPeriod(p)}
                className={`px-2 py-1 rounded-lg transition ${
                  chartPeriod === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'Month' ? 'Bulan' : p === 'Quarter' ? 'Kuartal' : 'Tahun'}
              </button>
            ))}
          </div>
        </div>

        {/* Chart View */}
        <div className="h-44 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 9, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val / 1000}k`}
              />
              <Tooltip
                formatter={(value: any) => [formatRupiah(Number(value) || 0), 'Penjualan']}
                contentStyle={{
                  fontSize: '11px',
                  borderRadius: '8px',
                  borderColor: '#e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Bar dataKey="total" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
          Layanan Paling Banyak Diorder (Top Services)
        </h3>

        <div className="space-y-2">
          {topServices.map((item, idx) => {
            const maxCount = topServices[0]?.count || 1;
            const pct = Math.round((item.count / maxCount) * 100);

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <span className="text-slate-500 text-[11px] font-bold">{item.count} order</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Realtime Sales Activity */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Aktivitas Penjualan Realtime
          </h3>
          <span className="text-[10px] text-slate-400">Terbaru</span>
        </div>

        <div className="space-y-2">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onViewReceipt(order)}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition cursor-pointer flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-slate-800">{order.customerName}</p>
                <p className="text-[10px] text-slate-500">
                  {order.mainService} • {formatDateTime(order.createdAt)}
                </p>
              </div>

              <div className="text-right">
                <p className="font-bold text-blue-600">{formatRupiah(order.totalPrice)}</p>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded-full text-[9px] font-semibold ${
                    order.paymentStatus === 'Lunas'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
