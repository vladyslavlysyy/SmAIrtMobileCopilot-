'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import AppLogo from '@/components/ui/AppLogo';
import {
  Zap,
  BarChart3,
  Building2,
  HardHat,
  ArrowRight,
  Shield,
  Clock,
  MapPin,
} from 'lucide-react';

export default function RoleSelector() {
  const router = useRouter();
  const [hoveredRole, setHoveredRole] = useState<string | null>(null);
  const { setUserRole } = useAppStore();

  const roles = [
    {
      id: 'operations',
      title: "Departament d'Operacions",
      subtitle: 'Planificació i Control',
      description:
        "Gestiona i prioritza les intervencions tècniques. Visualitza el mapa de la xarxa, assigna tècnics i gestiona imprevistos amb suport d'IA.",
      icon: Building2,
      route: '/operations-dashboard',
      color: 'primary',
      features: [
        'Cua de tasques prioritzada per IA',
        'Mapa de punts de recàrrega',
        "Gestió d'imprevistos",
        'Planificació de jornades',
      ],
      badge: 'Desktop-first',
    },
    {
      id: 'technician',
      title: 'Tècnic de Camp',
      subtitle: 'Execució i Evidències',
      description:
        "Visualitza el teu calendari setmanal, planifica rutes realistes considerant l'autonomia del VE i registra evidències d'intervenció.",
      icon: HardHat,
      route: '/field-technician-dashboard',
      color: 'secondary',
      features: [
        'Ruta del dia amb autonomia VE',
        'Calendari setmanal',
        "Formularis d'intervenció",
        'Reportar imprevistos',
      ],
      badge: 'Mobile-first',
    },
  ];

  const stats = [
    { icon: Zap, value: '247', label: 'Punts de Recàrrega' },
    { icon: MapPin, value: '18', label: 'Municipis coberts' },
    { icon: Clock, value: '98.2%', label: 'Disponibilitat xarxa' },
    { icon: Shield, value: '12', label: 'Tècnics actius' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <AppLogo size={36} />
          <div>
            <span className="font-semibold text-white text-lg tracking-tight">
              SmAIrt Mobility Copilot
            </span>
            <p className="text-blue-300 text-xs font-medium">Etecnic · Camp de Tarragona</p>
          </div>
        </div>
        <button
          onClick={() => router?.push('/metrics-dashboard')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all duration-150 border border-white/20"
        >
          <BarChart3 size={16} />
          Mètriques
        </button>
      </header>
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Sistema operatiu actiu · 26 Mar 2026 · 11:36
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Selecciona el teu rol
          </h1>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            El copilot d&apos;IA s&apos;adapta a les teves necessitats. Tria la vista corresponent
            al teu perfil.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
          {roles?.map((role) => {
            const Icon = role?.icon;
            const isHovered = hoveredRole === role?.id;
            return (
              <button
                key={`role-${role?.id}`}
                onClick={() => {
                  setUserRole(role?.id as 'operations' | 'technician');
                  router?.push(role?.route);
                }}
                onMouseEnter={() => setHoveredRole(role?.id)}
                onMouseLeave={() => setHoveredRole(null)}
                className={`relative text-left p-7 rounded-2xl border transition-all duration-300 group
                  ${
                    isHovered
                      ? role?.color === 'primary'
                        ? 'bg-blue-600/30 border-blue-400/60 shadow-2xl shadow-blue-500/20 scale-[1.02]'
                        : 'bg-cyan-600/30 border-cyan-400/60 shadow-2xl shadow-cyan-500/20 scale-[1.02]'
                      : 'bg-white/5 border-white/15 hover:border-white/30'
                  }`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    className={`p-3 rounded-xl ${role?.color === 'primary' ? 'bg-blue-500/30' : 'bg-cyan-500/30'}`}
                  >
                    <Icon
                      size={28}
                      className={role?.color === 'primary' ? 'text-blue-300' : 'text-cyan-300'}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border
                    ${role?.color === 'primary' ? 'bg-blue-900/50 border-blue-500/40 text-blue-300' : 'bg-cyan-900/50 border-cyan-500/40 text-cyan-300'}`}
                  >
                    {role?.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">{role?.title}</h2>
                <p
                  className={`text-sm font-medium mb-3 ${role?.color === 'primary' ? 'text-blue-400' : 'text-cyan-400'}`}
                >
                  {role?.subtitle}
                </p>
                <p className="text-slate-300 text-sm leading-relaxed mb-5">{role?.description}</p>
                <ul className="space-y-2 mb-6">
                  {role?.features?.map((feature) => (
                    <li
                      key={`feat-${role?.id}-${feature}`}
                      className="flex items-center gap-2 text-sm text-slate-300"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${role?.color === 'primary' ? 'bg-blue-400' : 'bg-cyan-400'}`}
                      ></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <div
                  className={`flex items-center gap-2 font-semibold text-sm transition-all duration-150
                  ${role?.color === 'primary' ? 'text-blue-300' : 'text-cyan-300'}
                  group-hover:gap-3`}
                >
                  Accedir a la vista
                  <ArrowRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {stats?.map((stat) => {
            const Icon = stat?.icon;
            return (
              <div
                key={`stat-${stat?.label}`}
                className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <Icon size={20} className="text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-white font-bold text-xl tabular-nums font-mono">
                    {stat?.value}
                  </p>
                  <p className="text-slate-400 text-xs">{stat?.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <footer className="px-6 py-4 border-t border-white/10 text-center">
        <p className="text-slate-500 text-xs">
          SmAIrt Mobility Copilot · Etecnic Mobilitat Elèctrica, SL · Prototip demostratiu — no
          reflecteix sistemes reals
        </p>
      </footer>
    </div>
  );
}
