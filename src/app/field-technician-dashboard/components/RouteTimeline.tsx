'use client';

import React, { useState } from 'react';
import { MapPin, Clock, CheckCircle2, PlayCircle, ChevronDown, ChevronUp, Zap, Package, FileText, Navigation, Camera, X } from 'lucide-react';
import { toast } from 'sonner';

type StopStatus = 'completat' | 'en-curs' | 'pendent' | 'recàrrega';
type StopType = 'correctiu-critic' | 'correctiu-no-critic' | 'preventiu' | 'posada-marxa' | 'diagnosi' | 'recàrrega';

interface RouteStop {
  id: string;
  order: number;
  status: StopStatus;
  type: StopType;
  address: string;
  municipality: string;
  client: string;
  satNumber: string | null;
  scheduledTime: string;
  estimatedArrival: string;
  estimatedDuration: number;
  batteryOnArrival: number;
  batteryAfter: number;
  distanceFromPrev: number;
  description: string;
  materials: string[];
  checklist: { id: string; label: string; done: boolean }[];
}

const initialRouteStops: RouteStop[] = [
  { id: 'stop-001', order: 1, status: 'completat', type: 'preventiu', address: 'C/ de l\'Onze de Setembre, 3', municipality: 'Tarragona', client: 'Consorci Sanitari de Tarragona', satNumber: null, scheduledTime: '08:30', estimatedArrival: '08:30', estimatedDuration: 60, batteryOnArrival: 92, batteryAfter: 89, distanceFromPrev: 0, description: 'Manteniment preventiu semestral. Inspecció visual i mesures elèctriques.', materials: ['Multímetre', 'Kit de neteja'], checklist: [{ id: 'c1-1', label: 'Inspecció visual exterior', done: true }, { id: 'c1-2', label: 'Mesures elèctriques', done: true }, { id: 'c1-3', label: 'Neteja connectors', done: true }, { id: 'c1-4', label: 'Test de funcionament', done: true }] },
  { id: 'stop-002', order: 2, status: 'completat', type: 'preventiu', address: 'Av. de Roma, 78', municipality: 'Tarragona', client: 'Consorci Sanitari de Tarragona', satNumber: null, scheduledTime: '10:00', estimatedArrival: '10:05', estimatedDuration: 60, batteryOnArrival: 87, batteryAfter: 84, distanceFromPrev: 3, description: 'Segon punt del circuit CST. Manteniment preventiu semestral.', materials: ['Multímetre', 'Kit de neteja'], checklist: [{ id: 'c2-1', label: 'Inspecció visual exterior', done: true }, { id: 'c2-2', label: 'Mesures elèctriques', done: true }, { id: 'c2-3', label: 'Neteja connectors', done: true }, { id: 'c2-4', label: 'Test de funcionament', done: true }] },
  { id: 'stop-003', order: 3, status: 'en-curs', type: 'correctiu-no-critic', address: 'Pg. de les Palmeres, 45', municipality: 'Salou', client: 'Hotel Costa Daurada Resort', satNumber: 'SAT-2863', scheduledTime: '11:00', estimatedArrival: '11:45', estimatedDuration: 60, batteryOnArrival: 72, batteryAfter: 69, distanceFromPrev: 22, description: 'Pantalla tàctil no respon correctament. Error intermitent en autorització RFID.', materials: ['Mòdul RFID de recanvi', 'Eines bàsiques'], checklist: [{ id: 'c3-1', label: 'Diagnosi inicial error RFID', done: true }, { id: 'c3-2', label: 'Substitució mòdul RFID', done: false }, { id: 'c3-3', label: 'Test autorització', done: false }, { id: 'c3-4', label: 'Validació final', done: false }] },
  { id: 'stop-004', order: 4, status: 'recàrrega', type: 'recàrrega', address: 'Estació de Recàrrega Ràpida Salou', municipality: 'Salou', client: 'Parada de recàrrega', satNumber: null, scheduledTime: '13:00', estimatedArrival: '13:00', estimatedDuration: 30, batteryOnArrival: 55, batteryAfter: 85, distanceFromPrev: 5, description: 'Parada de recàrrega planificada. Bateria baixa per continuar la ruta.', materials: [], checklist: [] },
  { id: 'stop-005', order: 5, status: 'pendent', type: 'correctiu-critic', address: 'Av. Prat de la Riba, 24', municipality: 'Tarragona', client: 'Ajuntament de Tarragona', satNumber: 'SAT-2847', scheduledTime: '14:00', estimatedArrival: '14:35', estimatedDuration: 90, batteryOnArrival: 72, batteryAfter: 65, distanceFromPrev: 18, description: 'Carregador fora de servei. Error E-07 persistent. Punt públic molt freqüentat.', materials: ['Mòdul de potència', 'Eines elèctriques', 'Multímetre'], checklist: [{ id: 'c5-1', label: 'Diagnosi error E-07', done: false }, { id: 'c5-2', label: 'Substitució component defectuós', done: false }, { id: 'c5-3', label: 'Reset i configuració', done: false }, { id: 'c5-4', label: 'Test de recàrrega complet', done: false }, { id: 'c5-5', label: 'Informe fotogràfic', done: false }] },
  { id: 'stop-006', order: 6, status: 'pendent', type: 'diagnosi', address: 'Polígon Industrial Nord, Nau 7', municipality: 'Vila-seca', client: 'Logística Mediterrànea SA', satNumber: 'SAT-2871', scheduledTime: '16:00', estimatedArrival: '16:10', estimatedDuration: 45, batteryOnArrival: 58, batteryAfter: 55, distanceFromPrev: 8, description: 'Diagnosi prèvia a intervenció correctiva. Possible problema en mòdul de potència.', materials: ['Analitzador de xarxa', 'Multímetre'], checklist: [{ id: 'c6-1', label: 'Inspecció visual mòdul de potència', done: false }, { id: 'c6-2', label: 'Mesures elèctriques avançades', done: false }, { id: 'c6-3', label: 'Documentar diagnosi', done: false }] },
  { id: 'stop-007', order: 7, status: 'pendent', type: 'preventiu', address: 'C/ Gasòmetre, 15', municipality: 'Tarragona', client: 'Residencial Ponent SCL', satNumber: 'SAT-2879', scheduledTime: '17:00', estimatedArrival: '17:05', estimatedDuration: 45, batteryOnArrival: 48, batteryAfter: 45, distanceFromPrev: 12, description: 'Cable de recàrrega deteriorat. Possible substitució necessària.', materials: ['Cable Mennekes Tipus 2', 'Eines bàsiques'], checklist: [{ id: 'c7-1', label: 'Inspecció cable', done: false }, { id: 'c7-2', label: 'Substitució si necessari', done: false }, { id: 'c7-3', label: 'Test final', done: false }] },
];

const TYPE_LABELS: Record<StopType, string> = {
  'correctiu-critic': 'Correctiu Crític',
  'correctiu-no-critic': 'Correctiu No Crític',
  'preventiu': 'Preventiu',
  'posada-marxa': 'Posada en Marxa',
  'diagnosi': 'Diagnosi',
  'recàrrega': 'Recàrrega VE',
};

const TYPE_CLASSES: Record<StopType, string> = {
  'correctiu-critic': 'badge-correctiu-critic',
  'correctiu-no-critic': 'badge-correctiu-no-critic',
  'preventiu': 'badge-preventiu',
  'posada-marxa': 'badge-posada-marxa',
  'diagnosi': 'badge-diagnosi',
  'recàrrega': 'bg-cyan-100 text-cyan-700 border border-cyan-200 font-medium',
};

function BatteryBar({ value, size = 'sm' }: { value: number; size?: 'sm' | 'lg' }) {
  const color = value >= 60 ? 'bg-green-500' : value >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const h = size === 'lg' ? 'h-2.5' : 'h-1.5';
  return (
    <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${h}`}>
      <div className={`${h} ${color} rounded-full transition-all duration-300`} style={{ width: `${value}%` }} />
    </div>
  );
}

interface ReportModalProps {
  stop: RouteStop;
  onClose: () => void;
  onSubmit: (notes: string) => void;
}

function ReportModal({ stop, onClose, onSubmit }: ReportModalProps) {
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const addPhoto = () => {
    setPhotos((prev) => [...prev, `foto_${stop.id}_${prev.length + 1}.jpg`]);
    toast.success('Foto afegida', { description: 'Evidència fotogràfica registrada.' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="font-bold text-foreground">Finalitzar Visita</h3>
            <p className="text-xs text-muted-foreground">{stop.satNumber ?? stop.id} · {stop.address}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Notes de la intervenció</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descriu el treball realitzat, peces substituïdes, observacions..."
              rows={4}
              className="w-full px-3 py-2.5 text-sm bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Evidències fotogràfiques</label>
            <button
              onClick={addPhoto}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-lg hover:bg-muted/80 transition-all w-full justify-center"
            >
              <Camera size={14} />
              Afegir foto
            </button>
            {photos.length > 0 && (
              <div className="mt-2 space-y-1">
                {photos.map((p) => (
                  <div key={p} className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <CheckCircle2 size={12} />
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">Resultat de la visita</label>
            <div className="grid grid-cols-2 gap-2">
              {['Resolt completament', 'Resolt parcialment', 'Pendent recanvi', 'Requereix nova visita'].map((r) => (
                <button key={r} className="px-3 py-2 text-xs font-medium bg-muted border border-border rounded-lg hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all text-left">
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-3 sticky bottom-0 bg-card">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all">
            Cancel·lar
          </button>
          <button
            onClick={() => onSubmit(notes)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-all active:scale-95"
          >
            <CheckCircle2 size={14} />
            Confirmar i enviar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RouteTimeline() {
  const [stops, setStops] = useState<RouteStop[]>(initialRouteStops);
  const [expandedStop, setExpandedStop] = useState<string | null>('stop-003');
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    initialRouteStops.forEach((s) => s.checklist.forEach((c) => { init[c.id] = c.done; }));
    return init;
  });
  const [reportStop, setReportStop] = useState<RouteStop | null>(null);
  const [viewingReport, setViewingReport] = useState<string | null>(null);

  const completedCount = stops.filter((s) => s.status === 'completat').length;

  const toggleCheck = (id: string) => {
    setChecklistState((prev) => ({ ...prev, [id]: !prev[id] }));
    toast.success('Pas registrat', { description: 'L\'evidència s\'ha guardat correctament.' });
  };

  const handleStartVisit = (stopId: string) => {
    setStops((prev) => prev.map((s) => s.id === stopId ? { ...s, status: 'en-curs' as StopStatus } : s));
    toast.success('Visita iniciada', { description: 'El registre d\'inici s\'ha enviat a operacions.' });
  };

  const handleCompleteVisit = (stop: RouteStop) => {
    setReportStop(stop);
  };

  const handleSubmitReport = (notes: string) => {
    if (!reportStop) return;
    setStops((prev) => prev.map((s) => s.id === reportStop.id ? { ...s, status: 'completat' as StopStatus } : s));
    setReportStop(null);
    toast.success('Visita completada', { description: 'Informe generat i enviat al client i a operacions.' });
  };

  const handleNavigate = () => {
    const currentStop = stops.find((s) => s.status === 'en-curs' || s.status === 'pendent');
    if (currentStop) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentStop.address + ', ' + currentStop.municipality)}`;
      window.open(url, '_blank');
      toast.info('Obrint Google Maps...', { description: `Ruta cap a ${currentStop.address}` });
    } else {
      toast.info('Ruta completada', { description: 'Totes les visites han estat completades.' });
    }
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground text-base">Ruta del Dia</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {stops.length} parades · ~342 km totals · {completedCount}/{stops.length} completades
            </p>
          </div>
          <button
            onClick={handleNavigate}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
          >
            <Navigation size={14} />
            Navegar
          </button>
        </div>

        <div className="divide-y divide-border overflow-y-auto max-h-[620px] scrollbar-thin">
          {stops.map((stop, idx) => {
            const isExpanded = expandedStop === stop.id;
            const isRecharge = stop.type === 'recàrrega';
            const completedChecks = stop.checklist.filter((c) => checklistState[c.id]).length;

            return (
              <div key={stop.id} className={`transition-colors duration-100 ${
                stop.status === 'en-curs' ? 'bg-blue-50/60' :
                stop.status === 'completat' ? 'bg-muted/20' : ''
              }`}>
                <div
                  className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                >
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                      ${stop.status === 'completat' ? 'bg-green-500 border-green-500' :
                        stop.status === 'en-curs'? 'bg-blue-500 border-blue-500 animate-pulse' : isRecharge ?'bg-cyan-100 border-cyan-400' : 'bg-card border-border'
                      }`}>
                      {stop.status === 'completat' ? (
                        <CheckCircle2 size={16} className="text-white" />
                      ) : stop.status === 'en-curs' ? (
                        <PlayCircle size={16} className="text-white" />
                      ) : isRecharge ? (
                        <Zap size={14} className="text-cyan-600" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{stop.order}</span>
                      )}
                    </div>
                    {idx < stops.length - 1 && (
                      <div className={`w-0.5 h-6 mt-1 ${stop.status === 'completat' ? 'bg-green-300' : 'bg-border'}`} />
                    )}
                  </div>

                  {/* Stop content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${TYPE_CLASSES[stop.type]}`}>
                          {TYPE_LABELS[stop.type]}
                        </span>
                        {stop.satNumber && <span className="font-mono text-xs text-muted-foreground">{stop.satNumber}</span>}
                        {stop.status === 'en-curs' && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                            En curs
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Clock size={12} className="text-muted-foreground" />
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">{stop.estimatedArrival}</span>
                        {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mb-1">
                      <MapPin size={12} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-semibold text-foreground truncate">{stop.address}</p>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{stop.municipality}</span>
                    </div>

                    {!isRecharge && <p className="text-xs text-muted-foreground truncate">{stop.client}</p>}

                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <Zap size={11} className={`flex-shrink-0 ${stop.batteryOnArrival < 30 ? 'text-red-500' : stop.batteryOnArrival < 60 ? 'text-amber-500' : 'text-green-500'}`} />
                        <div className="flex-1"><BatteryBar value={stop.batteryOnArrival} /></div>
                        <span className={`font-mono text-xs tabular-nums font-semibold flex-shrink-0 ${stop.batteryOnArrival < 30 ? 'text-red-600' : stop.batteryOnArrival < 60 ? 'text-amber-600' : 'text-green-600'}`}>
                          {stop.batteryOnArrival}%
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{stop.estimatedDuration}min</span>
                      {stop.distanceFromPrev > 0 && <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">{stop.distanceFromPrev}km</span>}
                    </div>

                    {stop.checklist.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-1 bg-primary rounded-full" style={{ width: `${(completedChecks / stop.checklist.length) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{completedChecks}/{stop.checklist.length}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && !isRecharge && (
                  <div className="px-5 pb-5 ml-12 animate-fade-in">
                    <div className="bg-muted/40 rounded-xl p-4 border border-border space-y-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Descripció</p>
                        <p className="text-sm text-foreground">{stop.description}</p>
                      </div>

                      {stop.materials.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Package size={12} className="text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Material necessari</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {stop.materials.map((mat) => (
                              <span key={`mat-${stop.id}-${mat}`} className="px-2 py-1 bg-card border border-border rounded-md text-xs text-foreground">{mat}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {stop.checklist.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <FileText size={12} className="text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checklist d&apos;intervenció</p>
                          </div>
                          <div className="space-y-2">
                            {stop.checklist.map((item) => (
                              <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                  type="checkbox"
                                  checked={checklistState[item.id] ?? false}
                                  onChange={() => toggleCheck(item.id)}
                                  disabled={stop.status === 'completat'}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30 accent-blue-600"
                                />
                                <span className={`text-sm transition-all ${checklistState[item.id] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                  {item.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {stop.status === 'pendent' && (
                          <button
                            onClick={() => handleStartVisit(stop.id)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-95 transition-all"
                          >
                            <PlayCircle size={14} />
                            Iniciar visita
                          </button>
                        )}
                        {stop.status === 'en-curs' && (
                          <>
                            <button
                              onClick={() => handleCompleteVisit(stop)}
                              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 active:scale-95 transition-all"
                            >
                              <CheckCircle2 size={14} />
                              Finalitzar i generar informe
                            </button>
                            <button
                              onClick={() => {
                                const photoName = `foto_${stop.id}_${Date.now()}.jpg`;
                                toast.success('Foto afegida', { description: `${photoName} registrada com a evidència.` });
                              }}
                              className="px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-all flex items-center gap-1.5"
                            >
                              <Camera size={14} />
                              Afegir foto
                            </button>
                          </>
                        )}
                        {stop.status === 'completat' && (
                          <button
                            onClick={() => setViewingReport(stop.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-200 rounded-lg hover:bg-green-200 transition-all"
                          >
                            <FileText size={14} />
                            Veure informe
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isExpanded && isRecharge && (
                  <div className="px-5 pb-5 ml-12 animate-fade-in">
                    <div className="bg-cyan-50 rounded-xl p-4 border border-cyan-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-cyan-100 rounded-lg">
                          <Zap size={18} className="text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-cyan-800 text-sm">Parada de recàrrega planificada</p>
                          <p className="text-xs text-cyan-600 mt-0.5">Bateria actual: 55% → Objectiu: 85% · Temps estimat: 30 min</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, status: 'completat' as StopStatus } : s));
                          toast.success('Recàrrega completada', { description: 'Bateria al 85%. Pots continuar la ruta.' });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 active:scale-95 transition-all"
                      >
                        <Zap size={14} />
                        Marcar recàrrega completada
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Modal */}
      {reportStop && (
        <ReportModal
          stop={reportStop}
          onClose={() => setReportStop(null)}
          onSubmit={handleSubmitReport}
        />
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-bold text-foreground">Informe de Visita</h3>
              <button onClick={() => setViewingReport(null)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {(() => {
                const s = stops.find((st) => st.id === viewingReport);
                if (!s) return null;
                return (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle2 size={16} className="text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Visita completada correctament</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">Adreça</p><p className="font-medium">{s.address}</p></div>
                      <div><p className="text-xs text-muted-foreground">Client</p><p className="font-medium">{s.client}</p></div>
                      <div><p className="text-xs text-muted-foreground">Hora planificada</p><p className="font-mono font-medium">{s.scheduledTime}</p></div>
                      <div><p className="text-xs text-muted-foreground">Durada estimada</p><p className="font-mono font-medium">{s.estimatedDuration} min</p></div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Checklist completat</p>
                      <div className="space-y-1">
                        {s.checklist.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 size={12} className="text-green-500" />
                            <span className="text-foreground">{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="px-5 py-4 border-t border-border">
              <button onClick={() => setViewingReport(null)} className="w-full py-2.5 text-sm font-medium text-muted-foreground bg-muted border border-border rounded-xl hover:bg-muted/80 transition-all">
                Tancar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}