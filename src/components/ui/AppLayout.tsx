'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { LayoutDashboard, HardHat, BarChart3, ChevronLeft, ChevronRight, Bell, Settings, LogOut, Zap, X, CheckCheck, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';
import Icon from '@/components/ui/AppIcon';


interface AppLayoutProps {
  children: React.ReactNode;
  role?: 'operations' | 'technician';
}

const navItems = [
  { id: 'nav-operations', label: 'Operacions', icon: LayoutDashboard, href: '/operations-dashboard', badge: 3 },
  { id: 'nav-technician', label: 'Tècnic de Camp', icon: HardHat, href: '/field-technician-dashboard', badge: null },
  { id: 'nav-metrics', label: 'Mètriques', icon: BarChart3, href: '/metrics-dashboard', badge: null },
];

export default function AppLayout({ children, role = 'operations' }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { alerts, unreadAlerts, markAlertRead, markAllAlertsRead } = useAppStore();

  const getAlertIcon = (type: string) => {
    if (type === 'error') return <AlertCircle size={14} className="text-red-500 flex-shrink-0" />;
    if (type === 'warning') return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />;
    return <Info size={14} className="text-blue-500 flex-shrink-0" />;
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-800 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <AppLogo size={32} onClick={() => router.push('/')} />
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-semibold text-white text-sm tracking-tight block truncate">SmAIrt Mobility</span>
              <span className="text-slate-400 text-xs">Copilot</span>
            </div>
          )}
        </div>

        {/* Role Indicator */}
        {!collapsed && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700">
            <p className="text-slate-400 text-xs mb-0.5">Vista activa</p>
            <p className="text-white text-xs font-semibold">
              {role === 'operations' ? '🏢 Operacions' : '🔧 Tècnic de Camp'}
            </p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative
                  ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                {!collapsed && item.badge !== null && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge !== null && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-150 z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Network Status */}
        {!collapsed && (
          <div className="mx-3 mb-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-cyan-400" />
              <span className="text-slate-300 text-xs font-medium">Xarxa activa</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Operatius</span>
                <span className="text-green-400 font-mono font-medium">231/247</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Incidències</span>
                <span className="text-amber-400 font-mono font-medium">16</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Crítics</span>
                <span className="text-red-400 font-mono font-medium">3</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="px-2 pb-4 border-t border-slate-800 pt-3 space-y-1">
          <button
            onClick={() => { setShowAlerts(true); setShowSettings(false); }}
            title={collapsed ? 'Alertes' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 group relative"
          >
            <Bell size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Alertes</span>}
            {unreadAlerts > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadAlerts}
              </span>
            )}
            {collapsed && unreadAlerts > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
            )}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                Alertes
              </div>
            )}
          </button>
          <button
            onClick={() => { setShowSettings(true); setShowAlerts(false); }}
            title={collapsed ? 'Configuració' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 relative group"
          >
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Configuració</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                Configuració
              </div>
            )}
          </button>
          <button
            onClick={() => router.push('/')}
            title={collapsed ? 'Canviar rol' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 relative group"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Canviar rol</span>}
            {collapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                Canviar rol
              </div>
            )}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto scrollbar-thin">
        {children}
      </main>

      {/* Alerts Panel */}
      {showAlerts && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAlerts(false)} />
          <div className="relative w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">Alertes</h3>
                <p className="text-xs text-muted-foreground">{unreadAlerts} no llegides</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadAlerts > 0 && (
                  <button
                    onClick={markAllAlertsRead}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    <CheckCheck size={12} />
                    Marcar totes
                  </button>
                )}
                <button onClick={() => setShowAlerts(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`px-5 py-4 cursor-pointer hover:bg-muted/40 transition-colors ${!alert.read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => markAlertRead(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className={`text-sm font-semibold ${!alert.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {alert.title}
                        </p>
                        <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{alert.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{alert.message}</p>
                    </div>
                    {!alert.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Configuració</h3>
              <button onClick={() => setShowSettings(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Notifications */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Notificacions</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Alertes SLA crítiques', defaultOn: true },
                    { label: 'Nous imprevistos', defaultOn: true },
                    { label: 'Visites completades', defaultOn: false },
                    { label: 'Suggeriments IA', defaultOn: true },
                  ].map((item) => (
                    <ToggleSetting key={item.label} label={item.label} defaultOn={item.defaultOn} />
                  ))}
                </div>
              </div>
              {/* Display */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Visualització</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Mode compacte de taula', defaultOn: false },
                    { label: 'Mostrar puntuació IA', defaultOn: true },
                    { label: 'Animacions en temps real', defaultOn: true },
                  ].map((item) => (
                    <ToggleSetting key={item.label} label={item.label} defaultOn={item.defaultOn} />
                  ))}
                </div>
              </div>
              {/* System */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Sistema</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-foreground">Interval d&apos;actualització</span>
                    <select className="text-xs px-2 py-1 bg-muted border border-border rounded-md text-foreground focus:outline-none">
                      <option>30 seg</option>
                      <option>1 min</option>
                      <option>5 min</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-foreground">Idioma</span>
                    <select className="text-xs px-2 py-1 bg-muted border border-border rounded-md text-foreground focus:outline-none">
                      <option>Català</option>
                      <option>Castellano</option>
                      <option>English</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={() => { setShowSettings(false); toast.success('Configuració guardada'); }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                Guardar configuració
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSetting({ label, defaultOn }: { label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${on ? 'bg-primary' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
