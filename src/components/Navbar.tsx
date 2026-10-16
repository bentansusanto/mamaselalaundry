'use client';

import React from 'react';
import { Wifi, WifiOff, RefreshCw, UserCheck, Shirt, Download } from 'lucide-react';
import { UserAccount } from '@/types';

interface NavbarProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  onSelectUser: (user: UserAccount) => void;
  isOnline: boolean;
  isSyncing: boolean;
  onSync: () => void;
  onOpenInstall?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  onSelectUser,
  isOnline,
  isSyncing,
  onSync,
  onOpenInstall,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/20">
          <Shirt className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-sm leading-tight">Mama Sela</h1>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {isOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onOpenInstall && (
          <button
            onClick={onOpenInstall}
            title="Download / Pasang Aplikasi ke HP"
            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onSync}
          disabled={isSyncing}
          title="Sinkronisasi ke Google Sheets"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>

        {/* User Badge or Switcher */}
        {allUsers.length <= 1 ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate max-w-[90px]">{currentUser.name}</span>
          </div>
        ) : (
          <div className="relative flex items-center">
            <select
              value={currentUser.id}
              onChange={(e) => {
                const u = allUsers.find((usr) => usr.id === e.target.value);
                if (u) onSelectUser(u);
              }}
              className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full pl-2.5 pr-2 py-1 border border-slate-200 focus:outline-none cursor-pointer"
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </header>
  );
};
