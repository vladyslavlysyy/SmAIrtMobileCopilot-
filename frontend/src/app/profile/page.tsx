'use client';

import React, { useState } from 'react';
import { Save, User } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/ui/AppLayout';
import { useAppStore } from '@/store/appStore';

export default function ProfilePage() {
  const { currentUser } = useAppStore();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-mobility-background animate-fade-in">
        <div className="bg-card border-b border-border px-6 py-4">
          <h1 className="text-xl font-bold text-foreground tracking-tight">El meu perfil</h1>
          <p className="text-muted-foreground text-sm">Configuració local del prototip</p>
        </div>

        <div className="p-6 max-w-3xl mx-auto w-full">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <User size={22} className="text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {currentUser?.role === 'operations' ? 'Operations' : 'Technician'}
                </p>
                <p className="text-xs text-muted-foreground">ID: {currentUser?.id ?? 'N/D'}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nom</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Correu</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Telèfon</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => toast.success('Perfil guardat localment')}
                className="px-4 py-2 text-sm font-semibold text-mobility-primary bg-primary rounded-lg hover:bg-primary/90 inline-flex items-center gap-2"
              >
                <Save size={14} />
                Guardar canvis
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
