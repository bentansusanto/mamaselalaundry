'use client';

import React, { useState } from 'react';
import { Customer, Order } from '@/types';
import { formatDate, formatRupiah } from '@/lib/utils';
import {
  Search,
  Plus,
  UserPlus,
  Phone,
  MapPin,
  User,
  ChevronRight,
  X,
  Edit3,
  Trash2,
  AlertTriangle,
  MessageCircle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  orders: Order[];
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onViewReceipt: (order: Order) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  orders,
  onSaveCustomer,
  onDeleteCustomer,
  onViewReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [selectedCustHistory, setSelectedCustHistory] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormAddress(c.address === '-' ? '' : c.address || '');
    setIsModalOpen(true);
  };

  const handlePromptDelete = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustomerToDelete(c);
  };

  const handleConfirmDelete = () => {
    if (customerToDelete) {
      onDeleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
      if (isModalOpen && editingCustomer?.id === customerToDelete.id) {
        setIsModalOpen(false);
      }
    }
  };

  const handleSave = () => {
    const cleanName = formName.trim();
    const cleanPhone = formPhone.trim().replace(/[^0-9+]/g, '');

    if (!cleanName) {
      alert('Nama pelanggan wajib diisi!');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 8) {
      alert('Nomor HP / WhatsApp wajib diisi (minimal 8 digit angka)!');
      return;
    }

    const customerToSave: Customer = {
      id: editingCustomer
        ? editingCustomer.id
        : `CUST-${Date.now().toString().slice(-4)}`,
      name: cleanName,
      phone: cleanPhone,
      address: formAddress.trim() || '-',
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
    };

    onSaveCustomer(customerToSave);
    setIsModalOpen(false);
  };

  const formatWhatsAppUrl = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }
    return `https://wa.me/${cleaned}`;
  };

  const historyOrders = selectedCustHistory
    ? orders.filter((o) => o.customerId === selectedCustHistory.id)
    : [];

  return (
    <div className="space-y-3">
      {/* Top Search & Add Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Data Pelanggan</h2>
            <p className="text-[11px] text-slate-500">
              Total {customers.length} pelanggan terdaftar
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm shadow-blue-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, no WA, atau alamat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-2">
            <User className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Tidak ada pelanggan ditemukan</p>
            <p className="text-[11px] text-slate-400">
              {search
                ? `Tidak ada hasil pencarian "${search}".`
                : 'Belum ada data pelanggan. Klik tombol Tambah di atas.'}
            </p>
          </div>
        ) : (
          filtered.map((cust) => {
            const custOrders = orders.filter((o) => o.customerId === cust.id);
            const totalSpent = custOrders.reduce(
              (sum, o) => sum + (o.paymentStatus === 'Lunas' ? o.totalPrice : 0),
              0
            );

            return (
              <div
                key={cust.id}
                onClick={() => setSelectedCustHistory(cust)}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm hover:border-blue-300 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-900 leading-tight">
                        {cust.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{cust.phone}</span>
                        <a
                          href={formatWhatsAppUrl(cust.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Chat WhatsApp"
                          className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {cust.address && cust.address !== '-' && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{cust.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      {custOrders.length} Order
                    </span>
                    <p className="text-[11px] font-bold text-slate-800 mt-1">
                      {formatRupiah(totalSpent)}
                    </p>
                  </div>
                </div>

                {/* Footer Actions: Terdaftar, Edit, Hapus, Riwayat */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-400 text-[10px]">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(cust.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleOpenEdit(cust, e)}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-lg font-semibold flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={(e) => handlePromptDelete(cust, e)}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-semibold flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>

                    <button
                      onClick={() => setSelectedCustHistory(cust)}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-0.5 transition"
                    >
                      <span>Riwayat</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal (Create & Update) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  {editingCustomer ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {editingCustomer ? `ID: ${editingCustomer.id}` : 'Simpan informasi pelanggan ke database'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nama Pelanggan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Bu Ratna"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nomor HP / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Alamat Lengkap (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Contoh: Jl. Melati No. 12 RT 01/02"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              {editingCustomer && (
                <button
                  type="button"
                  onClick={() => setCustomerToDelete(editingCustomer)}
                  className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition"
                  title="Hapus pelanggan ini"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/20"
              >
                {editingCustomer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-5 shadow-2xl space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-slate-900">Hapus Pelanggan?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus data{' '}
                <span className="font-bold text-slate-800">{customerToDelete.name}</span>?
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Catatan: Riwayat nota transaksi pesanan sebelumnya akan tetap aman tersimpan.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Order History Modal */}
      {selectedCustHistory && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl max-w-md w-full max-h-[85vh] p-4 shadow-2xl flex flex-col space-y-3 animate-in slide-in-from-bottom-6 duration-200">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{selectedCustHistory.name}</h3>
                <p className="text-[11px] text-slate-500">{selectedCustHistory.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = selectedCustHistory;
                    setSelectedCustHistory(null);
                    handleOpenEdit(c);
                  }}
                  className="p-1.5 rounded-lg bg-slate-100 text-blue-600 hover:bg-slate-200 transition"
                  title="Edit data pelanggan"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedCustHistory(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-700">
              Riwayat Pesanan ({historyOrders.length}):
            </p>

            <div className="overflow-y-auto space-y-2 pr-1 max-h-96">
              {historyOrders.length === 0 ? (
                <div className="text-center py-8 space-y-1">
                  <p className="text-xs text-slate-500">Belum ada riwayat pesanan</p>
                  <p className="text-[11px] text-slate-400">
                    Pelanggan ini belum pernah melakukan transaksi
                  </p>
                </div>
              ) : (
                historyOrders.map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => onViewReceipt(ord)}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition cursor-pointer space-y-1 text-xs"
                  >
                    <div className="flex justify-between font-bold">
                      <span>#{ord.id}</span>
                      <span className="text-blue-600">{formatRupiah(ord.totalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>
                        {ord.mainService} ({ord.billedWeight} kg)
                      </span>
                      <span
                        className={
                          ord.paymentStatus === 'Lunas'
                            ? 'text-emerald-600 font-bold'
                            : 'text-rose-500 font-bold'
                        }
                      >
                        {ord.paymentStatus}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 pt-0.5">
                      {formatDate(ord.createdAt)} • Status: {ord.progressStatus}
                    </p>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedCustHistory(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
