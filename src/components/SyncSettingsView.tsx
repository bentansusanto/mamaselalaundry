'use client';

import React, { useState } from 'react';
import { Cloud, Check, RefreshCw, Database, ShieldCheck, Zap, Download } from 'lucide-react';

interface SyncSettingsViewProps {
  isSyncing: boolean;
  onRefreshData: () => Promise<void>;
  ordersCount: number;
  customersCount: number;
  servicesCount: number;
  onResetData: () => void;
}

export const SyncSettingsView: React.FC<SyncSettingsViewProps> = ({
  isSyncing,
  onRefreshData,
  ordersCount,
  customersCount,
  servicesCount,
  onResetData,
}) => {
  const [refreshedSuccess, setRefreshedSuccess] = useState(false);

  const handleManualRefresh = async () => {
    await onRefreshData();
    setRefreshedSuccess(true);
    setTimeout(() => setRefreshedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Supabase Cloud Status Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5 fill-emerald-500 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-xs text-slate-900">Supabase Cloud Database</h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Realtime Aktif
                </span>
              </div>
              <p className="text-[10px] text-slate-400">PostgreSQL Cloud + WebSocket Realtime (&lt; 100ms)</p>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-sm shadow-blue-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Memuat...' : 'Tarik Data'}
          </button>
        </div>

        {refreshedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            Data berhasil disinkronkan dengan Supabase Cloud!
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Koneksi Database:</span>
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              qlcrjmycgfcswwqphgyv.supabase.co
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Mode Sinkronisasi:</span>
            <span className="font-bold text-emerald-600">Otomatis 2 Arah (HP &amp; Laptop)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Kecepatan Replikasi:</span>
            <span className="font-semibold text-slate-800">Instan / Realtime (&lt; 100ms)</span>
          </div>
        </div>

        {/* Data Counter */}
        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
            <div className="text-lg font-black text-blue-700">{ordersCount}</div>
            <div className="text-[10px] font-semibold text-blue-600">Pesanan</div>
          </div>
          <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
            <div className="text-lg font-black text-purple-700">{customersCount}</div>
            <div className="text-[10px] font-semibold text-purple-600">Pelanggan</div>
          </div>
          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
            <div className="text-lg font-black text-emerald-700">{servicesCount}</div>
            <div className="text-[10px] font-semibold text-emerald-600">Layanan</div>
          </div>
        </div>
      </div>

      {/* Offline First Information Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs">
        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          Offline First &amp; Keamanan Data
        </h3>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Semua data tersimpan ganda di <b>Supabase Cloud</b> dan di memori lokal <b>IndexedDB perangkat</b>. Jika kasir sedang offline / mati internet, aplikasi tetap dapat membuat nota secara lancar dan otomatis tersinkronisasi begitu internet kembali online.
        </p>
      </div>

      {/* Reset Cache / Maintenance */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-800 text-xs">Reset Cache Lokal</h4>
            <p className="text-[10px] text-slate-400">Kembalikan data lokal ke data awal demo</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin mereset database lokal ke data demo?')) {
                onResetData();
              }
            }}
            className="text-[11px] text-red-500 hover:text-red-700 font-semibold px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition"
          >
            Reset Data Demo
          </button>
        </div>
      </div>
    </div>
  );
};
