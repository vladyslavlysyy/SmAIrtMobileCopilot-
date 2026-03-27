'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone } from 'lucide-react';
import AppLayout from '@/components/ui/AppLayout';

export default function FieldTechnicianDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/operations-dashboard');
    }, 1600);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-theme(spacing.16))] flex items-center justify-center bg-mobility-background px-6">
        <div className="max-w-xl w-full bg-mobility-surface border border-mobility-border rounded-xl p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-mobility-background border border-mobility-border flex items-center justify-center">
            <Smartphone className="text-mobility-accent" size={22} />
          </div>
          <h1 className="text-lg font-semibold text-mobility-primary mb-2">Vista de Tecnic nomes a App Mobil</h1>
          <p className="text-sm text-mobility-muted">
            Aquest dashboard s'utilitza des de l'aplicacio mobil del tecnic. Al web d'admin nomes es treballa amb Operacions.
          </p>
          <p className="text-xs text-mobility-muted mt-4">Redirigint a Operacions...</p>
        </div>
      </div>
    </AppLayout>
  );
}
