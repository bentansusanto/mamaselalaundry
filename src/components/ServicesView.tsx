'use client';

import React, { useState } from 'react';
import { ServiceCategory, ServiceItem, UnitType, VariantSize } from '@/types';
import { calculateProfitMargin, formatRupiah } from '@/lib/utils';
import { Sparkles, Plus, Edit2, Trash2, X, TrendingUp, AlertCircle } from 'lucide-react';

interface ServicesViewProps {
  services: ServiceItem[];
  onSaveService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onSaveService,
  onDeleteService,
}) => {
  const [activeCategory, setActiveCategory] = useState<'Semua' | ServiceCategory>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Kiloan');
  const [variant, setVariant] = useState<VariantSize | ''>('');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [price, setPrice] = useState<number>(6000);
  const [hpp, setHpp] = useState<number>(2500);

  const profitRp = Math.max(0, price - hpp);
  const profitMarginPercent = calculateProfitMargin(price, hpp);

  const filtered = services.filter((s) =>
    activeCategory === 'Semua' ? true : s.category === activeCategory
  );

  const handleOpenAdd = () => {
    setEditingService(null);
    setName('');
    const defaultCat: ServiceCategory = activeCategory === 'Satuan' ? 'Satuan' : 'Kiloan';
    setCategory(defaultCat);
    setVariant('');
    setUnit(defaultCat === 'Kiloan' ? 'kg' : 'pcs');
    setPrice(defaultCat === 'Kiloan' ? 6000 : 15000);
    setHpp(defaultCat === 'Kiloan' ? 2500 : 5000);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: ServiceItem) => {
    setEditingService(s);
    setName(s.name);
    setCategory(s.category);
    setVariant(s.variant || '');
    setUnit(s.unit);
    setPrice(s.price);
    setHpp(s.hpp);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim() || price <= 0) {
      alert('Nama layanan dan Harga jual harus diisi dengan benar!');
      return;
    }

    // Generate a guaranteed unique ID based on highest existing numeric suffix (minimum 9 for SRV-01..SRV-09)
    let nextId = editingService?.id;
    if (!nextId) {
      let maxNum = 9;
      const existingIds = new Set(services.map((s) => s.id));
      for (const s of services) {
        const m = String(s.id || '').match(/^SRV-(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      let candidateNum = maxNum + 1;
      nextId = `SRV-${String(candidateNum).padStart(2, '0')}`;
      while (existingIds.has(nextId)) {
        candidateNum++;
        nextId = `SRV-${String(candidateNum).padStart(2, '0')}`;
      }
    }

    const item: ServiceItem = {
      id: nextId,
      name: name.trim(),
      category,
      variant: (variant as VariantSize) || undefined,
      unit: category === 'Kiloan' ? 'kg' : 'pcs',
      price,
      hpp,
      profitMarginPercent,
    };

    onSaveService(item);
    // Ensure the user can immediately see the saved service if they were on another filter tab
    if (activeCategory !== 'Semua' && activeCategory !== category) {
      setActiveCategory('Semua');
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Category filter & Add button */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {(['Semua', 'Kiloan', 'Satuan'] as const).map((cat) => {
            const count =
              cat === 'Semua'
                ? services.length
                : services.filter((s) => s.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
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

        <button
          type="button"
          onClick={handleOpenAdd}
          className="min-h-[38px] flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition active:scale-95 shadow-sm shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah
        </button>
      </div>

      {/* Services List */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const itemProfit = item.price - item.hpp;
          const isHighMargin = item.profitMarginPercent >= 50;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs text-slate-900">{item.name}</h3>
                    {item.variant && (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                        {item.variant}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Kategori: {item.category} ({item.unit})
                  </span>
                </div>

                <div className="text-right">
                  <p className="font-bold text-xs text-blue-600">
                    {formatRupiah(item.price)}
                    <span className="text-[10px] text-slate-400 font-normal">/{item.unit}</span>
                  </p>
                  <span
                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      isHighMargin
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    Profit: {item.profitMarginPercent}% ({formatRupiah(itemProfit)})
                  </span>
                </div>
              </div>

              {/* HPP breakdown & Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  HPP: <span className="font-semibold text-slate-700">{formatRupiah(item.hpp)}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus layanan ${item.name}?`)) {
                        onDeleteService(item.id);
                      }
                    }}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900">
                {editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Layanan *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Cuci setrika / Bedcover"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const cat = e.target.value as ServiceCategory;
                      setCategory(cat);
                      setUnit(cat === 'Kiloan' ? 'kg' : 'pcs');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="Kiloan">Kiloan</option>
                    <option value="Satuan">Satuan</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Varian Ukuran</label>
                  <select
                    value={variant}
                    onChange={(e) => setVariant(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="">(Tidak Ada)</option>
                    <option value="S">S (Small)</option>
                    <option value="M">M (Medium)</option>
                    <option value="L">L (Large)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-blue-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">HPP (Modal) (Rp)</label>
                  <input
                    type="number"
                    value={hpp}
                    onChange={(e) => setHpp(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-700"
                  />
                </div>
              </div>

              {/* Automatic Profit Margin Preview */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Keuntungan per unit:</span>
                  <span className="font-bold text-green-700">{formatRupiah(profitRp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Persentase Profit Margin:</span>
                  <span className="font-black text-blue-700">{profitMarginPercent}%</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="w-1/2 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
