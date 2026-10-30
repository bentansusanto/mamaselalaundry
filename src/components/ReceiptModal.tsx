'use client';

import React from 'react';
import { Order, SpeedItem } from '@/types';
import { INITIAL_SPEEDS } from '@/lib/initialData';
import { formatRupiah, formatDateTime, formatWeight, resolveOrderSpeed } from '@/lib/utils';
import { Printer, Share2, X, CheckCircle, Clock } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  speeds?: SpeedItem[];
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  speeds = INITIAL_SPEEDS,
  onClose,
}) => {
  if (!order) return null;

  const relatedSpeed = resolveOrderSpeed(order, speeds);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    let cleanPhone = order.customerPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    const kiloanLine =
      order.actualWeight > 0
        ? `- Layanan Kiloan: ${order.mainService} (${formatWeight(order.actualWeight)} kg${
            order.billedWeight !== order.actualWeight
              ? `, dihitung min 3kg: ${formatWeight(order.billedWeight)} kg`
              : ''
          }): ${formatRupiah(order.mainServiceTotal)}\n`
        : '';

    const itemsSummary =
      (order.items || []).length > 0
        ? `*Layanan Satuan:*\n` +
          (order.items || [])
            .map((i) => `- ${i.name} (${i.qty}x): ${formatRupiah(i.total)}`)
            .join('\n') +
          '\n'
        : '';

    const subtotal = (order.mainServiceTotal || 0) + (order.itemsTotal || 0) + (order.speedFee || 0);
    const roundingDiff = (order.totalPrice || 0) - subtotal;
    const roundingSummary =
      roundingDiff !== 0
        ? `- Pembulatan: ${
            roundingDiff > 0 ? `+${formatRupiah(roundingDiff)}` : formatRupiah(roundingDiff)
          }\n`
        : '';

    const text = `*NOTA LAUNDRY - MAMA SELA*
Bida Asri 1 blok D1 no 12, Batam Center
No. Order: *#${order.id}*
Pelanggan: ${order.customerName}
Tanggal Masuk: ${formatDateTime(order.createdAt)}
Estimasi Selesai: ${formatDateTime(order.estimatedCompletion)}

*Rincian:*
${kiloanLine}${itemsSummary}- Kecepatan: ${relatedSpeed.name} (${relatedSpeed.durationLabel}) ${
      order.speedFee > 0 ? `(+${formatRupiah(order.speedFee)})` : ''
    }
${roundingSummary}
*Total Tagihan: ${formatRupiah(order.totalPrice)}*
Status Pembayaran: *${order.paymentStatus}* (${order.paymentMethod})
Status Pengerjaan: *${order.progressStatus}*

_Terima kasih telah mempercayakan pakaian Anda kepada kami!_`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Struk Pembayaran / Nota</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Body */}
        <div id="receipt-print" className="p-5 overflow-y-auto text-xs text-slate-800 font-mono space-y-3">
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="font-bold text-base font-sans tracking-wide text-blue-600">MAMA SELA LAUNDRY</h2>
            <p className="text-[11px] text-slate-500 font-sans">Pusat Cuci & Setrika Bersih Wangi</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Bida Asri 1 blok D1 no 12, Batam Center</p>
          </div>

          <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">No. Order:</span>
              <span className="font-bold">{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tanggal:</span>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pelanggan:</span>
              <span className="font-bold">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">No. HP:</span>
              <span>{order.customerPhone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kasir:</span>
              <span>{order.cashierName}</span>
            </div>
          </div>

          {/* Service Items */}
          <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
            {order.actualWeight > 0 && (
              <>
                <div className="flex justify-between font-bold">
                  <span>{order.mainService}</span>
                  <span>{formatRupiah(order.mainServiceTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pl-2">
                  <span>
                    {formatWeight(order.actualWeight)} kg x{' '}
                    {formatRupiah(order.billedWeight > 0 ? order.mainServiceTotal / order.billedWeight : 0)}
                    {order.billedWeight !== order.actualWeight && (
                      <span className="text-amber-600">
                        {' '}
                        (Min 3kg: {formatWeight(order.billedWeight)} kg)
                      </span>
                    )}
                  </span>
                </div>
              </>
            )}

            {/* Satuan Items */}
            {(order.items || []).map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px]">
                <span className={order.actualWeight <= 0 ? 'font-bold' : ''}>
                  {item.name} x{item.qty}
                </span>
                <span className={order.actualWeight <= 0 ? 'font-bold' : ''}>
                  {formatRupiah(item.total)}
                </span>
              </div>
            ))}

            {/* Speed Fee */}
            <div className="flex justify-between text-[11px]">
              <span>
                Kecepatan: {relatedSpeed.name} ({relatedSpeed.durationLabel})
              </span>
              <span>{order.speedFee > 0 ? formatRupiah(order.speedFee) : 'Rp 0'}</span>
            </div>

            {/* Pembulatan if any */}
            {order.totalPrice !== ((order.mainServiceTotal || 0) + (order.itemsTotal || 0) + (order.speedFee || 0)) && (
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Pembulatan:</span>
                <span>
                  {order.totalPrice - ((order.mainServiceTotal || 0) + (order.itemsTotal || 0) + (order.speedFee || 0)) > 0
                    ? `+${formatRupiah(order.totalPrice - ((order.mainServiceTotal || 0) + (order.itemsTotal || 0) + (order.speedFee || 0)))}`
                    : formatRupiah(order.totalPrice - ((order.mainServiceTotal || 0) + (order.itemsTotal || 0) + (order.speedFee || 0)))}
                </span>
              </div>
            )}
          </div>

          {/* Total & Payment */}
          <div className="space-y-1 border-b border-dashed border-slate-300 pb-2 font-bold text-[12px]">
            <div className="flex justify-between text-sm text-slate-900">
              <span>TOTAL</span>
              <span>{formatRupiah(order.totalPrice)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1 font-normal">
              <span className="text-slate-500">Metode Bayar:</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-xs font-normal">
              <span className="text-slate-500">Status Pembayaran:</span>
              <span
                className={`font-semibold ${
                  order.paymentStatus === 'Lunas' ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-500 pt-1 space-y-0.5">
            <p>Estimasi Selesai: {formatDateTime(order.estimatedCompletion)}</p>
            <p>Simpan nota ini untuk pengambilan pakaian.</p>
            <p className="font-bold text-slate-700">Terima Kasih!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-xs transition active:scale-95 shadow-sm shadow-green-600/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            Kirim WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition active:scale-95 shadow-sm shadow-blue-600/20"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
};
