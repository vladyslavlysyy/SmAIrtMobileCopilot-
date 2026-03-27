'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { Monitor, Smartphone } from 'lucide-react';

export default function RoleSelector() {
  const router = useRouter();
  const { setUserRole } = useAppStore();

  const handleSelectRole = () => {
    setUserRole('operations');
    router.push('/operations-dashboard');
  };

  return (
    <div className="min-h-screen bg-mobility-primary flex flex-col items-center justify-center p-4">
      <div className="bg-mobility-surface shadow-sm rounded-2xl p-10 shadow-2xl max-w-3xl w-full border border-mobility-border">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-mobility-primary flex items-center justify-center gap-2">
            <span className="text-mobility-accent text-3xl">EV</span> SmAIrt Mobility Copilot
          </h1>
          <p className="text-mobility-muted mt-2">Powered by Etecnic</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-mobility-background/30 border border-mobility-border rounded-xl p-6 flex flex-col items-center text-center transition-all hover:border-mobility-accent/50">
            <div className="bg-mobility-primary p-4 rounded-full mb-4">
              <Monitor size={32} className="text-mobility-accent" />
            </div>
            <h2 className="text-xl font-bold text-mobility-primary mb-2">Departament d'Operacions (Admin)</h2>
            <p className="text-sm text-mobility-muted mb-8 flex-1">
              Gestiona i prioritza intervencions, visualitza el mapa i assigna tecnics amb suport d'IA.
            </p>
            <button
              onClick={handleSelectRole}
              className="w-full bg-mobility-accent text-white rounded-lg px-4 py-3 font-semibold hover:brightness-110 transition-all"
            >
              Accedir a Operacions
            </button>
          </div>

          <div className="bg-mobility-background/30 border border-mobility-border rounded-xl p-6 flex flex-col items-center text-center transition-all hover:border-mobility-accent/50">
            <div className="bg-mobility-primary p-4 rounded-full mb-4">
              <Smartphone size={32} className="text-mobility-primary" />
            </div>
            <h2 className="text-xl font-bold text-mobility-primary mb-2">Tecnic de Camp (App Mobil)</h2>
            <p className="text-sm text-mobility-muted mb-8 flex-1">
              Aquesta vista no s'utilitza al web. El tecnic accedeix des de l'aplicacio mobil separada.
            </p>
            <div className="w-full border border-mobility-border text-mobility-muted rounded-lg px-4 py-3 font-semibold bg-mobility-surface/70">
              Disponible nomes a mobil
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <p className="text-xs text-mobility-muted">by Etecnic × URV Hackathon</p>
        </div>
      </div>
    </div>
  );
}
