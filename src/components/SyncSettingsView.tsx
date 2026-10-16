'use client';

import React, { useState } from 'react';
import { Check, RefreshCw, Database, Zap, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getAllCustomers, getAllOrders, getAllServices } from '@/lib/db';

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
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja');
  const [isExporting, setIsExporting] = useState(false);

  const handleManualRefresh = async () => {
    await onRefreshData();
    const now = new Date();
    setLastSyncTime(
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    setRefreshedSuccess(true);
    setTimeout(() => setRefreshedSuccess(false), 2500);
  };

  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const [orders, customers, services] = await Promise.all([
        getAllOrders(),
        getAllCustomers(),
        getAllServices(),
      ]);

      const backupData = {
        exportedAt: new Date().toISOString(),
        appName: 'Mama Sela Laundry',
        version: '1.0',
        summary: {
          totalOrders: orders.length,
          totalCustomers: customers.length,
          totalServices: services.length,
        },
        data: {
          orders,
          customers,
          services,
        },
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-mamasela-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengekspor data cadangan');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Realtime Status Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Zap className="w-5 h-5 fill-emerald-500 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">Sinkronisasi Realtime</h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Terhubung otomatis di semua perangkat kasir (HP &amp; Laptop).
              </p>
            </div>
          </div>
        </div>

        {/* Action Button & Sync Status */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Terakhir dicek:{' '}
            <span className="font-semibold text-slate-700">{lastSyncTime}</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
          </button>
        </div>

        {refreshedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-medium animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Semua data berhasil diperbarui &amp; sinkron dengan cloud!</span>
          </div>
        )}

        {/* Live Counters */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="bg-slate-50 hover:bg-blue-50/50 transition p-3 rounded-xl border border-slate-200/70 text-center">
            <div className="text-xl font-black text-slate-900">{ordersCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Pesanan</div>
          </div>
          <div className="bg-slate-50 hover:bg-purple-50/50 transition p-3 rounded-xl border border-slate-200/70 text-center">
            <div className="text-xl font-black text-slate-900">{customersCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Pelanggan</div>
          </div>
          <div className="bg-slate-50 hover:bg-emerald-50/50 transition p-3 rounded-xl border border-slate-200/70 text-center">
            <div className="text-xl font-black text-slate-900">{servicesCount}</div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">Layanan</div>
          </div>
        </div>
      </div>

      {/* Backup & Offline Protection Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-slate-900">Cadangan &amp; Keamanan Data</h4>
            <p className="text-[11px] text-slate-500">
              Data tersimpan ganda secara otomatis di cloud dan memori perangkat.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
          Saat internet offline, kasir tetap dapat membuat nota dan transaksi seperti biasa tanpa gangguan. Begitu koneksi internet kembali online, data akan langsung otomatis tersinkronisasi.
        </p>

        <button
          onClick={handleExportBackup}
          disabled={isExporting}
          className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>{isExporting ? 'Mengekspor...' : 'Unduh Cadangan Data (Backup JSON)'}</span>
        </button>
      </div>

      {/* Maintenance / Reset Cache */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-slate-800 text-xs">Reset Data Demo</h4>
            <p className="text-[10px] text-slate-400">Kembalikan memori lokal ke data awal demo</p>
          </div>
          <button
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin mereset database lokal ke data demo?')) {
                onResetData();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
