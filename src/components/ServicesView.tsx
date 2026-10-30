'use client';

import React, { useState } from 'react';
import { Order, ServiceCategory, ServiceItem, SpeedItem, UnitType, VariantSize } from '@/types';
import { INITIAL_SPEEDS } from '@/lib/initialData';
import {
  calculateProfitMargin,
  formatRupiah,
  getKiloanPricePerKg,
  normalizeSpeedTariffs,
} from '@/lib/utils';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  X,
  Zap,
  Clock,
  Link2,
  Search,
  Scale,
  Package,
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Speed Modal states
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);
  const [editingSpeed, setEditingSpeed] = useState<SpeedItem | null>(null);
  const [speedName, setSpeedName] = useState('');
  const [speedDurationLabel, setSpeedDurationLabel] = useState('1 Hari');
  const [speedDurationHours, setSpeedDurationHours] = useState<number>(24);
  const [speedFee, setSpeedFee] = useState<number>(10000);
  const [speedFeeSecondary, setSpeedFeeSecondary] = useState<number>(6000);

  // Service Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('Kiloan');
  const [variant, setVariant] = useState<VariantSize | ''>('');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [price, setPrice] = useState<number>(6000);
  const [hpp, setHpp] = useState<number>(2500);

  const profitRp = Math.max(0, price - hpp);
  const profitMarginPercent = calculateProfitMargin(price, hpp);

  const q = searchQuery.trim().toLowerCase();

  const speedList = (speeds && speeds.length > 0 ? speeds : INITIAL_SPEEDS).map(normalizeSpeedTariffs);
  const filteredSpeeds = speedList.filter(
    (sp) =>
      !q ||
      sp.name.toLowerCase().includes(q) ||
      sp.id.toLowerCase().includes(q) ||
      sp.durationLabel.toLowerCase().includes(q)
  );

  const filtered =
    activeCategory === 'Kecepatan'
      ? []
      : services.filter((s) => {
          const matchesCat = activeCategory === 'Semua' ? true : s.category === activeCategory;
          const fullName = `${s.name} ${s.variant || ''}`.toLowerCase();
          const matchesSearch =
            !q ||
            fullName.includes(q) ||
            s.id.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q);
          return matchesCat && matchesSearch;
        });

  const getLinkedOrdersCount = (spd: SpeedItem): number => {
    return (orders || []).filter(
      (o) =>
        o.speedId === spd.id ||
        (!o.speedId && String(o.speed || '').trim().toLowerCase() === spd.name.trim().toLowerCase())
    ).length;
  };

  const handleOpenAddService = (defaultCategory?: ServiceCategory) => {
    setEditingService(null);
    setName('');
    const defaultCat: ServiceCategory =
      defaultCategory || (activeCategory === 'Satuan' ? 'Satuan' : 'Kiloan');
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
    setSpeedFee(10000);
    setSpeedFeeSecondary(6000);
    setIsSpeedModalOpen(true);
  };

  const handleOpenEditSpeed = (sp: SpeedItem) => {
    const norm = normalizeSpeedTariffs(sp);
    setEditingSpeed(norm);
    setSpeedName(norm.name);
    setSpeedDurationLabel(norm.durationLabel);
    setSpeedDurationHours(norm.durationHours);
    setSpeedFee(norm.fee);
    setSpeedFeeSecondary(norm.feeSecondary ?? norm.fee);
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

    const primaryFee = Math.max(0, Number(speedFee) || 0);
    const secondaryFee =
      primaryFee === 0 ? 0 : Math.max(0, Number(speedFeeSecondary) || primaryFee);

    const newSpeed: SpeedItem = {
      id: nextSpeedId,
      name: speedName.trim(),
      durationLabel: speedDurationLabel.trim(),
      durationHours: Math.max(1, Number(speedDurationHours) || 24),
      fee: primaryFee,
      feeSecondary: secondaryFee,
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
      {/* Top Control Card: Header, Quick Actions, Search & 4-Column Segmented Tabs */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-3">
        {/* Header & Quick Add Actions */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Sparkles aria-hidden="true" className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Manajemen Layanan &amp; Tarif</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {services.length} layanan cuci &amp; {speedList.length} opsi kecepatan aktif
            </p>
          </div>
        </div>

        {/* Dual Action Bar: Tambah Layanan & Tambah Kecepatan */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleOpenAddService()}
            className="min-h-[42px] px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-sm shadow-blue-500/20 inline-flex items-center justify-center gap-1.5"
          >
            <Plus aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>Tambah Layanan</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddSpeed}
            className="min-h-[42px] px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-sm shadow-amber-500/20 inline-flex items-center justify-center gap-1.5"
          >
            <Zap aria-hidden="true" className="w-4 h-4 shrink-0 fill-white" />
            <span>Tambah Kecepatan</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            aria-hidden="true"
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
          />
          <input
            type="text"
            aria-label="Cari nama layanan atau kecepatan"
            placeholder="Cari layanan kiloan, satuan, atau kecepatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[40px] pl-10 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[30px] min-h-[30px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4-Column Segmented Filter Tabs (Never wraps awkwardly) */}
        <div className="grid grid-cols-4 gap-1.5">
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
                className={`min-h-[40px] px-1.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition flex items-center justify-center gap-1 active:scale-95 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="truncate">{cat}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none font-extrabold shrink-0 ${
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

      {/* SECTION 1: Tabel Data Kecepatan Pengerjaan (Fit-to-width, Zero Horizontal Scroll!) */}
      {(activeCategory === 'Semua' || activeCategory === 'Kecepatan') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-amber-50/90 to-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Zap aria-hidden="true" className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                <h3 className="font-bold text-xs text-slate-900 truncate">
                  Tabel Kecepatan Pengerjaan
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Berelasi langsung dengan estimasi waktu &amp; tarif di Pesanan (Orders)
              </p>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
              <Link2 aria-hidden="true" className="w-3 h-3" />
              <span>Relasi Orders</span>
            </span>
          </div>

          {filteredSpeeds.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Tidak ada data kecepatan yang cocok dengan pencarian.
            </div>
          ) : (
            <table className="w-full table-fixed text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase tracking-wider">
                <tr>
                  <th scope="col" className="w-[42%] py-2.5 pl-4 pr-2 font-bold">
                    Kecepatan &amp; Durasi
                  </th>
                  <th scope="col" className="w-[32%] py-2.5 px-2 font-bold text-right">
                    Tarif / Kg &amp; Order
                  </th>
                  <th scope="col" className="w-[26%] py-2.5 pl-2 pr-4 font-bold text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSpeeds.map((spd) => {
                  const linkedCount = getLinkedOrdersCount(spd);
                  const lower = spd.name.toLowerCase();
                  const isExpress = lower.includes('express');
                  const isKilat = lower.includes('kilat');

                  return (
                    <tr key={spd.id} className="hover:bg-slate-50/80 transition">
                      {/* Column 1: Speed Name, ID & Duration */}
                      <th scope="row" className="py-3 pl-4 pr-2 font-normal align-middle">
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                              isKilat
                                ? 'bg-rose-500'
                                : isExpress
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                          />
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900">
                                {spd.name}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                #{spd.id}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              <Clock aria-hidden="true" className="w-3 h-3 text-slate-400" />
                              {spd.durationLabel} ({spd.durationHours} jam)
                            </span>
                          </div>
                        </div>
                      </th>

                      {/* Column 2: Per-Kg Rate & Linked Orders Count */}
                      <td className="py-3 px-2 text-right align-middle">
                        <div className="space-y-1">
                          {spd.fee > 0 ? (
                            <div className="space-y-0.5 leading-tight">
                              <div className="text-[11px] font-extrabold text-amber-700">
                                CS: {formatRupiah(spd.fee)}/kg
                              </div>
                              <div className="text-[10px] font-bold text-slate-600">
                                Setrika/Lipat: {formatRupiah(spd.feeSecondary || spd.fee)}/kg
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs font-extrabold text-slate-600">
                              Harga Normal
                            </div>
                          )}
                          <div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                linkedCount > 0
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {linkedCount} order
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Accessible Action Buttons (Never clipped) */}
                      <td className="py-3 pl-2 pr-4 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSpeed(spd)}
                            aria-label={`Edit kecepatan ${spd.name}`}
                            className="min-w-[36px] min-h-[36px] p-2 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-600 hover:bg-blue-100 transition inline-flex items-center justify-center active:scale-95"
                          >
                            <Edit2 aria-hidden="true" className="w-3.5 h-3.5" />
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
                              className="min-w-[36px] min-h-[36px] p-2 rounded-xl border border-red-200 bg-white text-red-500 hover:bg-red-50 transition inline-flex items-center justify-center active:scale-95"
                            >
                              <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* SECTION 2: Daftar Layanan Kiloan & Satuan */}
      {activeCategory !== 'Kecepatan' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              {activeCategory === 'Semua'
                ? `Daftar Layanan Cuci (${filtered.length})`
                : `Layanan Kategori ${activeCategory} (${filtered.length})`}
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 space-y-1.5">
              <Package aria-hidden="true" className="w-9 h-9 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-600">Tidak ada layanan ditemukan</p>
              <p className="text-[11px]">Silakan tambah layanan baru atau ubah kata kunci pencarian</p>
            </div>
          ) : (
            filtered.map((item) => {
              const itemProfit = Math.max(0, item.price - item.hpp);
              const isHighMargin = item.profitMarginPercent >= 50;
              const isKiloan = item.category === 'Kiloan';
              const borderAccent = isKiloan ? 'border-l-blue-500' : 'border-l-indigo-500';

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border border-slate-200 border-l-4 ${borderAccent} shadow-sm space-y-3 transition hover:border-slate-300`}
                >
                  {/* Top Row: Name, Variant, Category Badge & Price */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {item.name}
                        </h4>
                        {item.variant && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-extrabold text-[10px]">
                            Ukuran {item.variant}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-400">
                          #{item.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            isKiloan
                              ? 'bg-blue-50 text-blue-700 border-blue-200/70'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200/70'
                          }`}
                        >
                          {isKiloan ? (
                            <Scale aria-hidden="true" className="w-3 h-3" />
                          ) : (
                            <Sparkles aria-hidden="true" className="w-3 h-3" />
                          )}
                          <span>
                            {item.category} ({item.unit})
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                        Tarif Jual
                      </span>
                      <p className="font-black text-base text-blue-600">
                        {formatRupiah(item.price)}
                        <span className="text-[11px] text-slate-400 font-semibold">
                          /{item.unit}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Middle Financial Box: Harga Jual, HPP, Profit */}
                  <div className="bg-slate-50/90 rounded-xl p-2.5 border border-slate-100 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Harga Jual
                      </span>
                      <span className="text-xs font-extrabold text-slate-800">
                        {formatRupiah(item.price)}
                      </span>
                    </div>
                    <div className="border-x border-slate-200/70 px-1">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        HPP (Modal)
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {formatRupiah(item.hpp)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Profit ({item.profitMarginPercent}%)
                      </span>
                      <span
                        className={`text-xs font-extrabold ${
                          isHighMargin ? 'text-emerald-600' : 'text-amber-700'
                        }`}
                      >
                        +{formatRupiah(itemProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Speed Rates Breakdown for Kiloan Services */}
                  {isKiloan && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {speedList.map((spd) => {
                        const rate = getKiloanPricePerKg(item, spd);
                        const lowerSpd = spd.name.toLowerCase();
                        const isKilat = lowerSpd.includes('kilat');
                        const isExpress = lowerSpd.includes('express');
                        return (
                          <span
                            key={spd.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                              isKilat
                                ? 'bg-rose-50 text-rose-800 border-rose-200/80'
                                : isExpress
                                ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{spd.name}:</span>
                            <strong className="font-extrabold">{formatRupiah(rate)}/kg</strong>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Action Buttons: Large Touch Targets & Safe Spacing */}
                  <div className="pt-0.5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus layanan ${item.name}?`)) {
                          onDeleteService(item.id);
                        }
                      }}
                      aria-label={`Hapus layanan ${item.name}`}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                    >
                      <Trash2 aria-hidden="true" className="w-3.5 h-3.5 text-red-500" />
                      <span>Hapus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      aria-label={`Edit layanan ${item.name}`}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-bold text-xs transition active:scale-95 inline-flex items-center justify-center gap-1.5"
                    >
                      <Edit2 aria-hidden="true" className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Layanan</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tarif Cuci Setrika / Kg (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={speedFee}
                    onChange={(e) => setSpeedFee(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Contoh: 10000 / 15000"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tarif Setrika &amp; Lipat / Kg (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={speedFeeSecondary}
                    onChange={(e) => setSpeedFeeSecondary(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Contoh: 6000 / 9000"
                    className="w-full px-3 py-2 bg-slate-50 border rounded-xl font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-[11px] text-amber-900">
                <p className="font-bold">Rumus Perhitungan di Kasir POS &amp; Orders:</p>
                <p className="text-amber-800">
                  {speedFee > 0 ? (
                    <>
                      • <strong>Cuci Setrika</strong>: {formatRupiah(speedFee)} × Berat Pakaian (Kg)
                      <br />• <strong>Setrika &amp; Cuci Lipat</strong>:{' '}
                      {formatRupiah(speedFeeSecondary || speedFee)} × Berat Pakaian (Kg)
                    </>
                  ) : (
                    <>
                      Tarif Rp 0 berarti mengikuti <strong>Harga Normal Layanan Kiloan × Berat Pakaian (Kg)</strong> dengan estimasi selesai +{speedDurationHours || 0} jam.
                    </>
                  )}
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
