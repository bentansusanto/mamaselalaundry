'use client';

import React, { useState } from 'react';
import { Order, OrderProgressStatus, PaymentStatus } from '@/types';
import { formatDateTime, formatRupiah } from '@/lib/utils';
import { Search, Package, CheckCircle2, Clock, FileText, ChevronRight, Phone, Zap, Flame, RefreshCw } from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, nextStatus: OrderProgressStatus) => void;
  onUpdatePayment: (orderId: string, paymentStatus: PaymentStatus) => void;
  onViewReceipt: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onUpdateStatus,
  onUpdatePayment,
  onViewReceipt,
}) => {
  const [activeFilter, setActiveFilter] = useState<'Semua' | OrderProgressStatus>('Semua');
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = activeFilter === 'Semua' ? true : o.progressStatus === activeFilter;
    const matchesSearch =
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-3">
      {/* Search & Tabs */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari order, pelanggan, no hp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {(['Semua', 'Proses', 'Packing', 'Selesai'] as const).map((tab) => {
            const count =
              tab === 'Semua' ? orders.length : orders.filter((o) => o.progressStatus === tab).length;
            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-2.5">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-1">
            <Package className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada pesanan ditemukan</p>
            <p className="text-[11px]">Silakan pilih filter lain atau buat order baru</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpress = order.speed === 'Express';
            const isKilat = order.speed === 'Kilat';

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-2.5"
              >
                {/* Header Card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">#{order.id}</span>
                    {/* Speed Badge */}
                    {isExpress && (
                      <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-800 text-[10px] font-bold flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Express
                      </span>
                    )}
                    {isKilat && (
                      <span className="px-1.5 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-bold flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" /> Kilat
                      </span>
                    )}
                  </div>

                  {/* Status Pengerjaan Badge */}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                      order.progressStatus === 'Proses'
                        ? 'bg-blue-100 text-blue-700'
                        : order.progressStatus === 'Packing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {order.progressStatus === 'Proses' && (
                      <>
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sedang Dicuci
                      </>
                    )}
                    {order.progressStatus === 'Packing' && (
                      <>
                        <Package className="w-2.5 h-2.5" /> Siap Packing
                      </>
                    )}
                    {order.progressStatus === 'Selesai' && (
                      <>
                        <CheckCircle2 className="w-2.5 h-2.5" /> Selesai & Diterima
                      </>
                    )}
                  </span>
                </div>

                {/* Customer & Service Info */}
                <div className="flex items-start justify-between text-xs">
                  <div>
                    <h3 className="font-bold text-slate-800">{order.customerName}</h3>
                    <p className="text-[11px] text-slate-500">{order.customerPhone}</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {order.mainService} •{' '}
                      <span className="font-semibold text-slate-800">
                        {order.actualWeight} kg
                        {order.billedWeight !== order.actualWeight && ` (Min 3kg: ${order.billedWeight} kg)`}
                      </span>
                      {order.items.length > 0 && ` + ${order.items.length} item satuan`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600">{formatRupiah(order.totalPrice)}</p>
                    <button
                      onClick={() =>
                        onUpdatePayment(
                          order.id,
                          order.paymentStatus === 'Lunas' ? 'Belum Bayar' : 'Lunas'
                        )
                      }
                      className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        order.paymentStatus === 'Lunas'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-600 border-red-200 animate-pulse'
                      }`}
                    >
                      {order.paymentStatus} ({order.paymentMethod})
                    </button>
                  </div>
                </div>

                {/* Date & Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                  <span className="text-slate-400 text-[10px]">
                    {formatDateTime(order.createdAt)}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* View Receipt */}
                    <button
                      onClick={() => onViewReceipt(order)}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-1 active:scale-95"
                    >
                      <FileText className="w-3 h-3 text-blue-600" />
                      Struk
                    </button>

                    {/* Progress Workflow Buttons */}
                    {order.progressStatus === 'Proses' && (
                      <button
                        onClick={() => onUpdateStatus(order.id, 'Packing')}
                        className="px-2.5 py-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold transition active:scale-95 shadow-sm shadow-yellow-500/20 flex items-center gap-1"
                      >
                        <span>Ke Packing</span>
                        <Package className="w-3 h-3" />
                      </button>
                    )}

                    {order.progressStatus === 'Packing' && (
                      <button
                        onClick={() => onUpdateStatus(order.id, 'Selesai')}
                        className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition active:scale-95 shadow-sm shadow-green-600/20 flex items-center gap-1"
                      >
                        <span>Selesai & Diterima</span>
                        <CheckCircle2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
