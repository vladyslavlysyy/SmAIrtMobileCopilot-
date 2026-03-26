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
  Settings,
  Users,
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useAppStore } from '@/store/appStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'operations', label: 'Operacions', icon: LayoutDashboard, href: '/operations-dashboard' },
  { id: 'technician', label: 'Tècnic de Camp', icon: Users, href: '/field-technician-dashboard' },
  { id: 'metrics', label: 'Mètriques', icon: BarChart3, href: '/metrics-dashboard' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { currentUser, isHydrated, logout } = useAppStore();
  const fallbackRole = pathname?.includes('field-technician') ? 'technician' : 'operations';
  const displayRole = currentUser?.role ?? fallbackRole;

  if (!isHydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside
        className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
      >
        <div
          className={`flex items-center border-b border-slate-800 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <AppLogo size={32} onClick={() => router.push('/')} className="cursor-pointer" />
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-semibold text-white text-sm tracking-tight block truncate">
                SmAIrt Mobility
              </span>
              <span className="text-slate-400 text-xs">
                {displayRole === 'operations' ? 'Operations' : 'Technician'}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-4 border-t border-slate-800 pt-3 space-y-1">
          <Link
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150"
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Canviar rol</span>}
          </Link>

          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sortir</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center h-10 border-t border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">{children}</main>
    </div>
  );
}
