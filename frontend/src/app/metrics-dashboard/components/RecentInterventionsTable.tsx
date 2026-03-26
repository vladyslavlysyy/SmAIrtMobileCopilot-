'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  X,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type Visit } from '@/lib/api';

type WorkType =
  | 'critical-corrective'
  | 'non-critical-corrective'
  | 'maintenance'
  | 'commissioning'
  | 'diagnosis';

interface RecentIntervention {
  id: string;
  date: string;
  plannedDateIso: string;
  workType: WorkType;
  address: string;
  municipality: string;
  client: string;
  technician: string;
  duration: number;
  kmViatge: number;
  slaComplert: boolean;
  satNumber: string | null;
  status: 'completada' | 'en-curs';
}

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  'critical-corrective': 'Correctiu Crític',
  'non-critical-corrective': 'Correctiu No Crític',
  maintenance: 'Preventiu',
  commissioning: 'Posada en Marxa',
  diagnosis: 'Diagnosi',
};

const WORK_TYPE_CLASSES: Record<WorkType, string> = {
  'critical-corrective': 'badge-correctiu-critic',
  'non-critical-corrective': 'badge-correctiu-no-critic',
  maintenance: 'badge-preventiu',
  commissioning: 'badge-posada-marxa',
  diagnosis: 'badge-diagnosi',
};

const VISIT_TYPE_TO_WORK_TYPE: Record<string, WorkType> = {
  critical_corrective: 'critical-corrective',
  non_critical_corrective: 'non-critical-corrective',
  maintenance: 'maintenance',
  commissioning: 'commissioning',
  diagnosis: 'diagnosis',
  correctivo_critico: 'critical-corrective',
  correctivo_no_critico: 'non-critical-corrective',
  preventivo: 'maintenance',
  puesta_en_marcha: 'commissioning',
  diagnosi: 'diagnosis',
  maintainance: 'maintenance',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function extractMunicipality(address: string | null, postalCode: string | null): string {
  if (address) {
    const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 1) return parts[parts.length - 1];
  }
  if (postalCode) return `CP ${postalCode}`;
  return 'Sense municipi';
}

function mapVisitToRecentIntervention(
  visit: Visit,
  technicianNameById: Map<number, string>,
  satByVisit: Map<number, string>
): RecentIntervention {
  const normalizedWorkType = VISIT_TYPE_TO_WORK_TYPE[visit.visit_type] ?? 'diagnosis';
  const status = visit.status === 'completed' ? 'completada' : 'en-curs';
  const technician =
    visit.technician_id != null
      ? (technicianNameById.get(visit.technician_id) ?? `Tècnic #${visit.technician_id}`)
      : 'No assignat';

  return {
    id: `VIS-${visit.id}`,
    date: formatDate(visit.planned_date),
    plannedDateIso: visit.planned_date,
    workType: normalizedWorkType,
    address: visit.address ?? (visit.postal_code ? `Zona ${visit.postal_code}` : 'Sense adreça'),
    municipality: extractMunicipality(visit.address, visit.postal_code),
    client: visit.contract_id ? `Contracte #${visit.contract_id}` : 'Client no disponible',
    technician,
    duration: visit.estimated_duration ?? 0,
    kmViatge: 0,
    slaComplert: status === 'completada',
    satNumber: satByVisit.get(visit.id) ?? null,
    status,
  };
}

type SortKey = 'date' | 'duration' | 'kmViatge';
const PAGE_SIZE_OPTIONS = [5, 10, 25];

export default function RecentInterventionsTable() {
  const [recentInterventions, setRecentInterventions] = useState<RecentIntervention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailItem, setDetailItem] = useState<RecentIntervention | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadRecentInterventions = async () => {
      setIsLoading(true);
      try {
        const [visits, users] = await Promise.all([
          api.getAllVisits({}),
          api.getUsers().catch(() => []),
        ]);

        const technicianNameById = new Map<number, string>(
          users
            .filter((u) => u.is_technician && u.technician_id != null)
            .map((u) => [u.technician_id as number, u.name])
        );

        const sortedByDate = [...visits].sort(
          (a, b) => new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime()
        );
        const limitedVisits = sortedByDate.slice(0, 100);

        const reportLookups = await Promise.allSettled(
          limitedVisits.map((visit) => api.getReport(visit.id))
        );
        const satByVisit = new Map<number, string>();
        reportLookups.forEach((lookup, index) => {
          if (lookup.status === 'fulfilled') {
            satByVisit.set(limitedVisits[index].id, `REP-${lookup.value.id}`);
          }
        });

        const mapped = limitedVisits.map((visit) =>
          mapVisitToRecentIntervention(visit, technicianNameById, satByVisit)
        );

        if (isMounted) setRecentInterventions(mapped);
      } catch {
        if (isMounted) {
          setRecentInterventions([]);
          toast.error('No s\'han pogut carregar les intervencions recents');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadRecentInterventions();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(key);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const filtered = recentInterventions
    .filter((i) => {
      if (search === '') return true;
      return (
        i.address.toLowerCase().includes(search.toLowerCase()) ||
        i.municipality.toLowerCase().includes(search.toLowerCase()) ||
        i.client.toLowerCase().includes(search.toLowerCase()) ||
        i.technician.toLowerCase().includes(search.toLowerCase()) ||
        (i.satNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
      );
    })
    .sort((a, b) => {
      let val = 0;
      if (sortBy === 'date') {
        val = new Date(a.plannedDateIso).getTime() - new Date(b.plannedDateIso).getTime();
      } else if (sortBy === 'duration') val = a.duration - b.duration;
      else if (sortBy === 'kmViatge') val = a.kmViatge - b.kmViatge;
      return sortDir === 'desc' ? -val : val;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalKm = filtered.reduce((sum, i) => sum + i.kmViatge, 0);
  const avgDuration =
    filtered.length > 0
      ? Math.round(filtered.reduce((sum, i) => sum + i.duration, 0) / filtered.length)
      : 0;
  const slaRate =
    filtered.length > 0
      ? Math.round((filtered.filter((i) => i.slaComplert).length / filtered.length) * 100)
      : 0;

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortBy !== col) return <ChevronDown size={12} className="opacity-30" />;
    return sortDir === 'desc' ? (
      <ChevronDown size={12} className="text-primary" />
    ) : (
      <ChevronUp size={12} className="text-primary" />
    );
  };

  const handleViewReport = (item: RecentIntervention) => {
    toast.info(`Obrint informe ${item.satNumber ?? item.id}...`, {
      description: `${item.address} · ${item.technician}`,
    });
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-base">
              Historial d&apos;Intervencions Recents
            </h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              {isLoading
                ? 'Carregant intervencions recents...'
                : `${filtered.length} intervencions · ${totalKm} km totals · Durada mitjana: ${avgDuration} min · SLA: ${slaRate}%`}
            </p>
          </div>
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Cercar intervenció..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-2 text-sm bg-muted border border-border rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:bg-card transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Data <SortIcon col="date" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tipus
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  SAT / Obra
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Ubicació
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Tècnic
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('duration')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Durada <SortIcon col="duration" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <button
                    onClick={() => handleSort('kmViatge')}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    Km <SortIcon col="kmViatge" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  SLA
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Informe
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Carregant dades del backend...
                  </td>
                </tr>
              )}
              {!isLoading && paginated.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No hi ha intervencions per mostrar.
                  </td>
                </tr>
              )}
              {paginated.map((intervention) => (
                <tr
                  key={intervention.id}
                  className="hover:bg-muted/40 transition-colors duration-100"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {intervention.date}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${WORK_TYPE_CLASSES[intervention.workType]}`}
                    >
                      {WORK_TYPE_LABELS[intervention.workType]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {intervention.satNumber ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-foreground">{intervention.address}</p>
                    <p className="text-xs text-muted-foreground">{intervention.municipality}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-foreground truncate max-w-[160px]">
                      {intervention.client}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-foreground">{intervention.technician}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs tabular-nums text-foreground">
                      {intervention.duration} min
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs tabular-nums text-foreground">
                      {intervention.kmViatge} km
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {intervention.slaComplert ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                        ✓ Complert
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-medium">
                        ✗ Incomplert
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Veure informe"
                        onClick={() => handleViewReport(intervention)}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all duration-150"
                      >
                        <FileText size={13} />
                      </button>
                      <button
                        title="Obrir detall"
                        onClick={() => setDetailItem(intervention)}
                        className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-150"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with pagination */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-muted-foreground">
            Mostrant{' '}
            <span className="font-semibold text-foreground">
              {Math.min((currentPage - 1) * pageSize + 1, filtered.length)}–
              {Math.min(currentPage * pageSize, filtered.length)}
            </span>{' '}
            de <span className="font-semibold text-foreground">{filtered.length}</span> · SLA
            global:{' '}
            <span
              className={`font-mono font-semibold ${slaRate >= 95 ? 'text-green-600' : slaRate >= 85 ? 'text-amber-600' : 'text-red-600'}`}
            >
              {slaRate}%
            </span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 text-xs font-medium rounded-lg transition-all duration-150 text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(Math.max(0, currentPage - 2), Math.min(totalPages, currentPage + 1))
              .map((page) => (
                <button
                  key={`histpage-${page}`}
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
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2 py-1 bg-card border border-border rounded-md focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">
                  {detailItem.satNumber ?? detailItem.id}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {detailItem.date} · {detailItem.municipality}
                </p>
              </div>
              <button
                onClick={() => setDetailItem(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle2 size={16} className="text-green-600" />
                <span className="text-sm font-semibold text-green-800">Intervenció completada</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tipus</p>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${WORK_TYPE_CLASSES[detailItem.workType]}`}
                  >
                    {WORK_TYPE_LABELS[detailItem.workType]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SLA</p>
                  {detailItem.slaComplert ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                      ✓ Complert
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-medium">
                      ✗ Incomplert
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Adreça</p>
                  <p className="font-medium">{detailItem.address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Client</p>
                  <p className="font-medium">{detailItem.client}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tècnic</p>
                  <p className="font-medium">{detailItem.technician}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Durada real</p>
                  <p className="font-mono font-medium">{detailItem.duration} min</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Km recorreguts</p>
                  <p className="font-mono font-medium">{detailItem.kmViatge} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data</p>
                  <p className="font-mono font-medium">{detailItem.date}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={() => {
                  handleViewReport(detailItem);
                  setDetailItem(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all"
              >
                <FileText size={14} />
                Veure informe
              </button>
              <button
                onClick={() => setDetailItem(null)}
                className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all"
              >
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
