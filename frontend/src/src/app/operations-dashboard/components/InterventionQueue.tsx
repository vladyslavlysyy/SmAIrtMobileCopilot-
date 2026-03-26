'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, MapPin, User, Clock, AlertTriangle, CheckCircle2, ExternalLink, Edit2, UserCheck, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import type { WorkType, InterventionStatus, Intervention } from '@/store/appStore';

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  'correctiu-critic': 'Correctiu Crític',
  'correctiu-no-critic': 'Correctiu No Crític',
  'preventiu': 'Manteniment Preventiu',
  'posada-marxa': 'Posada en Marxa',
  'diagnosi': 'Visita de Diagnosi',
};

const WORK_TYPE_CLASSES: Record<WorkType, string> = {
  'correctiu-critic': 'badge-correctiu-critic',
  'correctiu-no-critic': 'badge-correctiu-no-critic',
  'preventiu': 'badge-preventiu',
  'posada-marxa': 'badge-posada-marxa',
  'diagnosi': 'badge-diagnosi',
};

const STATUS_LABELS: Record<InterventionStatus, string> = {
  pendent: 'Pendent',
  assignada: 'Assignada',
  'en-ruta': 'En Ruta',
  'en-execucio': 'En Execució',
  completada: 'Completada',
};

const STATUS_CLASSES: Record<InterventionStatus, string> = {
  pendent: 'status-pendent',
  assignada: 'status-assignada',
  'en-ruta': 'status-en-ruta',
  'en-execucio': 'status-en-execucio',
  completada: 'status-completada',
};

const TECHNICIANS = ['Laia Ferré', 'Marc Puigdomènech', 'Jordi Casals', 'Núria Valls', 'Pau Ribas'];

type SortKey = 'aiScore' | 'slaDeadline' | 'municipality';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function InterventionQueue() {
  const { interventions, updateIntervention, deleteIntervention, assignTechnician } = useAppStore();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<WorkType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<InterventionStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('aiScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail modal
  const [detailIntervention, setDetailIntervention] = useState<Intervention | null>(null);
  // Edit modal
  const [editIntervention, setEditIntervention] = useState<Intervention | null>(null);
  const [editForm, setEditForm] = useState<Partial<Intervention>>({});
  // Assign modal
  const [assignIntervention, setAssignIntervention] = useState<Intervention | null>(null);
  const [assignTech, setAssignTech] = useState('');
  const [assignTime, setAssignTime] = useState('');

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
    setCurrentPage(1);
  };

  const filtered = interventions
    .filter((i) => {
      const matchSearch =
        search === '' ||
        i.address.toLowerCase().includes(search.toLowerCase()) ||
        i.municipality.toLowerCase().includes(search.toLowerCase()) ||
        i.client.toLowerCase().includes(search.toLowerCase()) ||
        (i.satNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchType = filterType === 'all' || i.workType === filterType;
      const matchStatus = filterStatus === 'all' || i.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    })
    .sort((a, b) => {
      let val = 0;
      if (sortBy === 'aiScore') val = a.aiScore - b.aiScore;
      else if (sortBy === 'municipality') val = a.municipality.localeCompare(b.municipality);
      return sortDir === 'desc' ? -val : val;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = (id: string) => {
    deleteIntervention(id);
    toast.error('Intervenció eliminada', { description: `Intervenció ${id} eliminada del pla.` });
  };

  const handleOpenEdit = (intervention: Intervention) => {
    setEditIntervention(intervention);
    setEditForm({ ...intervention });
  };

  const handleSaveEdit = () => {
    if (!editIntervention) return;
    updateIntervention(editIntervention.id, editForm);
    setEditIntervention(null);
    toast.success('Intervenció actualitzada', { description: 'Els canvis s\'han guardat correctament.' });
  };

  const handleOpenAssign = (intervention: Intervention) => {
    setAssignIntervention(intervention);
    setAssignTech(intervention.technician || '');
    setAssignTime(intervention.scheduledTime || '');
  };

  const handleConfirmAssign = () => {
    if (!assignIntervention || !assignTech) {
      toast.error('Selecciona un tècnic');
      return;
    }
    assignTechnician(assignIntervention.id, assignTech, assignTime);
    setAssignIntervention(null);
    toast.success(`Assignat a ${assignTech}`, { description: `Intervenció ${assignIntervention.id} assignada correctament.` });
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown size={12} className="text-primary" /> : <ChevronUp size={12} className="text-primary" />;
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-foreground text-base">Cua d&apos;Intervencions</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {filtered.length} intervencions · Ordenades per puntuació IA
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cercar per adreça, client, SAT..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-2 text-sm bg-muted border border-border rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value as WorkType | 'all'); setCurrentPage(1); }}
              className="text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              <option value="all">Tots els tipus</option>
              <option value="correctiu-critic">Correctiu Crític</option>
              <option value="correctiu-no-critic">Correctiu No Crític</option>
              <option value="preventiu">Preventiu</option>
              <option value="posada-marxa">Posada en Marxa</option>
              <option value="diagnosi">Diagnosi</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as InterventionStatus | 'all'); setCurrentPage(1); }}
              className="text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground"
            >
              <option value="all">Tots els estats</option>
              <option value="pendent">Pendent</option>
              <option value="assignada">Assignada</option>
              <option value="en-ruta">En Ruta</option>
              <option value="en-execucio">En Execució</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin flex-1">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-10">
                  <button onClick={() => handleSort('aiScore')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    IA <SortIcon col="aiScore" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipus</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">ID / SAT</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <button onClick={() => handleSort('municipality')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Ubicació <SortIcon col="municipality" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tècnic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">SLA</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estat</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((intervention) => (
                <React.Fragment key={intervention.id}>
                  <tr
                    className={`hover:bg-muted/40 transition-colors duration-100 cursor-pointer
                      ${intervention.slaRisk === 'critica' ? 'bg-red-50/50' : ''}`}
                    onClick={() => setExpandedRow(expandedRow === intervention.id ? null : intervention.id)}
                  >
                    {/* AI Score */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-center">
                        <span className={`font-mono font-bold text-sm tabular-nums
                          ${intervention.aiScore >= 90 ? 'text-red-600' :
                            intervention.aiScore >= 70 ? 'text-amber-600' : 'text-slate-500'}`}>
                          {intervention.aiScore}
                        </span>
                        <div className="w-8 h-1 rounded-full bg-slate-200 mt-1">
                          <div
                            className={`h-1 rounded-full ${intervention.aiScore >= 90 ? 'bg-red-500' :
                              intervention.aiScore >= 70 ? 'bg-amber-500' : 'bg-slate-400'}`}
                            style={{ width: `${intervention.aiScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Work Type */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${WORK_TYPE_CLASSES[intervention.workType]}`}>
                        {WORK_TYPE_LABELS[intervention.workType]}
                      </span>
                    </td>

                    {/* ID */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-muted-foreground">{intervention.satNumber ?? '—'}</span>
                      <p className="text-xs text-muted-foreground/70">{intervention.id}</p>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-foreground text-xs leading-tight">{intervention.address}</p>
                          <p className="text-muted-foreground text-xs">{intervention.municipality}</p>
                        </div>
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{intervention.client}</p>
                      <p className="text-xs text-muted-foreground">{intervention.chargerModel}</p>
                    </td>

                    {/* Technician */}
                    <td className="px-4 py-3">
                      {intervention.technician ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User size={11} className="text-primary" />
                          </div>
                          <span className="text-xs font-medium text-foreground">{intervention.technician}</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenAssign(intervention); }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-md hover:bg-amber-200 transition-colors"
                        >
                          <UserCheck size={11} />
                          Assignar
                        </button>
                      )}
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Clock size={11} className="text-muted-foreground" />
                        <span className="font-mono tabular-nums">{intervention.scheduledTime ?? '—'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{intervention.estimatedDuration}min</p>
                    </td>

                    {/* SLA */}
                    <td className="px-4 py-3">
                      {intervention.slaDeadline ? (
                        <div className={`flex items-center gap-1 text-xs font-medium
                          ${intervention.slaRisk === 'critica' ? 'text-red-600' :
                            intervention.slaRisk === 'alta' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {intervention.slaRisk !== 'normal' && <AlertTriangle size={11} />}
                          {intervention.slaDeadline}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <select
                        value={intervention.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateIntervention(intervention.id, { status: e.target.value as InterventionStatus });
                          toast.success('Estat actualitzat', { description: `${intervention.id} → ${STATUS_LABELS[e.target.value as InterventionStatus]}` });
                        }}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none ${STATUS_CLASSES[intervention.status]}`}
                      >
                        {(Object.keys(STATUS_LABELS) as InterventionStatus[]).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Veure detall"
                          onClick={() => setDetailIntervention(intervention)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-150"
                        >
                          <ExternalLink size={13} />
                        </button>
                        <button
                          title="Editar"
                          onClick={() => handleOpenEdit(intervention)}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-150"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          title="Eliminar intervenció"
                          onClick={() => handleDelete(intervention.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-150"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expandedRow === intervention.id && (
                    <tr key={`${intervention.id}-expanded`} className="bg-blue-50/50">
                      <td colSpan={10} className="px-8 py-4">
                        <div className="flex items-start gap-6">
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripció de la incidència</p>
                            <p className="text-sm text-foreground">{intervention.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                toast.info('Agrupant visites properes...', { description: 'La IA cerca intervencions a menys de 5km.' });
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-all"
                            >
                              Agrupar amb properes
                            </button>
                            <button
                              onClick={() => {
                                updateIntervention(intervention.id, { status: 'en-ruta' });
                                toast.success('Ruta optimitzada', { description: 'El tècnic ha rebut la nova ruta.' });
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 transition-all"
                            >
                              Optimitzar ruta
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CheckCircle2 size={40} className="text-muted-foreground/30 mb-3" />
              <p className="text-foreground font-medium">Cap intervenció trobada</p>
              <p className="text-muted-foreground text-sm mt-1">Prova d&apos;ajustar els filtres de cerca</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Mostrant <span className="font-semibold text-foreground">{Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–{Math.min(currentPage * pageSize, filtered.length)}</span> de{' '}
            <span className="font-semibold text-foreground">{filtered.length}</span> intervencions
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 text-xs font-medium rounded-lg transition-all duration-150 text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, currentPage - 2),
              Math.min(totalPages, currentPage + 1)
            ).map((page) => (
              <button
                key={`page-${page}`}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-xs font-medium rounded-lg transition-all duration-150
                  ${page === currentPage ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-8 h-8 text-xs font-medium rounded-lg transition-all duration-150 text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Per pàgina:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="text-xs px-2 py-1 bg-card border border-border rounded-md focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <div>
                <h3 className="font-bold text-foreground">{detailIntervention.satNumber ?? detailIntervention.id}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{detailIntervention.address} · {detailIntervention.municipality}</p>
              </div>
              <button onClick={() => setDetailIntervention(null)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipus</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${WORK_TYPE_CLASSES[detailIntervention.workType]}`}>
                    {WORK_TYPE_LABELS[detailIntervention.workType]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estat</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[detailIntervention.status]}`}>
                    {STATUS_LABELS[detailIntervention.status]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                  <p className="text-sm font-medium text-foreground">{detailIntervention.client}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Carregador</p>
                  <p className="text-sm font-medium text-foreground">{detailIntervention.chargerModel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tècnic</p>
                  <p className="text-sm font-medium text-foreground">{detailIntervention.technician ?? 'Sense assignar'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Hora / Durada</p>
                  <p className="text-sm font-bold font-mono text-foreground">{detailIntervention.scheduledTime ?? '—'} · {detailIntervention.estimatedDuration}min</p>
                </div>
                {detailIntervention.slaDeadline && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SLA Termini</p>
                    <p className={`text-sm font-bold font-mono ${detailIntervention.slaRisk === 'critica' ? 'text-red-600' : detailIntervention.slaRisk === 'alta' ? 'text-amber-600' : 'text-foreground'}`}>
                      {detailIntervention.slaDeadline}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Puntuació IA</p>
                  <p className="text-sm font-bold font-mono text-primary">{detailIntervention.aiScore}/100</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descripció</p>
                <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3">{detailIntervention.description}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3 sticky bottom-0 bg-card">
              <button onClick={() => { setDetailIntervention(null); handleOpenEdit(detailIntervention); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                <Edit2 size={14} />
                Editar
              </button>
              <button onClick={() => setDetailIntervention(null)} className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all active:scale-95">
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h3 className="font-bold text-foreground">Editar Intervenció · {editIntervention.satNumber ?? editIntervention.id}</h3>
              <button onClick={() => setEditIntervention(null)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Estat</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as InterventionStatus })}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(Object.keys(STATUS_LABELS) as InterventionStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Tècnic assignat</label>
                <select
                  value={editForm.technician ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, technician: e.target.value || null })}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Sense assignar</option>
                  {TECHNICIANS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Hora planificada</label>
                  <input
                    type="time"
                    value={editForm.scheduledTime ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value || null })}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Termini SLA</label>
                  <input
                    type="text"
                    value={editForm.slaDeadline ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, slaDeadline: e.target.value || null })}
                    className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Descripció</label>
                <textarea
                  value={editForm.description ?? ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3 sticky bottom-0 bg-card">
              <button onClick={() => setEditIntervention(null)} className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all active:scale-95">
                Cancel·lar
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                <Save size={14} />
                Guardar canvis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignIntervention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Assignar Tècnic</h3>
              <button onClick={() => setAssignIntervention(null)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Intervenció</p>
                <p className="text-sm font-semibold text-foreground">{assignIntervention.satNumber ?? assignIntervention.id} · {assignIntervention.address}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Tècnic <span className="text-red-500">*</span></label>
                <select
                  value={assignTech}
                  onChange={(e) => setAssignTech(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Selecciona tècnic...</option>
                  {TECHNICIANS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Hora planificada</label>
                <input
                  type="time"
                  value={assignTime}
                  onChange={(e) => setAssignTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button onClick={() => setAssignIntervention(null)} className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all active:scale-95">
                Cancel·lar
              </button>
              <button
                onClick={handleConfirmAssign}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all active:scale-95"
              >
                <UserCheck size={14} />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}