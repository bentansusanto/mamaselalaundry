'use client';

import React from 'react';
import { LayoutDashboard, ShoppingBag, ClipboardList, Users, MoreHorizontal } from 'lucide-react';

export type NavTab = 'dashboard' | 'pos' | 'orders' | 'customers' | 'more';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeOrdersCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  activeOrdersCount,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Beranda',
      icon: LayoutDashboard,
    },
    {
      id: 'orders' as NavTab,
      label: 'Pesanan',
      icon: ClipboardList,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    {
      id: 'pos' as NavTab,
      label: 'Kasir POS',
      icon: ShoppingBag,
      isSpecial: true,
    },
    {
      id: 'customers' as NavTab,
      label: 'Pelanggan',
      icon: Users,
    },
    {
      id: 'more' as NavTab,
      label: 'Menu',
      icon: MoreHorizontal,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
                    isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`text-[10px] mt-1 font-semibold ${
                    isActive ? 'text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 relative transition active:scale-95 ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-yellow-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
