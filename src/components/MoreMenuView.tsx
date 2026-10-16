'use client';

import React from 'react';
import { Sparkles, BarChart3, Users, Cloud, ChevronRight, Shield, Settings, Info, Download, Smartphone } from 'lucide-react';

export type MoreSubView = 'menu' | 'services' | 'reports' | 'users' | 'sync';

interface MoreMenuViewProps {
  onSelectSubView: (subView: MoreSubView) => void;
  syncQueueCount: number;
  onOpenInstall?: () => void;
}

interface MenuItem {
  id: MoreSubView;
  title: string;
  desc: string;
  icon: any;
  iconColor: string;
  badge?: string;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = ({ onSelectSubView, onOpenInstall }) => {
  const menuItems: MenuItem[] = [
    {
      id: 'services' as MoreSubView,
      title: 'Manajemen Layanan',
      desc: 'Daftar harga kiloan, satuan, HPP & profit margin',
      icon: Sparkles,
      iconColor: 'text-blue-600 bg-blue-50',
    },
    {
      id: 'reports' as MoreSubView,
      title: 'Laporan Penjualan',
      desc: 'Analisis omset, profit, filter bulan/kuartal/tahun & export CSV',
      icon: BarChart3,
      iconColor: 'text-green-600 bg-green-50',
    },
    {
      id: 'users' as MoreSubView,
      title: 'Manajemen Pengguna',
      desc: 'Kelola akun kasir & admin serta status akses',
      icon: Users,
      iconColor: 'text-amber-600 bg-amber-50',
    },
    {
      id: 'sync' as MoreSubView,
      title: 'Sinkronisasi & Cadangan Cloud',
      desc: 'Status sinkronisasi realtime, multi-perangkat & unduh backup',
      icon: Cloud,
      iconColor: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-1">Pengaturan & Fitur Tambahan</h2>
        <p className="text-xs text-slate-500">
          Pilih menu untuk mengatur operasional dan sinkronisasi laundry Anda.
        </p>
      </div>

      {onOpenInstall && (
        <div
          onClick={onOpenInstall}
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-3.5 text-white shadow-md shadow-blue-500/20 flex items-center justify-between cursor-pointer active:scale-98 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs">Download Aplikasi ke HP</h3>
              <p className="text-[11px] text-blue-100 mt-0.5">Pasang di layar utama untuk akses instan & offline</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/80 shrink-0" />
        </div>
      )}

      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              onClick={() => onSelectSubView(item.id)}
              className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer flex items-center justify-between active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                    {item.title}
                    {item.badge && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-800 font-bold px-1.5 py-0.2 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{item.desc}</p>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          );
        })}
      </div>

      {/* App Info Box */}
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center text-xs text-slate-500 space-y-1">
        <p className="font-bold text-slate-700">Mama Sela - POS & Laundry Management</p>
        <p className="text-[11px]">Versi PWA 1.0.0 • Mobile-First Offline Ready</p>
        <p className="text-[10px] text-slate-400">Next.js • Tailwind CSS • IndexedDB • Google Sheets</p>
      </div>
    </div>
  );
};
