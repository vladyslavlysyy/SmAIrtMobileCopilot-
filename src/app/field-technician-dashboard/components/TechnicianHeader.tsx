'use client';

import React, { useState } from 'react';
import { User, MapPin, Zap, Clock, Phone, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function TechnicianHeader() {
  const [showCallModal, setShowCallModal] = useState(false);

  const handleCall = (contact: string) => {
    setShowCallModal(false);
    toast.success(`Trucant a ${contact}...`, { description: 'Connexió establerta.' });
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-5 border-b border-slate-700 relative overflow-hidden">
        {/* Indicador de que el Admin está mirando esto */}
        <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 uppercase tracking-wider">
          <Eye size={10} /> Vista de Supervisió Admin
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 max-w-screen-2xl mx-auto mt-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50 flex items-center justify-center">
              <User size={22} className="text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-white font-bold text-lg">Marc Puigdomènech</h1>
                <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-medium rounded-full">
                  En servei actiu
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-300 text-sm">
                <span className="flex items-center gap-1"><MapPin size={12} />Tarragona Centre</span>
                <span className="flex items-center gap-1"><Clock size={12} />Torn: 08:00 – 17:00</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}