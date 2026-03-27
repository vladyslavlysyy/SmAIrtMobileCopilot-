'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'operations', label: 'Operacions', icon: LayoutDashboard, href: '/operations-dashboard' },
  { id: 'planning', label: 'Planificació', icon: CalendarDays, href: '/planning-dashboard' },
  { id: 'metrics', label: 'Mètriques', icon: BarChart3, href: '/metrics-dashboard' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const { isHydrated, logout } = useAppStore();

  useEffect(() => {
    const storedTheme = localStorage.getItem('smairt-theme');
    if (storedTheme === 'dark' || storedTheme === 'light') {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('theme-dark', storedTheme === 'dark');
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.classList.toggle('theme-dark', prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }

    const syncCollapsedByViewport = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };

    syncCollapsedByViewport();
    window.addEventListener('resize', syncCollapsedByViewport);

    let active = true;

    const loadNavCounters = async () => {
      try {
        const visits = await api.getAllVisits();
        if (!active) return;

        const pending = visits.filter((v) => v.status === 'pending').length;
        const blocked = visits.filter((v) => v.status === 'blocked').length;
        setPendingCount(pending);
        setBlockedCount(blocked);
      } catch {
        if (!active) return;
        setPendingCount(null);
        setBlockedCount(null);
      }
    };

    void loadNavCounters();
    const timer = setInterval(() => {
      void loadNavCounters();
    }, 30000);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('resize', syncCollapsedByViewport);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('theme-dark', nextTheme === 'dark');
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('smairt-theme', nextTheme);
  };

  if (!isHydrated) {
    return <div className="min-h-screen bg-mobility-primary" />;
  }

  return (
    <div className="flex h-dvh bg-mobility-primary overflow-hidden">
      <aside
        className={`flex flex-col border-r border-white/10 transition-all duration-300 backdrop-blur-xl ${collapsed ? 'w-14 sm:w-16' : 'w-56 sm:w-60 lg:w-64'}`}
        style={{
          background:
            'linear-gradient(165deg, hsl(214, 57%, 18%) 0%, hsl(217, 49%, 14%) 52%, hsl(222, 52%, 11%) 100%)',
        }}
      >
        <div
          className={`flex items-center border-b border-white/10 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <div
            className="flex items-center justify-center font-bold text-mobility-accent text-xl cursor-pointer h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/15"
            onClick={() => router.push('/')}
          >
            EV
          </div>
          {!collapsed && (
            <div className="overflow-hidden cursor-pointer" onClick={() => router.push('/')}>
              <span className="font-semibold text-white text-sm tracking-tight block truncate">
                Etecnic Copilot
              </span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/55">Control Center</span>
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
                    ? 'border-mobility-accent bg-white text-mobility-primary shadow-sm'
                    : 'border-transparent text-white/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-mobility-accent' : ''} />
                {!collapsed && (
                  <div className="flex items-center justify-between gap-2 w-full min-w-0">
                    <span className="hidden sm:block text-sm font-semibold truncate">{item.label}</span>
                    {item.id === 'planning' && pendingCount !== null && pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                        {pendingCount}
                      </span>
                    )}
                    {item.id === 'operations' && blockedCount !== null && blockedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                        {blockedCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-mobility-border pt-4 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20 transition-all duration-150"
          >
            {theme === 'dark' ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{theme === 'dark' ? 'Mode clar' : 'Mode fosc'}</span>}
          </button>

          <button
            onClick={() => {
              logout();
              router.push('/');
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-red-500/15 text-red-100 ring-1 ring-red-300/20 font-mono hover:bg-red-500/25 transition-all duration-150"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Sortir</span>} 
          </button>
        </div>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex items-center justify-center h-10 border-t border-white/10 text-white/55 hover:text-white hover:bg-white/10 transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}  
        </button>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto scrollbar-thin bg-mobility-background/85 text-mobility-primary">{children}</main>
    </div>
  );
}
