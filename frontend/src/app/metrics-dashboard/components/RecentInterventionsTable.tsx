'use client';

import React, { useState } from 'react';
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

type WorkType =
  | 'correctiu-critic'
  | 'correctiu-no-critic'
  | 'preventiu'
  | 'posada-marxa'
  | 'diagnosi';

interface RecentIntervention {
  id: string;
  date: string;
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
  'correctiu-critic': 'Correctiu Crític',
  'correctiu-no-critic': 'Correctiu No Crític',
  preventiu: 'Preventiu',
  'posada-marxa': 'Posada en Marxa',
  diagnosi: 'Diagnosi',
};

const WORK_TYPE_CLASSES: Record<WorkType, string> = {
  'correctiu-critic': 'badge-correctiu-critic',
  'correctiu-no-critic': 'badge-correctiu-no-critic',
  preventiu: 'badge-preventiu',
  'posada-marxa': 'badge-posada-marxa',
  diagnosi: 'badge-diagnosi',
};

const recentInterventions: RecentIntervention[] = [
  {
    id: 'hist-001',
    date: '26/03/2026',
    workType: 'preventiu',
    address: "C/ de l'Onze de Setembre, 3",
    municipality: 'Tarragona',
    client: 'Consorci Sanitari de Tarragona',
    technician: 'Marc Puigdomènech',
    duration: 58,
    kmViatge: 0,
    slaComplert: true,
    satNumber: null,
    status: 'completada',
  },
  {
    id: 'hist-002',
    date: '26/03/2026',
    workType: 'preventiu',
    address: 'Av. de Roma, 78',
    municipality: 'Tarragona',
    client: 'Consorci Sanitari de Tarragona',
    technician: 'Marc Puigdomènech',
    duration: 62,
    kmViatge: 3,
    slaComplert: true,
    satNumber: null,
    status: 'completada',
  },
  {
    id: 'hist-003',
    date: '25/03/2026',
    workType: 'correctiu-critic',
    address: 'Rbla. Nova, 88',
    municipality: 'Tarragona',
    client: 'Generalitat de Catalunya',
    technician: 'Laia Ferré',
    duration: 115,
    kmViatge: 8,
    slaComplert: false,
    satNumber: 'SAT-2839',
    status: 'completada',
  },
  {
    id: 'hist-004',
    date: '25/03/2026',
    workType: 'posada-marxa',
    address: 'C/ Prat de la Riba, 12',
    municipality: 'Reus',
    client: 'Reus Mobilitat SL',
    technician: 'Jordi Casals',
    duration: 142,
    kmViatge: 15,
    slaComplert: true,
    satNumber: 'OBR-C038',
    status: 'completada',
  },
  {
    id: 'hist-005',
    date: '24/03/2026',
    workType: 'diagnosi',
    address: 'Av. Tarragona, 34',
    municipality: 'Vila-seca',
    client: 'Repsol Complexe Petroquímic',
    technician: 'Pau Ribas',
    duration: 48,
    kmViatge: 22,
    slaComplert: true,
    satNumber: 'SAT-2844',
    status: 'completada',
  },
  {
    id: 'hist-006',
    date: '24/03/2026',
    workType: 'correctiu-no-critic',
    address: 'C/ Sant Joan, 15',
    municipality: 'Cambrils',
    client: 'Cambrils Park Resort',
    technician: 'Jordi Casals',
    duration: 67,
    kmViatge: 28,
    slaComplert: true,
    satNumber: 'SAT-2841',
    status: 'completada',
  },
  {
    id: 'hist-007',
    date: '23/03/2026',
    workType: 'preventiu',
    address: 'Pg. Jaume I, 45',
    municipality: 'Salou',
    client: 'Ajuntament de Salou',
    technician: 'Núria Valls',
    duration: 55,
    kmViatge: 19,
    slaComplert: true,
    satNumber: null,
    status: 'completada',
  },
  {
    id: 'hist-008',
    date: '22/03/2026',
    workType: 'correctiu-critic',
    address: 'Av. dels Paisos Catalans, 200',
    municipality: 'Reus',
    client: 'Ajuntament de Reus',
    technician: 'Laia Ferré',
    duration: 98,
    kmViatge: 12,
    slaComplert: false,
    satNumber: 'SAT-2831',
    status: 'completada',
  },
  {
    id: 'hist-009',
    date: '21/03/2026',
    workType: 'posada-marxa',
    address: 'Av. Catalunya, 112',
    municipality: 'Cambrils',
    client: 'Mercadona SA',
    technician: 'Jordi Casals',
    duration: 155,
    kmViatge: 30,
    slaComplert: true,
    satNumber: 'OBR-C036',
    status: 'completada',
  },
  {
    id: 'hist-010',
    date: '20/03/2026',
    workType: 'diagnosi',
    address: 'Polígon Francolí, Carrer A, 8',
    municipality: 'Tarragona',
    client: 'Indústries Químiques Tarragona SL',
    technician: 'Marc Puigdomènech',
    duration: 41,
    kmViatge: 7,
    slaComplert: true,
    satNumber: 'SAT-2826',
    status: 'completada',
  },
  {
    id: 'hist-011',
    date: '19/03/2026',
    workType: 'correctiu-critic',
    address: 'C/ Major, 5',
    municipality: 'Tarragona',
    client: 'Ajuntament de Tarragona',
    technician: 'Laia Ferré',
    duration: 88,
    kmViatge: 4,
    slaComplert: true,
    satNumber: 'SAT-2820',
    status: 'completada',
  },
  {
    id: 'hist-012',
    date: '18/03/2026',
    workType: 'preventiu',
    address: 'Av. Vidal i Barraquer, 12',
    municipality: 'Tarragona',
    client: 'Hospital Joan XXIII',
    technician: 'Núria Valls',
    duration: 52,
    kmViatge: 6,
    slaComplert: true,
    satNumber: null,
    status: 'completada',
  },
];

type SortKey = 'date' | 'duration' | 'kmViatge';
const PAGE_SIZE_OPTIONS = [5, 10, 25];

export default function RecentInterventionsTable() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailItem, setDetailItem] = useState<RecentIntervention | null>(null);

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
      if (sortBy === 'duration') val = a.duration - b.duration;
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
              {filtered.length} intervencions · {totalKm} km totals · Durada mitjana: {avgDuration}
              min · SLA: {slaRate}%
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
