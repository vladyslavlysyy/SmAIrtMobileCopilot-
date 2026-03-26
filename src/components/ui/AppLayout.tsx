'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import { 
  LayoutDashboard, BarChart3, ChevronLeft, ChevronRight, 
  LogOut, User, Lock, Mail, Phone, Loader2, Users, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '@/actions/auth';

interface AppLayoutProps { children: React.ReactNode; }

const navItems = [
  { id: 'nav-operations', label: 'Operacions', icon: LayoutDashboard, href: '/operations-dashboard', badge: 3 },
  { id: 'nav-team', label: 'Equip i Tècnics', icon: Users, href: '/field-technician-dashboard', badge: null },
  { id: 'nav-metrics', label: 'Mètriques', icon: BarChart3, href: '/metrics-dashboard', badge: null },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [realUser, setRealUser] = useState<{name: string, email: string} | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) setRealUser(user);
      setIsLoadingSession(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const res = await loginUser(formData);
    if (res.error) toast.error(res.error);
    else {
      toast.success(`Sessió iniciada. Benvingut Administrador ${res.name}!`);
      setRealUser({ name: res.name!, email: res.email! });
    }
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const res = await registerUser(formData);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Compte d\'Admin creat correctament.');
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

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
        <p className="text-slate-400">Verificant seguretat...</p>
      </div>
    );
  }

  if (!realUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-8 text-center border-b border-slate-800 bg-slate-900/50">
            <div className="flex justify-center mb-4"><AppLogo size={48} /></div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SmAIrt Mobility</h1>
            <p className="text-slate-400 text-sm mt-1">Portal d'Administració Operativa</p>
          </div>

          <div className="p-8">
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Usuari (Admin)</label>
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
                  Entrar al portal
                </button>
                <p className="text-center text-sm text-slate-400 mt-4">
                  Nou administrador? <button type="button" onClick={() => setAuthMode('register')} className="text-blue-400 hover:text-blue-300 font-medium">Sol·licita accés</button>
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
                  Ja tens compte d'Admin? <button type="button" onClick={() => setAuthMode('login')} className="text-cyan-400 hover:text-cyan-300 font-medium">Inicia sessió</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden animate-fade-in">
      <aside className={`flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`flex items-center border-b border-slate-800 h-16 px-3 ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <AppLogo size={32} onClick={() => router.push('/')} className="cursor-pointer" />
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-semibold text-white text-sm tracking-tight block truncate">SmAIrt Mobility</span>
              <span className="text-slate-400 text-xs">Administració</span>
            </div>
          )}
        </div>

        {/* Tarjeta de administrador (Ahora clickeable para ir al perfil) */}
        {!collapsed && (
          <Link href="/profile" className="mx-3 mt-4 mb-2 px-3 py-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50 transition-colors block group">
            <p className="text-blue-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
              <Shield size={12} /> Administrador
            </p>
            <p className="text-white text-sm font-semibold truncate group-hover:text-blue-300 transition-colors">{realUser.name}</p>
            <p className="text-slate-400 text-xs truncate mt-0.5">{realUser.email}</p>
          </Link>
        )}

        <nav className="flex-1 px-2 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (pathname === '/' && item.id === 'nav-operations');
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

        {/* Acciones inferiores sin alertas */}
        <div className="px-2 pb-4 border-t border-slate-800 pt-3 space-y-1">
          <Link href="/profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
              ${pathname === '/profile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Settings size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">El meu perfil</span>}
          </Link>
          
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150">
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Tancar sessió</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center h-10 border-t border-slate-800 text-slate-500 hover:text-white hover:bg-slate-800 transition-all duration-150">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto scrollbar-thin">
        {children}
      </main>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  );
}