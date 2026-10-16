'use client';

import React, { useState } from 'react';
import { SheetsConfig, SyncQueueItem } from '@/types';
import { GOOGLE_APPS_SCRIPT_TEMPLATE } from '@/lib/sheetsSync';
import { formatDateTime } from '@/lib/utils';
import { Cloud, Check, Copy, RefreshCw, Database, Download, Upload, ExternalLink } from 'lucide-react';

interface SyncSettingsViewProps {
  config: SheetsConfig;
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  onSaveConfig: (cfg: SheetsConfig) => void;
  onTriggerSync: () => void;
  onResetData: () => void;
}

export const SyncSettingsView: React.FC<SyncSettingsViewProps> = ({
  config,
  syncQueue,
  isSyncing,
  onSaveConfig,
  onTriggerSync,
  onResetData,
}) => {
  const [scriptUrl, setScriptUrl] = useState(config.scriptUrl || '');
  const [autoSync, setAutoSync] = useState(config.autoSync ?? true);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onSaveConfig({
      scriptUrl: scriptUrl.trim(),
      autoSync,
      lastSyncedAt: config.lastSyncedAt,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Cloud Sync Status Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-900">Google Sheets Sync</h3>
              <p className="text-[10px] text-slate-400">Database Backend Sinkronisasi</p>
            </div>
          </div>

          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow-sm shadow-blue-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sinkronisasi...' : 'Sync Sekarang'}
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Terakhir Sinkron:</span>
            <span className="font-semibold text-slate-800">
              {config.lastSyncedAt ? formatDateTime(config.lastSyncedAt) : 'Belum pernah'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Antrian Offline (Queue):</span>
            <span className="font-bold text-blue-600">{syncQueue.length} perubahan</span>
          </div>
        </div>

        {/* Input Google Apps Script Web App URL */}
        <div className="space-y-2 pt-1 text-xs">
          <label className="font-bold text-slate-700 block">
            Google Apps Script Web App URL:
          </label>
          <input
            type="url"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
          />
          <p className="text-[10px] text-slate-400">
            Dapatkan URL ini setelah mempublikasikan Apps Script di Google Sheets Anda.
          </p>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-700">Otomatis sync saat online</span>
            </label>

            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition flex items-center gap-1"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span>Tersimpan</span>
                </>
              ) : (
                'Simpan URL'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 1-Click Google Apps Script Code Setup */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900">Script Google Apps Script</h3>
            <p className="text-[10px] text-slate-400">Kode backend untuk Google Sheets</p>
          </div>
          <button
            onClick={handleCopyScript}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              copied ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin!' : 'Salin Kode'}
          </button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <p className="font-bold text-slate-800">Langkah Cepat Setup:</p>
          <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
            <li>Buka Google Sheets baru di Google Drive.</li>
            <li>Buat 3 lembar tab: <b>Orders</b>, <b>Customers</b>, <b>Services</b>.</li>
            <li>Buka menu <b>Extensions &gt; Apps Script</b>.</li>
            <li>Klik tombol <b>Salin Kode</b> di atas, lalu paste ke editor.</li>
            <li>Klik <b>Deploy &gt; New deployment &gt; Web app</b>.</li>
            <li>Set "Who has access" ke <b>Anyone</b>, lalu deploy.</li>
            <li>Salin URL Web App dan tempelkan pada kolom URL di atas.</li>
          </ol>
        </div>
      </div>

      {/* Database Reset / Maintenance */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 text-xs">
        <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-slate-600" />
          Penyimpanan Lokal (IndexedDB)
        </h3>
        <p className="text-[11px] text-slate-500">
          Aplikasi menggunakan IndexedDB untuk menyimpan data secara aman di perangkat Anda bahkan tanpa koneksi internet.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => {
              if (confirm('Reset database lokal ke data bawaan demo?')) {
                onResetData();
              }
            }}
            className="text-[11px] text-red-500 hover:underline font-semibold"
          >
            Reset ke Data Awal Demo
          </button>
        </div>
      </div>
    </div>
  );
};
