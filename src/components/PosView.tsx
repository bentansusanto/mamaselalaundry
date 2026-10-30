'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Order, OrderItemDetail, PaymentMethod, PaymentStatus, ServiceItem, SpeedItem, UserAccount } from '@/types';
import { INITIAL_SPEEDS } from '@/lib/initialData';
import { calculateBilledWeight, formatRupiah, formatWeight, roundPaymentTotal } from '@/lib/utils';
import { getAllOrders } from '@/lib/db';
import { User, Scale, Zap, CreditCard, Plus, Minus, Search, Check, AlertCircle, Sparkles, Banknote, QrCode, Flame, Clock } from 'lucide-react';

interface PosViewProps {
  orders?: Order[];
  customers: Customer[];
  services: ServiceItem[];
  speeds?: SpeedItem[];
  currentUser: UserAccount;
  onOrderCreated: (order: Order) => void;
  onNewCustomer: (customer: Customer) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  orders,
  customers,
  services,
  speeds = INITIAL_SPEEDS,
  currentUser,
  onOrderCreated,
  onNewCustomer,
}) => {
  // Step state: 1. Pelanggan -> 2. Layanan & Berat -> 3. Kecepatan & Bayar
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Service Selection
  const kiloanServices = services.filter((s) => s.category === 'Kiloan');
  const satuanServices = services.filter((s) => s.category === 'Satuan');

  const [selectedKiloan, setSelectedKiloan] = useState<ServiceItem | null>(kiloanServices[0] || null);
  const [actualWeight, setActualWeight] = useState<number>(3.0);
  const [weightInputStr, setWeightInputStr] = useState<string>('3');
  const [satuanQuantities, setSatuanQuantities] = useState<Record<string, number>>({});

  // Keep selectedKiloan synchronized when services load or update asynchronously
  useEffect(() => {
    if (kiloanServices.length === 0) return;
    if (!selectedKiloan) {
      setSelectedKiloan(kiloanServices[0]);
      return;
    }
    const updatedMatch = kiloanServices.find((s) => s.id === selectedKiloan.id);
    if (updatedMatch) {
      if (
        updatedMatch.name !== selectedKiloan.name ||
        updatedMatch.price !== selectedKiloan.price ||
        updatedMatch.variant !== selectedKiloan.variant
      ) {
        setSelectedKiloan(updatedMatch);
      }
    } else {
      setSelectedKiloan(kiloanServices[0]);
    }
  }, [services]);

  const handleSelectKiloanService = (srv: ServiceItem) => {
    setSelectedKiloan(srv);
    if (actualWeight <= 0) {
      setActualWeight(3.0);
      setWeightInputStr('3');
    }
  };

  const handleWeightDelta = (delta: number) => {
    const nextVal = Math.max(0, Math.round((actualWeight + delta) * 10) / 10);
    setActualWeight(nextVal);
    setWeightInputStr(nextVal === 0 ? '' : formatWeight(nextVal));
    if (nextVal > 0 && !selectedKiloan && kiloanServices.length > 0) {
      setSelectedKiloan(kiloanServices[0]);
    }
  };

  const handleQuickWeight = (val: number) => {
    setActualWeight(val);
    setWeightInputStr(val === 0 ? '' : formatWeight(val));
    if (val > 0 && !selectedKiloan && kiloanServices.length > 0) {
      setSelectedKiloan(kiloanServices[0]);
    }
  };

  // Speed (Related to Tabel Kecepatan / speeds)
  const speedList = speeds && speeds.length > 0 ? speeds : INITIAL_SPEEDS;
  const [selectedSpeedId, setSelectedSpeedId] = useState<string>(speedList[0]?.id || 'SPD-01');

  useEffect(() => {
    if (speedList.length > 0 && !speedList.some((s) => s.id === selectedSpeedId)) {
      setSelectedSpeedId(speedList[0].id);
    }
  }, [speedList, selectedSpeedId]);

  const selectedSpeedObj: SpeedItem =
    speedList.find((s) => s.id === selectedSpeedId) || speedList[0] || INITIAL_SPEEDS[0];

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Lunas');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Calculations
  // Jika kecepatan memiliki tarif > 0 (misal Express / Kilat), maka tarif per kg menggunakan tarif kecepatan tersebut (Tarif Kecepatan x Berat).
  // Jika kecepatan Normal (fee === 0), maka menggunakan tarif layanan kiloan yang dipilih.
  const billedWeight = actualWeight > 0 ? calculateBilledWeight(actualWeight) : 0;
  const baseKiloanPricePerKg = selectedKiloan ? selectedKiloan.price : 0;
  const hasSpeedRateOverride = Boolean(selectedSpeedObj && selectedSpeedObj.fee > 0);
  const kiloanPricePerKg = hasSpeedRateOverride ? selectedSpeedObj.fee : baseKiloanPricePerKg;
  const mainServiceTotal = billedWeight * kiloanPricePerKg;

  const satuanItems: OrderItemDetail[] = Object.entries(satuanQuantities)
    .filter(([_, qty]) => qty > 0)
    .map(([serviceId, qty]) => {
      const srv = services.find((s) => s.id === serviceId);
      const price = srv ? srv.price : 0;
      const name = srv ? (srv.variant ? `${srv.name} (${srv.variant})` : srv.name) : 'Item';
      return {
        id: `ITM-${serviceId}-${Date.now()}`,
        serviceId,
        name,
        variant: srv?.variant,
        unit: srv?.unit || 'pcs',
        qty,
        price,
        total: price * qty,
      };
    });

  const itemsTotal = satuanItems.reduce((acc, curr) => acc + curr.total, 0);
  // Biaya kecepatan tidak ditambahkan lagi jika sudah dikalikan dengan berat kiloan (billedWeight > 0)
  const speedFee = billedWeight > 0 ? 0 : selectedSpeedObj ? selectedSpeedObj.fee : 0;
  const rawGrandTotal = mainServiceTotal + itemsTotal + speedFee;
  const grandTotal = roundPaymentTotal(rawGrandTotal);
  const roundingAdjustment = grandTotal - rawGrandTotal;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
  );

  const handleCreateCustomer = () => {
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    const newCust: Customer = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      address: newCustAddress.trim() || '-',
      createdAt: new Date().toISOString(),
    };
    onNewCustomer(newCust);
    setSelectedCustomer(newCust);
    setIsAddingCustomer(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustAddress('');
  };

  const handleUpdateSatuanQty = (serviceId: string, delta: number) => {
    setSatuanQuantities((prev) => {
      const current = prev[serviceId] || 0;
      const updated = Math.max(0, current + delta);
      return { ...prev, [serviceId]: updated };
    });
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer) {
      alert('Pilih pelanggan terlebih dahulu!');
      setStep(1);
      return;
    }
    if (actualWeight <= 0 && satuanItems.length === 0) {
      alert('Masukkan berat pakaian atau pilih minimal satu item satuan!');
      setStep(2);
      return;
    }

    const now = new Date();
    // Estimasi selesai berdasarkan relasi Tabel Kecepatan (speeds.durationHours)
    const hoursToAdd = selectedSpeedObj?.durationHours || 48;
    const estimatedDate = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();

    // Determine auto-increment number: ORD-001-dd-mm-yyyy, ORD-002-dd-mm-yyyy, etc.
    let existingOrders = orders && orders.length > 0 ? orders : await getAllOrders();
    let maxNumber = 0;
    for (const o of existingOrders) {
      const match = o.id.match(/^ORD-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    const nextNumber = maxNumber + 1;
    const seqStr = String(nextNumber).padStart(3, '0');
    const orderId = `ORD-${seqStr}-${dd}-${mm}-${yyyy}`;

    const newOrder: Order = {
      id: orderId,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      createdAt: now.toISOString(),
      estimatedCompletion: estimatedDate.toISOString(),
      mainService: actualWeight > 0 && selectedKiloan ? selectedKiloan.name : 'Satuan Saja',
      speedId: selectedSpeedObj.id,
      speed: selectedSpeedObj.name,
      speedFee,
      speedDuration: selectedSpeedObj.durationLabel,
      actualWeight,
      billedWeight,
      items: satuanItems,
      mainServiceTotal,
      itemsTotal,
      totalPrice: grandTotal,
      paymentStatus,
      paymentMethod,
      paymentDate: paymentStatus === 'Lunas' ? now.toISOString() : undefined,
      progressStatus: 'Proses',
      notes,
      cashierName: currentUser.name,
      syncedToSheets: false,
    };

    onOrderCreated(newOrder);

    // Reset form
    setStep(1);
    setSelectedCustomer(null);
    setActualWeight(3.0);
    setWeightInputStr('3');
    setSatuanQuantities({});
    setSelectedSpeedId(speedList[0]?.id || 'SPD-01');
    setPaymentStatus('Lunas');
    setNotes('');
    setCashGiven('');
  };

  return (
    <div className="space-y-4">
      {/* Stepper Indicator */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-0.5 bg-slate-200 -z-0" />
          <button
            onClick={() => setStep(1)}
            className={`flex flex-col items-center gap-1 z-10 transition ${
              step >= 1 ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 1
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : step > 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              1
            </div>
            <span className="text-[10px] font-semibold">Pelanggan</span>
          </button>

          <button
            onClick={() => selectedCustomer && setStep(2)}
            className={`flex flex-col items-center gap-1 z-10 transition ${
              step >= 2 ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 2
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : step > 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              2
            </div>
            <span className="text-[10px] font-semibold">Layanan</span>
          </button>

          <button
            onClick={() => selectedCustomer && setStep(3)}
            className={`flex flex-col items-center gap-1 z-10 transition ${
              step === 3 ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 3
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              3
            </div>
            <span className="text-[10px] font-semibold">Bayar</span>
          </button>
        </div>
      </div>

      {/* STEP 1: PILIH PELANGGAN */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              Langkah 1: Pilih Pelanggan
            </h2>
            <button
              onClick={() => setIsAddingCustomer(!isAddingCustomer)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {isAddingCustomer ? 'Batal' : '+ Pelanggan Baru'}
            </button>
          </div>

          {/* Add Customer Form */}
          {isAddingCustomer && (
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-blue-900">Tambah Pelanggan Cepat</p>
              <input
                type="text"
                placeholder="Nama Lengkap *"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="Nomor Telepon / WhatsApp *"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Alamat (opsional)"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleCreateCustomer}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
              >
                Simpan & Pilih Pelanggan
              </button>
            </div>
          )}

          {/* Search Customer */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau no. telepon..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Customer List */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer?.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                    <p className="text-[11px] text-slate-500">{cust.phone}</p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            disabled={!selectedCustomer}
            onClick={() => setStep(2)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition shadow-sm shadow-blue-500/20"
          >
            Lanjut ke Pilih Layanan →
          </button>
        </div>
      )}

      {/* STEP 2: PILIH LAYANAN & TIMBANG */}
      {step === 2 && (
        <div className="space-y-3">
          {/* Selected Customer Pill */}
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Pelanggan: </span>
              <span className="font-bold text-blue-900">{selectedCustomer?.name}</span>
              <span className="text-slate-400 text-[11px]"> ({selectedCustomer?.phone})</span>
            </div>
            <button
              onClick={() => setStep(1)}
              className="text-[11px] text-blue-600 underline font-semibold"
            >
              Ubah
            </button>
          </div>

          {/* Layanan Kiloan */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-blue-600" />
              1. Layanan Kiloan
            </h3>

            {/* Service selector */}
            <div className="grid grid-cols-3 gap-2">
              {kiloanServices.map((srv) => {
                const isSelected = actualWeight > 0 && selectedKiloan?.id === srv.id;
                return (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleSelectKiloanService(srv)}
                    className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-2 ring-blue-500/15'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px] leading-tight">
                      {srv.name}
                      {srv.variant ? ` (${srv.variant})` : ''}
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold mt-1">
                      {formatRupiah(srv.price)}/kg
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Weight Input */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">Timbangan Berat (Kg):</span>
                <span className="text-base font-extrabold text-blue-600">{formatWeight(actualWeight)} kg</span>
              </div>

              {/* Counter buttons */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleWeightDelta(-0.5)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  value={weightInputStr}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '' || /^\d*[,.]?\d*$/.test(raw)) {
                      setWeightInputStr(raw);
                      const normalized = raw.replace(',', '.');
                      const num = parseFloat(normalized);
                      const validNum = isNaN(num) ? 0 : num;
                      setActualWeight(validNum);
                      if (validNum > 0 && !selectedKiloan && kiloanServices.length > 0) {
                        setSelectedKiloan(kiloanServices[0]);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (actualWeight > 0) {
                      setWeightInputStr(formatWeight(actualWeight));
                    } else {
                      setWeightInputStr('');
                    }
                  }}
                  placeholder="0,0"
                  className="flex-1 text-center font-bold text-sm py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleWeightDelta(0.5)}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Quick weight pills */}
              <div className="flex gap-1.5 justify-center flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => handleQuickWeight(0)}
                  className={`px-2 py-0.5 text-[11px] border rounded-lg transition ${
                    actualWeight === 0
                      ? 'bg-slate-800 text-white border-slate-800 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}
                >
                  Tanpa Kiloan (0 kg)
                </button>
                {[1, 2, 3, 5, 7].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleQuickWeight(w)}
                    className={`px-2 py-0.5 text-[11px] border rounded-lg transition ${
                      actualWeight === w
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
                    }`}
                  >
                    {w} kg
                  </button>
                ))}
              </div>

              {/* Minimum Weight Rule Warning / Info */}
              {actualWeight > 0 && actualWeight < 3 && (
                <div className="flex items-start gap-1.5 p-2 bg-yellow-50 border border-yellow-300 rounded-lg text-[11px] text-yellow-800">
                  <AlertCircle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Ketentuan Berat Minimum: </span>
                    Berat {formatWeight(actualWeight)} kg dihitung tarif setara minimum{' '}
                    <span className="font-bold text-yellow-900">3,0 kg</span> (
                    {formatRupiah(3 * kiloanPricePerKg)})
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Layanan Satuan */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              2. Layanan Satuan (Bedcover & Selimut)
            </h3>

            <div className="space-y-1.5">
              {satuanServices.map((item) => {
                const qty = satuanQuantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {item.name} {item.variant ? `(${item.variant})` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">{formatRupiah(item.price)}/pcs</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateSatuanQty(item.id, -1)}
                        disabled={qty === 0}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 disabled:opacity-30 active:scale-95"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold text-xs">{qty}</span>
                      <button
                        onClick={() => handleUpdateSatuanQty(item.id, 1)}
                        className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Kecepatan Pengerjaan (Dinamis dari Tabel Kecepatan) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              3. Kecepatan Pengerjaan
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {speedList.map((spd) => {
                const isSelected = selectedSpeedObj?.id === spd.id;
                const lowerName = spd.name.toLowerCase();
                const isExpress = lowerName.includes('express');
                const isKilat = lowerName.includes('kilat');

                const activeClass = isKilat
                  ? 'border-green-500 bg-green-50 text-green-900 ring-2 ring-green-500/20'
                  : isExpress
                  ? 'border-yellow-500 bg-yellow-50 text-yellow-900 ring-2 ring-yellow-500/20'
                  : 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20';

                const titleColor = isKilat
                  ? 'text-green-800'
                  : isExpress
                  ? 'text-yellow-800'
                  : 'text-slate-900';

                const feeColor = isKilat
                  ? 'text-green-700'
                  : isExpress
                  ? 'text-yellow-700'
                  : 'text-blue-600';

                return (
                  <button
                    key={spd.id}
                    type="button"
                    onClick={() => setSelectedSpeedId(spd.id)}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center ${
                      isSelected ? activeClass : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs font-bold ${titleColor}`}>{spd.name}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">{spd.durationLabel}</span>
                    <span className={`text-[11px] font-semibold mt-1 ${feeColor}`}>
                      {spd.fee > 0
                        ? `${formatRupiah(spd.fee)}/kg`
                        : `${formatRupiah(baseKiloanPricePerKg)}/kg`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Ringkasan Pilihan (Kiloan + Satuan + Kecepatan) */}
          {(actualWeight > 0 || satuanItems.length > 0) && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 space-y-1.5 text-xs">
              <p className="font-bold text-blue-900 text-[11px] uppercase tracking-wide">
                Ringkasan Layanan Terpilih:
              </p>
              {actualWeight > 0 && selectedKiloan && (
                <div className="flex justify-between text-slate-700 font-medium">
                  <span>
                    • Kiloan: <strong className="text-slate-900">{selectedKiloan.name}</strong> (
                    {formatWeight(actualWeight)} kg
                    {billedWeight !== actualWeight ? ` → min ${formatWeight(billedWeight)} kg` : ''} ×{' '}
                    {formatRupiah(kiloanPricePerKg)}/kg)
                  </span>
                  <span className="font-bold text-slate-900">{formatRupiah(mainServiceTotal)}</span>
                </div>
              )}
              {satuanItems.map((itm) => (
                <div key={itm.serviceId} className="flex justify-between text-slate-700 font-medium">
                  <span>
                    • Satuan: <strong className="text-slate-900">{itm.name}</strong> ×{itm.qty}
                  </span>
                  <span className="font-bold text-slate-900">{formatRupiah(itm.total)}</span>
                </div>
              ))}
              <div className="flex justify-between text-slate-700 font-medium pt-0.5 border-t border-blue-200/60">
                <span>
                  • Kecepatan: <strong className="text-slate-900">{selectedSpeedObj.name}</strong> (
                  {selectedSpeedObj.durationLabel})
                </span>
                <span className="font-bold text-slate-900">
                  {actualWeight > 0
                    ? `${formatRupiah(kiloanPricePerKg)}/kg`
                    : speedFee > 0
                    ? `+${formatRupiah(speedFee)}`
                    : 'Tarif Normal'}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition shadow-sm shadow-blue-500/20"
            >
              Proses Sekarang ({formatRupiah(grandTotal)}) →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PEMBAYARAN */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Langkah 3: Pembayaran
            </h2>
          </div>

          {/* Ringkasan Biaya */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            {actualWeight > 0 && selectedKiloan && (
              <div className="flex justify-between text-slate-600">
                <span>
                  {selectedKiloan.name} — {selectedSpeedObj.name} ({formatWeight(actualWeight)} kg
                  {billedWeight !== actualWeight ? ` / min ${formatWeight(billedWeight)} kg` : ''} ×{' '}
                  {formatRupiah(kiloanPricePerKg)}/kg):
                </span>
                <span className="font-bold text-slate-900">{formatRupiah(mainServiceTotal)}</span>
              </div>
            )}
            {satuanItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-slate-600 text-[11px]">
                <span>
                  {item.name} ({item.qty}x):
                </span>
                <span>{formatRupiah(item.total)}</span>
              </div>
            ))}
            <div className="flex justify-between text-slate-600">
              <span>
                Kecepatan ({selectedSpeedObj.name} • {selectedSpeedObj.durationLabel}):
              </span>
              <span>
                {actualWeight > 0
                  ? `Tarif ${formatRupiah(kiloanPricePerKg)}/kg`
                  : speedFee > 0
                  ? `+${formatRupiah(speedFee)}`
                  : 'Standar (Rp 0)'}
              </span>
            </div>
            {roundingAdjustment !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Pembulatan:</span>
                <span className={roundingAdjustment > 0 ? 'text-blue-600 font-semibold' : 'text-slate-600 font-semibold'}>
                  {roundingAdjustment > 0 ? `+${formatRupiah(roundingAdjustment)}` : formatRupiah(roundingAdjustment)}
                </span>
              </div>
            )}
            <div className="border-t border-slate-300 pt-1.5 flex justify-between font-extrabold text-sm text-slate-900">
              <span>Total Tagihan:</span>
              <span className="text-blue-600">{formatRupiah(grandTotal)}</span>
            </div>
          </div>

          {/* Opsi Pembayaran */}
          <div className="space-y-3">
            {/* Status Bayar Toggle */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Waktu Pembayaran:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentStatus('Lunas')}
                  className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                    paymentStatus === 'Lunas'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Langsung Bayar (Lunas)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentStatus('Belum Bayar')}
                  className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                    paymentStatus === 'Belum Bayar'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Bayar Nanti (Ambil)</span>
                </button>
              </div>
            </div>

            {/* Metode Pembayaran */}
            {paymentStatus === 'Lunas' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Metode Pembayaran:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'Cash'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Tunai (Cash)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'QRIS'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS</span>
                  </button>
                </div>

                {paymentMethod === 'Cash' ? (
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Uang Diterima:
                    </label>
                    <input
                      type="number"
                      placeholder={`Contoh: ${grandTotal}`}
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                    {parseFloat(cashGiven) >= grandTotal && (
                      <div className="flex justify-between text-xs font-bold text-green-700 pt-1">
                        <span>Kembalian:</span>
                        <span>{formatRupiah(parseFloat(cashGiven) - grandTotal)}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                    <div className="w-24 h-24 mx-auto bg-white border border-slate-300 rounded-lg flex flex-col items-center justify-center font-bold text-xs text-slate-700 shadow-inner">
                      <QrCode className="w-10 h-10 text-slate-800" />
                      <span className="text-[9px] font-bold text-slate-600 mt-0.5">QRIS KASIR</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600">Scan QRIS Kasir Mama Sela</p>
                  </div>
                )}
              </div>
            )}

            {/* Catatan Order */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Pakaian (Opsional):</label>
              <input
                type="text"
                placeholder="Contoh: Pisahkan baju putih, wangi lavender..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setStep(2)}
              className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              ← Kembali
            </button>
            <button
              onClick={handleSubmitOrder}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-500/20 active:scale-98"
            >
              Simpan & Buat Struk ({formatRupiah(grandTotal)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
