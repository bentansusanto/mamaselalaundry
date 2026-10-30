'use client';

import React, { useState } from 'react';
import { Order, ServiceCategory, ServiceItem, SpeedItem, UnitType, VariantSize } from '@/types';
import { INITIAL_SPEEDS } from '@/lib/initialData';
import { calculateProfitMargin, formatRupiah } from '@/lib/utils';
import { Sparkles, Plus, Edit2, Trash2, X, Zap, Clock, Link2 } from 'lucide-react';

interface ServicesViewProps {
  services: ServiceItem[];
  speeds?: SpeedItem[];
  orders?: Order[];
  onSaveService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
  onSaveSpeed?: (speed: SpeedItem) => void;
  onDeleteSpeed?: (id: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  speeds = INITIAL_SPEEDS,
  orders = [],
  onSaveService,
  onDeleteService,
  onSaveSpeed,
  onDeleteSpeed,
}) => {
  const [activeCategory, setActiveCategory] = useState<'Semua' | ServiceCategory | 'Kecepatan'>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Speed Modal states
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);
  const [editingSpeed, setEditingSpeed] = useState<SpeedItem | null>(null);
  const [speedName, setSpeedName] = useState('');
  const [speedDurationLabel, setSpeedDurationLabel] = useState('1 Hari');
  const [speedDurationHours, setSpeedDurationHours] = useState<number>(24);
  const [speedFee, setSpeedFee] = useState<number>(8000);

  // Service Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Kiloan');
  const [variant, setVariant] = useState<VariantSize | ''>('');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [price, setPrice] = useState<number>(6000);
  const [hpp, setHpp] = useState<number>(2500);

  const profitRp = Math.max(0, price - hpp);
  const profitMarginPercent = calculateProfitMargin(price, hpp);

  const filtered =
    activeCategory === 'Kecepatan'
      ? []
      : services.filter((s) => (activeCategory === 'Semua' ? true : s.category === activeCategory));

  const speedList = speeds && speeds.length > 0 ? speeds : INITIAL_SPEEDS;

  const getLinkedOrdersCount = (spd: SpeedItem): number => {
    return (orders || []).filter(
      (o) =>
        o.speedId === spd.id ||
        (!o.speedId && String(o.speed || '').trim().toLowerCase() === spd.name.trim().toLowerCase())
    ).length;
  };

  const handleOpenAdd = () => {
    if (activeCategory === 'Kecepatan') {
      handleOpenAddSpeed();
      return;
    }
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

  const handleOpenAddSpeed = () => {
    setEditingSpeed(null);
    setSpeedName('');
    setSpeedDurationLabel('1 Hari');
    setSpeedDurationHours(24);
    setSpeedFee(8000);
    setIsSpeedModalOpen(true);
  };

  const handleOpenEditSpeed = (sp: SpeedItem) => {
    setEditingSpeed(sp);
    setSpeedName(sp.name);
    setSpeedDurationLabel(sp.durationLabel);
    setSpeedDurationHours(sp.durationHours);
    setSpeedFee(sp.fee);
    setIsSpeedModalOpen(true);
  };

  const handleSaveSpeedForm = () => {
    if (!speedName.trim() || !speedDurationLabel.trim() || speedDurationHours <= 0) {
      alert('Nama kecepatan, label durasi, dan estimasi jam harus diisi dengan benar!');
      return;
    }

    let nextSpeedId = editingSpeed?.id;
    if (!nextSpeedId) {
      let maxNum = 3;
      const existingIds = new Set(speedList.map((s) => s.id));
      for (const s of speedList) {
        const m = String(s.id || '').match(/^SPD-(\d+)$/i);
        if (m) {
          const n = parseInt(m[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      let candidateNum = maxNum + 1;
      nextSpeedId = `SPD-${String(candidateNum).padStart(2, '0')}`;
      while (existingIds.has(nextSpeedId)) {
        candidateNum++;
        nextSpeedId = `SPD-${String(candidateNum).padStart(2, '0')}`;
      }
    }

    const newSpeed: SpeedItem = {
      id: nextSpeedId,
      name: speedName.trim(),
      durationLabel: speedDurationLabel.trim(),
      durationHours: Math.max(1, Number(speedDurationHours) || 24),
      fee: Math.max(0, Number(speedFee) || 0),
    };

    if (onSaveSpeed) {
      onSaveSpeed(newSpeed);
    }
    if (activeCategory !== 'Semua' && activeCategory !== 'Kecepatan') {
      setActiveCategory('Kecepatan');
    }
    setIsSpeedModalOpen(false);
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
    <div className="space-y-3.5">
      {/* Category filter & Add button */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(['Semua', 'Kiloan', 'Satuan', 'Kecepatan'] as const).map((cat) => {
            const count =
              cat === 'Semua'
                ? services.length + speedList.length
                : cat === 'Kecepatan'
                ? speedList.length
                : services.filter((s) => s.category === cat).length;
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 ${
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
          className="min-h-[38px] flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition active:scale-95 shadow-sm shadow-blue-500/20 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {activeCategory === 'Kecepatan' ? 'Tambah Kecepatan' : 'Tambah'}
        </button>
      </div>

      {/* Tabel Data Kecepatan Pengerjaan (Relasi dengan Orders) */}
      {(activeCategory === 'Semua' || activeCategory === 'Kecepatan') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="font-bold text-xs text-slate-900">
                  Tabel Data Kecepatan Laundry
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Link2 className="w-2.5 h-2.5" />
                  Relasi Orders
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Data kecepatan terhubung langsung dengan Kasir POS &amp; Daftar Pesanan (Orders).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddSpeed}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] inline-flex items-center gap-1 transition active:scale-95 shrink-0 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kecepatan</span>
            </button>
          </div>

          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100/95 text-slate-600 border-b border-slate-200 text-[11px]">
                <tr>
                  <th scope="col" className="py-2.5 px-3 font-bold sticky left-0 bg-slate-100/95 z-10">
                    Kecepatan
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 font-bold">
                    Durasi
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 font-bold text-right">
                    Biaya
                  </th>
                  <th scope="col" className="py-2.5 px-2.5 font-bold text-center">
                    Order
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-bold text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {speedList.map((spd) => {
                  const linkedCount = getLinkedOrdersCount(spd);
                  const isExpress = spd.name.toLowerCase().includes('express');
                  const isKilat = spd.name.toLowerCase().includes('kilat');

                  return (
                    <tr key={spd.id} className="hover:bg-slate-50/80 transition">
                      <th
                        scope="row"
                        className="py-2.5 px-3 font-bold text-slate-900 sticky left-0 bg-white whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isKilat
                                ? 'bg-rose-500'
                                : isExpress
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <div>
                            <div className="text-xs font-extrabold text-slate-900">{spd.name}</div>
                            <div className="text-[10px] font-medium text-slate-400">{spd.id}</div>
                          </div>
                        </div>
                      </th>
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {spd.durationLabel}
                        </span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          ({spd.durationHours} jam)
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-bold">
                        <span className={spd.fee > 0 ? 'text-amber-700' : 'text-slate-600'}>
                          +{formatRupiah(spd.fee)}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            linkedCount > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {linkedCount} order
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSpeed(spd)}
                            aria-label={`Edit kecepatan ${spd.name}`}
                            className="min-w-[32px] min-h-[32px] p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition inline-flex items-center justify-center"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteSpeed && speedList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Yakin ingin menghapus kecepatan "${spd.name}"?${
                                      linkedCount > 0
                                        ? ` (${linkedCount} order terkait tetap menyimpan riwayat kecepatan ini)`
                                        : ''
                                    }`
                                  )
                                ) {
                                  onDeleteSpeed(spd.id);
                                }
                              }}
                              aria-label={`Hapus kecepatan ${spd.name}`}
                              className="min-w-[32px] min-h-[32px] p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition inline-flex items-center justify-center"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                      const val = e.target.value;
                      if (val === 'Kecepatan') {
                        setIsModalOpen(false);
                        handleOpenAddSpeed();
                        return;
                      }
                      const cat = val as ServiceCategory;
                      setCategory(cat);
                      setUnit(cat === 'Kiloan' ? 'kg' : 'pcs');
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl"
                  >
                    <option value="Kiloan">Kiloan</option>
                    <option value="Satuan">Satuan</option>
                    {!editingService && <option value="Kecepatan">Kecepatan Pengerjaan</option>}
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

      {/* Add / Edit Speed Modal (Tabel Kecepatan) */}
      {isSpeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                {editingSpeed ? `Edit Kecepatan (${editingSpeed.id})` : 'Tambah Data Kecepatan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsSpeedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kecepatan *</label>
                <input
                  type="text"
                  value={speedName}
                  onChange={(e) => setSpeedName(e.target.value)}
                  placeholder="Contoh: Normal / Express / Kilat / Super Kilat"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Label Durasi *</label>
                  <input
                    type="text"
                    value={speedDurationLabel}
                    onChange={(e) => setSpeedDurationLabel(e.target.value)}
                    placeholder="Contoh: 1 Hari / 8 Jam"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Estimasi Jam *</label>
                  <input
                    type="number"
                    min={1}
                    value={speedDurationHours}
                    onChange={(e) => setSpeedDurationHours(Number(e.target.value) || 0)}
                    placeholder="Contoh: 24"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Quick Duration Presets */}
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { label: '4 Jam', hours: 4 },
                  { label: '8 Jam', hours: 8 },
                  { label: '1 Hari', hours: 24 },
                  { label: '2 Hari', hours: 48 },
                  { label: '3 Hari', hours: 72 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setSpeedDurationLabel(preset.label);
                      setSpeedDurationHours(preset.hours);
                    }}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
                      speedDurationLabel === preset.label && speedDurationHours === preset.hours
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-amber-400'
                    }`}
                  >
                    {preset.label} ({preset.hours}j)
                  </button>
                ))}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Biaya Tambahan (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={speedFee}
                  onChange={(e) => setSpeedFee(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Contoh: 8000 (isi 0 untuk Normal)"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-amber-700"
                />
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-[11px] text-amber-900">
                <p className="font-bold">Info Relasi Order:</p>
                <p className="text-amber-800">
                  Kecepatan ini akan muncul otomatis di Kasir POS dan berelasi dengan tabel{' '}
                  <strong>Orders</strong> (menghitung estimasi selesai +{speedDurationHours || 0} jam dan biaya +{formatRupiah(speedFee)}).
                </p>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsSpeedModalOpen(false)}
                className="w-1/2 py-2.5 bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSpeedForm}
                className="w-1/2 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700"
              >
                Simpan Kecepatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
