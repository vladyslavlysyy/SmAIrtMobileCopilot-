'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { 
  LayoutDashboard, HardHat, BarChart3, ChevronLeft, ChevronRight, 
  Bell, LogOut, X, CheckCheck, AlertTriangle, Info, AlertCircle, 
  User, Lock, Mail, Phone, Loader2
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

// --- IMPORTAMOS EL BACKEND REAL ---
import { loginUser, registerUser, logoutUser, getCurrentUser } from '@/actions/auth';

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'nav-operations', label: 'Operacions', icon: LayoutDashboard, href: '/operations-dashboard', badge: 3 },
  { id: 'nav-technician', label: 'Tècnic de Camp', icon: HardHat, href: '/field-technician-dashboard', badge: null },
  { id: 'nav-metrics', label: 'Mètriques', icon: BarChart3, href: '/metrics-dashboard', badge: null },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  // Del Store ahora SOLO sacamos las alertas (la sesión va por Base de Datos)
  const { alerts, unreadAlerts, markAlertRead, markAllAlertsRead } = useAppStore();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Estados de Sesión Real
  const [realUser, setRealUser] = useState<{name: string, email: string} | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Al cargar la web, preguntamos al backend si hay una sesión activa (Cookie Segura)
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) setRealUser(user);
      setIsLoadingSession(false);
    });
  }, []);

  const getAlertIcon = (type: string) => {
    if (type === 'error') return <AlertCircle size={14} className="text-red-500 flex-shrink-0" />;
    if (type === 'warning') return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />;
    return <Info size={14} className="text-blue-500 flex-shrink-0" />;
  };

  // --- MANEJADORES REALES CON BASE DE DATOS ---
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const res = await loginUser(formData);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Sessió iniciada. Benvingut de nou, ${res.name}!`);
      setRealUser({ name: res.name!, email: res.email! });
    }
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const res = await registerUser(formData);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Compte creat correctament. Benvingut!');
      setRealUser({ name: res.name!, email: res.email! });
    }
    setIsSubmitting(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    setRealUser(null);
    router.push('/');
    toast.info('Sessió tancada correctament');
  };

  // Pantalla de carga mientras lee la Cookie
  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-slate-400">Verificant seguretat...</p>
      </div>
    );
  }

  // ==========================================
  // PANTALLA DE LOGIN / REGISTRO
  // ==========================================
  if (!realUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-8 text-center border-b border-slate-800 bg-slate-900/50">
            <div className="flex justify-center mb-4">
              <AppLogo size={48} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SmAIrt Mobility</h1>
            <p className="text-slate-400 text-sm mt-1">
              {authMode === 'login' ? 'Inicia sessió per continuar' : 'Crea un compte nou'}
            </p>
          </div>

          <div className="p-8">
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Usuari / Login</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="username" required type="text" placeholder="El teu usuari" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Contrasenya</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="password" required type="password" placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Entrar al sistema
                </button>
                <p className="text-center text-sm text-slate-400 mt-4">
                  No tens compte? <button type="button" onClick={() => setAuthMode('register')} className="text-blue-400 hover:text-blue-300 font-medium">Registra't aquí</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom complet</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="name" required type="text" placeholder="Ex: Joan Garcia" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom d'usuari (Login)</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="username" required type="text" placeholder="Ex: joangarcia88" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Telèfon</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="phone" required type="tel" placeholder="+34 600 000 000" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Correu electrònic</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="email" required type="email" placeholder="joan@exemple.com" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Contrasenya</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input name="password" required type="password" placeholder="Crea una contrasenya segura" className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
                  </div>
                </div>
                <button disabled={isSubmitting} type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Crear compte i entrar
                </button>
                <p className="text-center text-sm text-slate-400 mt-4">
                  Ja tens un compte? <button type="button" onClick={() => setAuthMode('login')} className="text-cyan-400 hover:text-cyan-300 font-medium">Inicia sessió</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // LAYOUT PRINCIPAL DEL DASHBOARD (Protegido)
  // ==========================================
  return (
    <div className="flex h-screen bg-background overflow-hidden animate-fade-in">
      <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        
        <div className={`flex items-center border-b border-slate-800 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <AppLogo size={32} onClick={() => router.push('/')} className="cursor-pointer" />
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-semibold text-white text-sm tracking-tight block truncate">SmAIrt Mobility</span>
              <span className="text-slate-400 text-xs">Copilot</span>
            </div>
          )}
        </div>

        {/* --- DATOS REALES DE LA BASE DE DATOS AQUÍ --- */}
        {!collapsed && (
          <div className="mx-3 mt-4 mb-2 px-3 py-3 rounded-lg bg-slate-800 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">Sessió iniciada com</p>
            <p className="text-white text-sm font-semibold truncate">{realUser.name}</p>
            <p className="text-blue-400 text-xs truncate mt-0.5">{realUser.email}</p>
          </div>
        )}

        <nav className="flex-1 px-2 py-2 space-y-1">
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
              </Link>
            );
          })}
        </nav>

        <div className="px-2 pb-4 border-t border-slate-800 pt-3 space-y-1">
          <button
            onClick={() => setShowAlerts(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 group"
          >
            <Bell size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Alertes</span>}
            {unreadAlerts > 0 && (
              <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadAlerts}
              </span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 relative group"
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Tancar sessió</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 transition-all duration-150"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">
        {children}
      </main>

      {showAlerts && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAlerts(false)} />
          <div className="relative w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">Alertes</h3>
              </div>
              <button onClick={() => setShowAlerts(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-400">Tens {unreadAlerts} alertes noves.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}