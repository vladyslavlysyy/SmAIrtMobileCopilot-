'use client';

import React, { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ManualTaskPanelProps {
  onTaskCreated: () => Promise<void> | void;
}

export default function ManualTaskPanel({ onTaskCreated }: ManualTaskPanelProps) {
  const [mode, setMode] = useState<'contracte' | 'incidencia'>('contracte');
  const [isCreating, setIsCreating] = useState(false);

  const [contractId, setContractId] = useState('');
  const [contractType, setContractType] = useState<'preventivo' | 'puesta_en_marcha'>('preventivo');
  const [contractTechnician, setContractTechnician] = useState('');
  const [contractDate, setContractDate] = useState('');

  const [incidenceId, setIncidenceId] = useState('');
  const [incidenceTechnician, setIncidenceTechnician] = useState('');
  const [escalateTo, setEscalateTo] = useState<'none' | 'p4' | 'p5'>('none');

  const createFromContract = async () => {
    const parsedContractId = Number(contractId);
    if (!Number.isFinite(parsedContractId) || parsedContractId <= 0) {
      toast.error('Contracte invàlid');
      return;
    }

    const parsedTech = contractTechnician.trim() ? Number(contractTechnician) : undefined;
    if (contractTechnician.trim() && (!Number.isFinite(parsedTech) || (parsedTech ?? 0) <= 0)) {
      toast.error('ID de tècnic invàlid');
      return;
    }

    await api.createVisitFromContract({
      contract_id: parsedContractId,
      technician_id: parsedTech,
      visit_type: contractType,
      planned_date: contractDate || undefined,
    });

    toast.success('Tasca manual creada des de contracte');
    setContractId('');
    setContractTechnician('');
    setContractDate('');
  };

  const createFromIncidence = async () => {
    const parsedIncidenceId = Number(incidenceId);
    if (!Number.isFinite(parsedIncidenceId) || parsedIncidenceId <= 0) {
      toast.error('Incidència invàlida');
      return;
    }

    const parsedTech = incidenceTechnician.trim() ? Number(incidenceTechnician) : undefined;
    if (incidenceTechnician.trim() && (!Number.isFinite(parsedTech) || (parsedTech ?? 0) <= 0)) {
      toast.error('ID de tècnic invàlid');
      return;
    }

    await api.createVisitFromIncidence({
      incidence_id: parsedIncidenceId,
      technician_id: parsedTech,
      escalate_to: escalateTo === 'none' ? undefined : escalateTo,
    });

    toast.success('Tasca manual creada des d\'incidència');
    setIncidenceId('');
    setIncidenceTechnician('');
    setEscalateTo('none');
  };

  const handleSubmit = async () => {
    try {
      setIsCreating(true);
      if (mode === 'contracte') {
        await createFromContract();
      } else {
        await createFromIncidence();
      }

      await onTaskCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No s\'ha pogut crear la tasca manual');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-mobility-surface border border-mobility-border rounded-xl shadow-sm p-4 space-y-3">
      <div>
        <h3 className="text-base font-bold text-mobility-primary flex items-center gap-2">
          <PlusCircle size={16} className="text-mobility-accent" />
          Gestió manual de tasques
        </h3>
        <p className="text-xs text-mobility-muted">
          Crea visites manualment i deixa-les assignades al calendari amb control d\'admin.
        </p>
      </div>

      <div className="inline-flex bg-mobility-background rounded-lg border border-mobility-border p-1">
        <button
          onClick={() => setMode('contracte')}
          className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
            mode === 'contracte' ? 'bg-mobility-accent text-white' : 'text-mobility-muted'
          }`}
        >
          Des de contracte
        </button>
        <button
          onClick={() => setMode('incidencia')}
          className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all ${
            mode === 'incidencia' ? 'bg-mobility-accent text-white' : 'text-mobility-muted'
          }`}
        >
          Des d'incidència
        </button>
      </div>

      {mode === 'contracte' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">ID contracte</span>
            <input
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Ex: 12"
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">Tipus visita</span>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as 'preventivo' | 'puesta_en_marcha')}
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            >
              <option value="preventivo">Preventiu</option>
              <option value="puesta_en_marcha">Posada en marxa</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">ID tècnic (opcional)</span>
            <input
              value={contractTechnician}
              onChange={(e) => setContractTechnician(e.target.value)}
              placeholder="Ex: 3"
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">Data/hora (opcional)</span>
            <input
              type="datetime-local"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">ID incidència</span>
            <input
              value={incidenceId}
              onChange={(e) => setIncidenceId(e.target.value)}
              placeholder="Ex: 45"
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">ID tècnic (opcional)</span>
            <input
              value={incidenceTechnician}
              onChange={(e) => setIncidenceTechnician(e.target.value)}
              placeholder="Ex: 2"
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs text-mobility-muted">Escalat (opcional)</span>
            <select
              value={escalateTo}
              onChange={(e) => setEscalateTo(e.target.value as 'none' | 'p4' | 'p5')}
              className="w-full rounded-lg border border-mobility-border bg-mobility-background px-3 py-2 text-sm text-mobility-primary"
            >
              <option value="none">Sense escalar</option>
              <option value="p4">P4</option>
              <option value="p5">P5</option>
            </select>
          </label>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isCreating}
          className="px-3 py-2 text-sm rounded-lg bg-mobility-accent text-white font-semibold hover:brightness-110 disabled:opacity-60"
        >
          {isCreating ? 'Creant tasca...' : 'Crear tasca manual'}
        </button>
      </div>
    </div>
  );
}
