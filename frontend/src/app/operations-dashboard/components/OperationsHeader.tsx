'use client';

import React, { useState } from 'react';
import { Download, RefreshCw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { api } from '@/lib/api';

interface OperationsHeaderProps {
  filterMode: 'today_all' | 'today_pending' | 'all_all' | 'all_pending';
  visibleCount: number;
  totalCount: number;
  isLoadingData: boolean;
  onFilterModeChange: (value: 'today_all' | 'today_pending' | 'all_all' | 'all_pending') => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function OperationsHeader({
  filterMode,
  visibleCount,
  totalCount,
  isLoadingData,
  onFilterModeChange,
  onRefresh,
}: OperationsHeaderProps) {
  const { visits, loadTechnicians } = useAppStore();
  const [showTechModal, setShowTechModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    zone: 'General',
  });

  const validateTechnicianForm = () => {
    if (!form.name.trim()) return 'El nom es obligatori';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return 'Email no valid';
    if (!/^[0-9+()\-\s]{7,20}$/.test(form.phone.trim())) return 'Telefon no valid';
    if (!form.zone.trim()) return 'La zona es obligatoria';
    return null;
  };

  const handleCreateTechnician = async () => {
    const validationError = validateTechnicianForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setIsCreating(true);
      const created = await api.createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        passwd: 'change-me',
        is_technician: true,
        zone: form.zone.trim(),
      });
      toast.success(`Tecnic creat: ${created.name} (ID ${created.technician_id ?? created.id})`);
      await loadTechnicians();
      setShowTechModal(false);
      setForm({ name: '', email: '', phone: '', zone: 'General' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No s\'ha pogut crear el tecnic');
    } finally {
      setIsCreating(false);
    }
  };

  const handleExport = () => {
    const headers = ['id', 'visit_type', 'status', 'planned_date', 'technician_id', 'address'];
    const rows = visits.map((v) => [
      v.id,
      v.visit_type,
      v.status,
      v.planned_date,
      v.technician_id ?? '',
      v.address ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visits_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-mobility-surface border-b border-mobility-border px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-mobility-primary tracking-tight">
          Centre de Control Operatiu
        </h1>
        <p className="text-mobility-muted text-sm">
          {visibleCount} visites visibles (de {totalCount} carregades des del backend)
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterMode}
          onChange={(e) => {
            const value = e.target.value as
              | 'today_all'
              | 'today_pending'
              | 'all_all'
              | 'all_pending';
            void onFilterModeChange(value);
          }}
          className="px-3 py-2 text-sm bg-mobility-background border border-mobility-border rounded-lg text-mobility-primary"
        >
          <option value="today_all">Filtre: Avui · Totes</option>
          <option value="today_pending">Filtre: Avui · Nomes pendents</option>
          <option value="all_all">Filtre: Historic · Totes</option>
          <option value="all_pending">Filtre: Historic · Nomes pendents</option>
        </select>

        <button
          onClick={() => void onRefresh()}
          disabled={isLoadingData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-mobility-muted bg-mobility-background border border-mobility-border rounded-lg hover:bg-mobility-surface disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoadingData ? 'animate-spin' : ''} />
          Actualitzar ara
        </button>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-mobility-muted bg-mobility-background border border-mobility-border rounded-lg hover:bg-mobility-surface"
        >
          <Download size={14} />
          Exportar CSV
        </button>

        <button
          onClick={() => setShowTechModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-mobility-accent rounded-lg hover:brightness-110"
        >
          <UserPlus size={14} />
          Nou Tecnic
        </button>
      </div>
      </div>

      {showTechModal && (
        <div className="fixed inset-0 z-50 bg-mobility-primary/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-mobility-surface border border-mobility-border rounded-xl shadow-xl p-5 space-y-4">
            <h2 className="text-lg font-semibold text-mobility-primary">Alta de Tecnic</h2>

            <div className="space-y-2">
              <label className="text-xs text-mobility-muted">Nom</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
                placeholder="Nom complet"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-mobility-muted">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
                placeholder="tecnic@empresa.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-mobility-muted">Telefon</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
                  placeholder="600000000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-mobility-muted">Zona</label>
                <input
                  value={form.zone}
                  onChange={(e) => setForm((prev) => ({ ...prev, zone: e.target.value }))}
                  className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
                  placeholder="General"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTechModal(false)}
                className="px-3 py-2 text-sm rounded-lg border border-mobility-border text-mobility-muted hover:bg-mobility-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTechnician}
                disabled={isCreating}
                className="px-3 py-2 text-sm rounded-lg bg-mobility-accent text-white hover:brightness-110 disabled:opacity-60"
              >
                {isCreating ? 'Creant...' : 'Crear Tecnic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
