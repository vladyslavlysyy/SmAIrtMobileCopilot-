'use client';

import React, { useState } from 'react';
import { RefreshCw, Filter, Plus, Download, ChevronDown, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import type { WorkType, InterventionStatus } from '@/store/appStore';

const TECHNICIANS = ['Laia Ferré', 'Marc Puigdomènech', 'Jordi Casals', 'Núria Valls', 'Pau Ribas'];

interface NewInterventionForm {
  workType: WorkType;
  address: string;
  municipality: string;
  client: string;
  chargerModel: string;
  technician: string;
  scheduledTime: string;
  estimatedDuration: string;
  slaDeadline: string;
  description: string;
}

const emptyForm: NewInterventionForm = {
  workType: 'correctiu-critic',
  address: '',
  municipality: '',
  client: '',
  chargerModel: '',
  technician: '',
  scheduledTime: '',
  estimatedDuration: '60',
  slaDeadline: '',
  description: '',
};

export default function OperationsHeader() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState('avui');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [form, setForm] = useState<NewInterventionForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<NewInterventionForm>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { addIntervention, interventions } = useAppStore();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Dades actualitzades', { description: `Última sincronització: ${new Date().toLocaleTimeString('ca-ES')}` });
    }, 1200);
  };

  const dateOptions = [
    { value: 'avui', label: 'Avui, 26 Mar' },
    { value: 'dema', label: 'Demà, 27 Mar' },
    { value: 'setmana', label: 'Aquesta setmana' },
    { value: 'proxima', label: 'Pròxima setmana' },
  ];

  const handleExport = () => {
    const headers = ['ID', 'Tipus', 'SAT', 'Adreça', 'Municipi', 'Client', 'Tècnic', 'Hora', 'Durada', 'SLA', 'Estat'];
    const rows = interventions.map((i) => [
      i.id, i.workType, i.satNumber ?? '', i.address, i.municipality, i.client,
      i.technician ?? '', i.scheduledTime ?? '', `${i.estimatedDuration}min`, i.slaDeadline ?? '', i.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intervencions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportació completada', { description: `${interventions.length} intervencions exportades en CSV.` });
  };

  const validateForm = (): boolean => {
    const errors: Partial<NewInterventionForm> = {};
    if (!form.address.trim()) errors.address = 'Obligatori';
    if (!form.municipality.trim()) errors.municipality = 'Obligatori';
    if (!form.client.trim()) errors.client = 'Obligatori';
    if (!form.description.trim()) errors.description = 'Obligatori';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveIntervention = () => {
    if (!validateForm()) {
      toast.error('Omple els camps obligatoris');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      addIntervention({
        aiScore: Math.floor(Math.random() * 30) + 50,
        workType: form.workType,
        status: form.technician ? 'assignada' : 'pendent' as InterventionStatus,
        satNumber: `SAT-${Math.floor(Math.random() * 1000) + 2900}`,
        address: form.address,
        municipality: form.municipality,
        client: form.client,
        chargerModel: form.chargerModel || 'Pendent especificar',
        technician: form.technician || null,
        scheduledTime: form.scheduledTime || null,
        estimatedDuration: parseInt(form.estimatedDuration) || 60,
        slaDeadline: form.slaDeadline || null,
        slaRisk: form.workType === 'correctiu-critic' ? 'critica' : form.workType === 'diagnosi' ? 'alta' : 'normal',
        description: form.description,
        distance: Math.floor(Math.random() * 30),
      });
      setIsSaving(false);
      setShowNewModal(false);
      setForm(emptyForm);
      toast.success('Intervenció creada', { description: `Nova intervenció afegida a la cua amb prioritat IA.` });
    }, 800);
  };

  return (
    <>
      <div className="bg-card border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Centre de Control Operatiu</h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              En viu
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Planificació d&apos;intervencions · Camp de Tarragona · Dijous, 26 de Març de 2026
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              {dateOptions.map((opt) => (
                <option key={`date-${opt.value}`} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>

          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-150
              ${showFilterPanel ? 'bg-primary text-white border-primary' : 'text-muted-foreground bg-card border-border hover:bg-muted'}`}
          >
            <Filter size={14} />
            Filtres
          </button>

          <button
            onClick={handleRefresh}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-all duration-150 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Actualitzar
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-all duration-150"
          >
            <Download size={14} />
            Exportar
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150 shadow-sm"
          >
            <Plus size={14} />
            Nova Intervenció
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-muted/50 border-b border-border px-6 py-3 flex flex-wrap items-center gap-4 animate-fade-in">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtres actius:</span>
          <div className="flex items-center gap-2 flex-wrap">
            {['Correctiu Crític', 'Correctiu No Crític', 'Preventiu', 'Posada en Marxa', 'Diagnosi'].map((type) => (
              <button
                key={`filt-${type}`}
                className="px-2.5 py-1 text-xs font-medium bg-card border border-border rounded-full text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all duration-150"
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">Municipis:</span>
            <select className="text-xs px-2 py-1 bg-card border border-border rounded-md text-foreground focus:outline-none">
              <option>Tots</option>
              <option>Tarragona</option>
              <option>Reus</option>
              <option>Salou</option>
              <option>Cambrils</option>
              <option>Vila-seca</option>
            </select>
            <button
              onClick={() => { setShowFilterPanel(false); toast.info('Filtres esborrats'); }}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Esborrar filtres
            </button>
          </div>
        </div>
      )}

      {/* New Intervention Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Plus size={16} className="text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-base">Nova Intervenció</h3>
              </div>
              <button
                onClick={() => { setShowNewModal(false); setForm(emptyForm); setFormErrors({}); }}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Work Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Tipus de treball <span className="text-red-500">*</span></label>
                <select
                  value={form.workType}
                  onChange={(e) => setForm({ ...form, workType: e.target.value as WorkType })}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="correctiu-critic">Correctiu Crític</option>
                  <option value="correctiu-no-critic">Correctiu No Crític</option>
                  <option value="preventiu">Manteniment Preventiu</option>
                  <option value="posada-marxa">Posada en Marxa</option>
                  <option value="diagnosi">Visita de Diagnosi</option>
                </select>
              </div>

              {/* Address + Municipality */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Adreça <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Av. Exemple, 123"
                    className={`w-full px-3 py-2.5 text-sm bg-muted border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.address ? 'border-red-400' : 'border-border'}`}
                  />
                  {formErrors.address && <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Municipi <span className="text-red-500">*</span></label>
                  <select
                    value={form.municipality}
                    onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                    className={`w-full px-3 py-2.5 text-sm bg-muted border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.municipality ? 'border-red-400' : 'border-border'}`}
                  >
                    <option value="">Selecciona...</option>
                    <option>Tarragona</option>
                    <option>Reus</option>
                    <option>Salou</option>
                    <option>Cambrils</option>
                    <option>Vila-seca</option>
                    <option>Altafulla</option>
                    <option>Torredembarra</option>
                  </select>
                  {formErrors.municipality && <p className="text-xs text-red-500 mt-1">{formErrors.municipality}</p>}
                </div>
              </div>

              {/* Client + Charger */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Client <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.client}
                    onChange={(e) => setForm({ ...form, client: e.target.value })}
                    placeholder="Nom del client"
                    className={`w-full px-3 py-2.5 text-sm bg-muted border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${formErrors.client ? 'border-red-400' : 'border-border'}`}
                  />
                  {formErrors.client && <p className="text-xs text-red-500 mt-1">{formErrors.client}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Model carregador</label>
                  <input
                    type="text"
                    value={form.chargerModel}
                    onChange={(e) => setForm({ ...form, chargerModel: e.target.value })}
                    placeholder="Ex: Wallbox Commander 2"
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Technician + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Tècnic assignat</label>
                  <select
                    value={form.technician}
                    onChange={(e) => setForm({ ...form, technician: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Sense assignar</option>
                    {TECHNICIANS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Hora planificada</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Duration + SLA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Durada estimada (min)</label>
                  <select
                    value={form.estimatedDuration}
                    onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                    <option value="150">150 min</option>
                    <option value="180">180 min</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Termini SLA</label>
                  <input
                    type="text"
                    value={form.slaDeadline}
                    onChange={(e) => setForm({ ...form, slaDeadline: e.target.value })}
                    placeholder="Ex: 14:00 o 27/03"
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Descripció <span className="text-red-500">*</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descriu la incidència o el treball a realitzar..."
                  rows={3}
                  className={`w-full px-3 py-2.5 text-sm bg-muted border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none ${formErrors.description ? 'border-red-400' : 'border-border'}`}
                />
                {formErrors.description && <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>}
              </div>

              {form.workType === 'correctiu-critic' && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    Correctiu Crític: La IA assignarà prioritat màxima i notificarà al tècnic disponible més proper.
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center gap-3 sticky bottom-0 bg-card">
              <button
                onClick={() => { setShowNewModal(false); setForm(emptyForm); setFormErrors({}); }}
                className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all"
              >
                Cancel·lar
              </button>
              <button
                onClick={handleSaveIntervention}
                disabled={isSaving}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition-all duration-150 active:scale-95
                  ${isSaving ? 'bg-primary/60 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'}`}
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardant...</>
                ) : (
                  <><Plus size={14} />Crear Intervenció</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}