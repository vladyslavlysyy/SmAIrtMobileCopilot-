'use client';

import React from 'react';
import { Clock, MapPin, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import type { Technician } from '@/lib/api';

interface TechHeaderProps {
  technicians: Technician[];
  selectedTechId: number | null;
  onSelect: (id: number) => void;
}

export default function TechnicianHeader({
  technicians,
  selectedTechId,
  onSelect,
}: TechHeaderProps) {
  const selected = technicians.find((t) => t.id === selectedTechId) ?? null;

  return (
    <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-5 border-b border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-4 max-w-screen-2xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50 flex items-center justify-center mt-1">
            <User size={22} className="text-blue-300" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">
              {selected ? selected.name : 'Selecciona tècnic'}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-300">
              <MapPin size={12} />
              <span>{selected?.zone ?? 'Sense zona'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedTechId ?? ''}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
          >
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => toast.info("Contacte d'operacions enviat")}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg"
          >
            <Phone size={14} /> Operacions
          </button>

          <div className="text-right text-white/90">
            <p className="text-slate-300 text-xs">{new Date().toLocaleDateString('ca-ES')}</p>
            <p className="font-bold text-sm flex items-center gap-1 justify-end">
              <Clock size={12} />
              {new Date().toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
