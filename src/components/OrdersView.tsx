'use client';

import React, { useState } from 'react';
import { Order, OrderProgressStatus, PaymentStatus, PaymentMethod, SpeedItem } from '@/types';
import { INITIAL_SPEEDS } from '@/lib/initialData';
import { formatDateTime, formatRupiah, formatWeight, resolveOrderSpeed } from '@/lib/utils';
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
  speeds?: SpeedItem[];
  onUpdateStatus: (orderId: string, nextStatus: OrderProgressStatus) => void;
  onUpdatePayment: (orderId: string, paymentStatus: PaymentStatus, paymentMethod?: PaymentMethod) => void;
  onViewReceipt: (order: Order) => void;
  onDeleteOrder?: (orderId: string) => void;
  onClearAllOrders?: () => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  speeds = INITIAL_SPEEDS,
  onUpdateStatus,
  onUpdatePayment,
  onViewReceipt,
  onDeleteOrder,
  onClearAllOrders,
}) => {
  const speedList = speeds && speeds.length > 0 ? speeds : INITIAL_SPEEDS;
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
    <div className="space-y-3.5">
      {/* Search & Tabs */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-3">
        <div className="relative">
          <Search aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Cari pesanan berdasarkan nomor order, nama pelanggan, atau nomor HP"
            placeholder="Cari order, pelanggan, no hp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-h-[42px] pl-10 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-4 gap-1.5">
          {(['Semua', 'Proses', 'Packing', 'Selesai'] as const).map((tab) => {
            const count =
              tab === 'Semua' ? orders.length : orders.filter((o) => o.progressStatus === tab).length;
            const isActive = activeFilter === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`min-h-[40px] px-2 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none font-extrabold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-700'
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
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-1.5">
            <Package aria-hidden="true" className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-xs font-semibold text-slate-600">Tidak ada pesanan ditemukan</p>
            <p className="text-[11px]">Silakan pilih filter lain atau buat order baru</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const relatedSpeed = resolveOrderSpeed(order, speedList);
            const lowerSpeedName = relatedSpeed.name.toLowerCase();
            const isExpress = lowerSpeedName.includes('express');
            const isKilat = lowerSpeedName.includes('kilat');
            const isPaid = order.paymentStatus === 'Lunas';
            const statusBorderColor =
              order.progressStatus === 'Proses'
                ? 'border-l-blue-500'
                : order.progressStatus === 'Packing'
                ? 'border-l-amber-500'
                : 'border-l-emerald-500';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl p-4 border border-slate-200 border-l-4 ${statusBorderColor} shadow-sm space-y-3 transition hover:border-slate-300`}
              >
                {/* Header Card: Order ID, Date, Speed Relation Badge & Workflow Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-xs text-slate-900 tracking-tight">
                        #{order.id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 border ${
                          isKilat
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : isExpress
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {isKilat ? (
                          <Flame aria-hidden="true" className="w-3 h-3 text-rose-600" />
                        ) : isExpress ? (
                          <Zap aria-hidden="true" className="w-3 h-3 text-amber-600" />
                        ) : (
                          <Clock aria-hidden="true" className="w-3 h-3 text-slate-500" />
                        )}
                        <span>
                          {relatedSpeed.name} • {relatedSpeed.durationLabel}
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </div>

                  {/* Status Pengerjaan Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 shrink-0 ${
                      order.progressStatus === 'Proses'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : order.progressStatus === 'Packing'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {order.progressStatus === 'Proses' && (
                      <>
                        <RefreshCw aria-hidden="true" className="w-3 h-3 animate-spin" /> Sedang Dicuci
                      </>
                    )}
                    {order.progressStatus === 'Packing' && (
                      <>
                        <Package aria-hidden="true" className="w-3 h-3" /> Siap Packing
                      </>
                    )}
                    {order.progressStatus === 'Selesai' && (
                      <>
                        <CheckCircle2 aria-hidden="true" className="w-3 h-3" /> Selesai
                      </>
                    )}
                  </span>
                </div>

                {/* Middle Info Box: Customer, Service Details, Speed Relation & Price */}
                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {order.customerName}
                    </h3>
                    {order.customerPhone && order.customerPhone !== '-' && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                        <Phone aria-hidden="true" className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{order.customerPhone}</span>
                      </p>
                    )}
                    <p className="text-xs text-slate-700 font-medium pt-0.5">
                      {order.actualWeight > 0 ? (
                        <>
                          {order.mainService} •{' '}
                          <span className="font-bold text-slate-900">
                            {formatWeight(order.actualWeight)} kg
                            {order.billedWeight !== order.actualWeight &&
                              ` (Min 3kg: ${formatWeight(order.billedWeight)} kg)`}
                          </span>
                        </>
                      ) : (
                        <span className="font-bold text-slate-900">{order.mainService}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Kecepatan:{' '}
                      <span className="font-bold text-slate-800">
                        {relatedSpeed.name} ({relatedSpeed.durationLabel})
                      </span>
                      {relatedSpeed.fee > 0 && (
                        <span className="text-amber-700 font-bold">
                          {' '}
                          • +{formatRupiah(relatedSpeed.fee)}
                        </span>
                      )}
                    </p>
                    {(order.items || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {(order.items || []).map((itm, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/70 text-[10px] font-bold"
                          >
                            {itm.name} ×{itm.qty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                      Total Tagihan
                    </span>
                    <p className="text-base font-black text-blue-600">
                      {formatRupiah(order.totalPrice)}
                    </p>
                  </div>
                </div>

                {/* Payment Status Button - Full Width Comfortable Touch Target */}
                <button
                  type="button"
                  onClick={() => handleOpenPaymentModal(order)}
                  className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold border transition active:scale-[0.99] flex items-center justify-between gap-2 shadow-sm ${
                    isPaid
                      ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80'
                      : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100/80'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CreditCard
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}
                    />
                    <span>
                      Status: <strong className="font-extrabold">{order.paymentStatus}</strong> ({order.paymentMethod})
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold underline-offset-2">
                    {isPaid ? 'Ubah Metode' : 'Bayar Sekarang'}
                    <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
                  </span>
                </button>

                {/* Bottom Action Buttons - Large Touch Targets & Safe Spacing */}
                <div className="pt-1 flex items-center gap-2">
                  {/* Delete Order (hanya jika belum selesai, dipisah di kiri agar tidak salah klik) */}
                  {onDeleteOrder && order.progressStatus !== 'Selesai' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Hapus pesanan #${order.id} (${order.customerName})?`)) {
                          onDeleteOrder(order.id);
                        }
                      }}
                      aria-label={`Hapus pesanan ${order.id} milik ${order.customerName}`}
                      className="min-h-[42px] px-3 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs transition active:scale-95 inline-flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Trash2 aria-hidden="true" className="w-4 h-4 text-red-500" />
                      <span>Hapus</span>
                    </button>
                  )}

                  {/* View Receipt */}
                  <button
                    type="button"
                    onClick={() => onViewReceipt(order)}
                    aria-label={`Lihat struk pesanan ${order.id} milik ${order.customerName}`}
                    className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                  >
                    <FileText aria-hidden="true" className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Lihat Struk</span>
                  </button>

                  {/* Progress Workflow Primary CTA */}
                  {order.progressStatus === 'Proses' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'Packing')}
                      aria-label={`Pindahkan pesanan ${order.id} ke tahap Packing`}
                      className="flex-[1.3] min-h-[42px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition active:scale-95 shadow-sm shadow-amber-500/20 inline-flex items-center justify-center gap-1.5"
                    >
                      <Package aria-hidden="true" className="w-4 h-4 shrink-0" />
                      <span>Ke Packing</span>
                    </button>
                  )}

                  {order.progressStatus === 'Packing' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'Selesai')}
                      aria-label={`Tandai pesanan ${order.id} Selesai dan Diterima`}
                      className="flex-[1.3] min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition active:scale-95 shadow-sm shadow-emerald-600/20 inline-flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
                      <span>Selesai & Ambil</span>
                    </button>
                  )}
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
                type="button"
                aria-label="Tutup modal pembayaran"
                onClick={() => setPaymentModalOrder(null)}
                className="min-w-[36px] min-h-[36px] p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition flex items-center justify-center"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto">
              {/* Customer & Order Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
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
                  <span className="text-slate-700 text-right font-medium">
                    {paymentModalOrder.actualWeight > 0
                      ? `${paymentModalOrder.mainService} (${formatWeight(paymentModalOrder.actualWeight)} kg)`
                      : paymentModalOrder.mainService}
                  </span>
                </div>
                {(paymentModalOrder.items || []).length > 0 && (
                  <div className="flex justify-between text-[11px] gap-2">
                    <span className="text-slate-500 shrink-0">Item Satuan:</span>
                    <span className="text-slate-700 text-right font-medium">
                      {(paymentModalOrder.items || [])
                        .map((i) => `${i.name} ×${i.qty}`)
                        .join(', ')}
                    </span>
                  </div>
                )}
                {(() => {
                  const modalSpd = resolveOrderSpeed(paymentModalOrder, speedList);
                  return (
                    <div className="flex justify-between text-[11px] gap-2">
                      <span className="text-slate-500 shrink-0">Kecepatan:</span>
                      <span className="text-slate-700 text-right font-semibold">
                        {modalSpd.name} ({modalSpd.durationLabel})
                        {modalSpd.fee > 0 ? ` • +${formatRupiah(modalSpd.fee)}` : ''}
                      </span>
                    </div>
                  );
                })()}
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
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('Cash')}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 ${
                      selectedMethod === 'Cash'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote aria-hidden="true" className="w-4 h-4 text-emerald-600" />
                    <span>Tunai (Cash)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('QRIS')}
                    className={`min-h-[44px] py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 ${
                      selectedMethod === 'QRIS'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode aria-hidden="true" className="w-4 h-4 text-indigo-600" />
                    <span>QRIS</span>
                  </button>
                </div>
              </div>

              {/* Detail based on Selected Method */}
              {selectedMethod === 'Cash' ? (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="cash-given-input" className="text-[11px] font-bold text-slate-700">
                      Uang Diterima:
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Pas: {formatRupiah(paymentModalOrder.totalPrice)}
                    </span>
                  </div>

                  <input
                    id="cash-given-input"
                    type="number"
                    value={cashGiven === 0 ? '' : cashGiven}
                    onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                    placeholder="Contoh: 20000"
                    className="w-full min-h-[44px] text-center text-base font-extrabold py-2 bg-white rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Quick cash pills */}
                  <div className="flex gap-2 justify-center flex-wrap pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCashGiven(paymentModalOrder.totalPrice)}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl hover:border-blue-500 text-slate-700 active:scale-95 transition"
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
                            className="min-h-[38px] px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-xl hover:border-blue-500 text-slate-700 active:scale-95 transition"
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
                  <QrCode aria-hidden="true" className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
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
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2">
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentModalOrder(null)}
                  className="min-h-[44px] py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition active:scale-95"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onUpdatePayment(paymentModalOrder.id, 'Lunas', selectedMethod);
                    setPaymentModalOrder(null);
                  }}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check aria-hidden="true" className="w-4 h-4" />
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
                  className="w-full min-h-[38px] py-2 text-center text-xs text-red-600 hover:bg-red-50 rounded-xl font-bold transition"
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
