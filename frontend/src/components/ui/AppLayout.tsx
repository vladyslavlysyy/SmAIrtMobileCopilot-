'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'operations', label: 'Operacions', icon: LayoutDashboard, href: '/operations-dashboard' },
  { id: 'metrics', label: 'Mètriques', icon: BarChart3, href: '/metrics-dashboard' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { isHydrated, logout } = useAppStore();

  if (!isHydrated) {
    return <div className="min-h-screen bg-mobility-primary" />;
  }

  return (
    <div className="flex h-screen bg-mobility-primary overflow-hidden">
      <aside
        className={`flex flex-col bg-mobility-primary border-r border-mobility-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}
      >
        <div
          className={`flex items-center border-b border-mobility-border h-16 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <div className="flex items-center justify-center font-bold text-mobility-accent text-xl cursor-pointer" onClick={() => router.push('/')}>
            EV
          </div>
          {!collapsed && (
            <div className="overflow-hidden cursor-pointer" onClick={() => router.push('/')}>
              <span className="font-semibold text-white text-sm tracking-tight block truncate">
                Etecnic Copilot
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 rounded-r-lg border-l-4 ${
                  isActive
                    ? 'border-mobility-accent bg-mobility-background text-mobility-primary'
                    : 'border-transparent text-white/75 hover:bg-mobility-background hover:text-mobility-primary'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-mobility-accent' : ''} />
                {!collapsed && <span className="text-sm font-semibold truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-mobility-border pt-4 space-y-2">
          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-100/60 text-red-700 font-mono hover:bg-red-200/60 transition-all duration-150"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sortir</span>} 
          </button>
        </div>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center h-10 border-t border-mobility-border text-mobility-muted hover:text-mobility-primary hover:bg-mobility-background hover:text-mobility-primary transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}  
        </button>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin bg-mobility-background text-mobility-primary">{children}</main>
    </div>
  );
}
