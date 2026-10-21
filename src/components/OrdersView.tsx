'use client';

import React, { useState } from 'react';
import { Order, OrderProgressStatus, PaymentStatus, PaymentMethod } from '@/types';
import { formatDateTime, formatRupiah, formatWeight } from '@/lib/utils';
import { 
  Search, 
  Package, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ChevronRight, 
  Phone, 
  Zap, 
  Flame, 
  RefreshCw,
  Banknote,
  QrCode,
  Check,
  X,
  CreditCard,
  Trash2
} from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, nextStatus: OrderProgressStatus) => void;
  onUpdatePayment: (orderId: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => void;
  onViewReceipt: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  onClearAllOrders?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onUpdateStatus,
  onUpdatePayment,
  onViewReceipt,
  onDeleteOrder,
  onClearAllOrders,
}) => {
  const [activeFilter, setActiveFilter] = useState<'Semua' | OrderProgressStatus>('Semua');
  const [search, setSearch] = useState('');

  // Payment Settlement Modal States
  const [paymentModalOrder, setPaymentModalOrder] = useState<Order | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Cash');
  const [cashGiven, setCashGiven] = useState<number>(0);

  const handleOpenPaymentModal = (order: Order) => {
    setPaymentModalOrder(order);
    setSelectedMethod(order.paymentMethod || 'Cash');
    setCashGiven(order.totalPrice);
  };

  const filteredOrders = (orders || []).filter((o) => {
    if (!o) return false;
    const matchesFilter = activeFilter === 'Semua' ? true : o.progressStatus === activeFilter;
    const custName = (o.customerName || '').toLowerCase();
    const orderId = (o.id || '').toLowerCase();
    const phone = o.customerPhone || '';
    const q = (search || '').toLowerCase();

    const matchesSearch =
      custName.includes(q) ||
      orderId.includes(q) ||
      phone.includes(q);
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

        {/* Filter Tabs & Clear All */}
        <div className="flex items-center justify-between gap-1 pt-1">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">
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
                        {formatWeight(order.actualWeight)} kg
                        {order.billedWeight !== order.actualWeight && ` (Min 3kg: ${formatWeight(order.billedWeight)} kg)`}
                      </span>
                      {(order.items || []).length > 0 && ` + ${(order.items || []).length} item satuan`}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600">{formatRupiah(order.totalPrice)}</p>
                    <button
                      onClick={() => handleOpenPaymentModal(order)}
                      className={`inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition active:scale-95 shadow-sm ${
                        order.paymentStatus === 'Lunas'
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 animate-pulse'
                      }`}
                      title="Klik untuk memilih metode & memproses pembayaran"
                    >
                      <span>{order.paymentStatus}</span>
                      <span className="font-bold">({order.paymentMethod})</span>
                      <ChevronRight className="w-2.5 h-2.5 opacity-60" />
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

                    {/* Delete Order (hanya jika belum selesai) */}
                    {onDeleteOrder && order.progressStatus !== 'Selesai' && (
                      <button
                        onClick={() => {
                          if (confirm(`Hapus pesanan #${order.id} (${order.customerName})?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="px-2 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition active:scale-95 flex items-center gap-0.5"
                        title="Hapus pesanan ini"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                        <span className="text-[10px]">Hapus</span>
                      </button>
                    )}

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

      {/* Payment Settlement Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs">
                    {paymentModalOrder.paymentStatus === 'Belum Bayar'
                      ? 'Proses Pelunasan'
                      : 'Ubah Metode Pembayaran'}
                  </h3>
                  <p className="text-[10px] text-slate-500">#{paymentModalOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto">
              {/* Customer & Order Summary */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-bold text-slate-800">{paymentModalOrder.customerName}</span>
                </div>
                {paymentModalOrder.customerPhone && (
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">No. WhatsApp:</span>
                    <span className="text-slate-700">{paymentModalOrder.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Layanan:</span>
                  <span className="text-slate-700">
                    {paymentModalOrder.mainService} ({formatWeight(paymentModalOrder.actualWeight)} kg)
                  </span>
                </div>
              </div>

              {/* Tagihan Card */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-[11px] font-semibold text-blue-700">Total Tagihan</p>
                <p className="text-2xl font-black text-blue-900 mt-0.5">
                  {formatRupiah(paymentModalOrder.totalPrice)}
                </p>
              </div>

              {/* Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('Cash')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      selectedMethod === 'Cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('QRIS')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      selectedMethod === 'QRIS'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-indigo-600" />
                    <span>QRIS</span>
                  </button>
                </div>
              </div>

              {/* Detail based on Selected Method */}
              {selectedMethod === 'Cash' ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">Uang Diterima:</label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pas: {formatRupiah(paymentModalOrder.totalPrice)}
                    </span>
                  </div>

                  <input
                    type="number"
                    value={cashGiven === 0 ? '' : cashGiven}
                    onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 20000"
                    className="w-full text-center text-base font-extrabold py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Quick cash pills */}
                  <div className="flex gap-1.5 justify-center flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCashGiven(paymentModalOrder.totalPrice)}
                      className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded-lg hover:border-blue-400 text-slate-700"
                    >
                      Uang Pas
                    </button>
                    {[20000, 50000, 100000].map((amt) => {
                      if (amt >= paymentModalOrder.totalPrice) {
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCashGiven(amt)}
                            className="px-2 py-1 text-[10px] font-semibold bg-white border border-slate-200 rounded-lg hover:border-blue-400 text-slate-700"
                          >
                            {formatRupiah(amt)}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>

                  {/* Kembalian calculation */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">Kembalian:</span>
                    <span
                      className={`font-black text-sm ${
                        cashGiven >= paymentModalOrder.totalPrice
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {cashGiven >= paymentModalOrder.totalPrice
                        ? formatRupiah(cashGiven - paymentModalOrder.totalPrice)
                        : `Kurang ${formatRupiah(paymentModalOrder.totalPrice - cashGiven)}`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 flex items-start gap-2.5">
                  <QrCode className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-indigo-900 leading-relaxed">
                    <p className="font-bold">Pembayaran Non-Tunai QRIS</p>
                    <p className="text-indigo-700 mt-0.5">
                      Pelanggan membayar sebesar{' '}
                      <span className="font-bold text-indigo-900">
                        {formatRupiah(paymentModalOrder.totalPrice)}
                      </span>{' '}
                      melalui QRIS. Pastikan notifikasi dana masuk sudah diterima sebelum memproses.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="py-2.5 px-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdatePayment(paymentModalOrder.id, 'Lunas', selectedMethod);
                    setPaymentModalOrder(null);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Proses Lunas ({selectedMethod === 'Cash' ? 'Tunai' : 'QRIS'})
                  </span>
                </button>
              </div>

              {/* If already Lunas, allow switching back to Belum Bayar */}
              {paymentModalOrder.paymentStatus === 'Lunas' && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdatePayment(paymentModalOrder.id, 'Belum Bayar', selectedMethod);
                    setPaymentModalOrder(null);
                  }}
                  className="w-full py-1 text-center text-[10px] text-red-600 hover:underline font-semibold"
                >
                  Ubah status kembali jadi Belum Bayar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
