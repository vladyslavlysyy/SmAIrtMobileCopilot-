'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type WorkType = 'correctiu-critic' | 'correctiu-no-critic' | 'preventiu' | 'posada-marxa' | 'diagnosi';
export type InterventionStatus = 'pendent' | 'assignada' | 'en-ruta' | 'en-execucio' | 'completada';

export interface Intervention {
  id: string;
  aiScore: number;
  workType: WorkType;
  status: InterventionStatus;
  satNumber: string | null;
  address: string;
  municipality: string;
  client: string;
  chargerModel: string;
  technician: string | null;
  scheduledTime: string | null;
  estimatedDuration: number;
  slaDeadline: string | null;
  slaRisk: 'critica' | 'alta' | 'normal';
  description: string;
  distance: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface AppState {
  interventions: Intervention[];
  alerts: Alert[];
  unreadAlerts: number;
  addIntervention: (intervention: Omit<Intervention, 'id'>) => void;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => void;
  assignTechnician: (interventionId: string, technician: string, time: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  addAlert: (alert: Omit<Alert, 'id' | 'read'>) => void;
}

const initialInterventions: Intervention[] = [
  { id: 'vis-2847', aiScore: 98, workType: 'correctiu-critic', status: 'pendent', satNumber: 'SAT-2847', address: 'Av. Prat de la Riba, 24', municipality: 'Tarragona', client: 'Ajuntament de Tarragona', chargerModel: 'Wallbox Commander 2', technician: null, scheduledTime: null, estimatedDuration: 90, slaDeadline: '12:00', slaRisk: 'critica', description: 'Carregador fora de servei. Error E-07 persistent. Punt de recàrrega pública molt freqüentat.', distance: 0 },
  { id: 'vis-2851', aiScore: 94, workType: 'correctiu-critic', status: 'assignada', satNumber: 'SAT-2851', address: 'C/ Riu Ebre, 8', municipality: 'Reus', client: 'Parking Reus Centre SL', chargerModel: 'ABB Terra AC W22', technician: 'Laia Ferré', scheduledTime: '10:30', estimatedDuration: 120, slaDeadline: '14:00', slaRisk: 'alta', description: 'Fallada de comunicació OCPP. El carregador no reporta estat. Client reclama des d\'ahir.', distance: 12 },
  { id: 'vis-2863', aiScore: 87, workType: 'correctiu-no-critic', status: 'assignada', satNumber: 'SAT-2863', address: 'Pg. de les Palmeres, 45', municipality: 'Salou', client: 'Hotel Costa Daurada Resort', chargerModel: 'Schneider EVlink Pro AC', technician: 'Marc Puigdomènech', scheduledTime: '11:00', estimatedDuration: 60, slaDeadline: '18:00', slaRisk: 'normal', description: 'Pantalla tàctil no respon correctament. Error intermitent en autorització RFID.', distance: 22 },
  { id: 'vis-2871', aiScore: 79, workType: 'diagnosi', status: 'pendent', satNumber: 'SAT-2871', address: 'Polígon Industrial Nord, Nau 7', municipality: 'Vila-seca', client: 'Logística Mediterrànea SA', chargerModel: 'Siemens VersiCharge', technician: null, scheduledTime: null, estimatedDuration: 45, slaDeadline: '17:00', slaRisk: 'alta', description: 'Diagnosi prèvia a intervenció correctiva. Possible problema en mòdul de potència.', distance: 8 },
  { id: 'vis-C041', aiScore: 72, workType: 'posada-marxa', status: 'assignada', satNumber: 'OBR-C041', address: 'Av. Catalunya, 112', municipality: 'Cambrils', client: 'Mercadona SA', chargerModel: 'Circontrol eHome', technician: 'Jordi Casals', scheduledTime: '09:00', estimatedDuration: 150, slaDeadline: null, slaRisk: 'normal', description: 'Posada en marxa de 2 nous punts de recàrrega. Configuració OCPP i proves de validació.', distance: 18 },
  { id: 'vis-P1204', aiScore: 65, workType: 'preventiu', status: 'en-execucio', satNumber: null, address: 'C/ de l\'Onze de Setembre, 3', municipality: 'Tarragona', client: 'Consorci Sanitari de Tarragona', chargerModel: 'ABB Terra AC W11', technician: 'Núria Valls', scheduledTime: '08:30', estimatedDuration: 60, slaDeadline: null, slaRisk: 'normal', description: 'Manteniment preventiu semestral. Inspecció visual, neteja i mesures elèctriques.', distance: 5 },
  { id: 'vis-P1205', aiScore: 61, workType: 'preventiu', status: 'assignada', satNumber: null, address: 'Av. de Roma, 78', municipality: 'Tarragona', client: 'Consorci Sanitari de Tarragona', chargerModel: 'ABB Terra AC W11', technician: 'Núria Valls', scheduledTime: '10:00', estimatedDuration: 60, slaDeadline: null, slaRisk: 'normal', description: 'Manteniment preventiu semestral. Segon punt del circuit CST.', distance: 3 },
  { id: 'vis-2879', aiScore: 55, workType: 'correctiu-no-critic', status: 'pendent', satNumber: 'SAT-2879', address: 'C/ Gasòmetre, 15', municipality: 'Tarragona', client: 'Residencial Ponent SCL', chargerModel: 'Wallbox Pulsar Plus', technician: null, scheduledTime: null, estimatedDuration: 45, slaDeadline: '27/03 18:00', slaRisk: 'normal', description: 'Cable de recàrrega deteriorat. Possible substitució necessària.', distance: 4 },
  { id: 'vis-2882', aiScore: 48, workType: 'diagnosi', status: 'pendent', satNumber: 'SAT-2882', address: 'Polígon Francolí, Carrer B, 22', municipality: 'Tarragona', client: 'Indústries Químiques Tarragona SL', chargerModel: 'Mennekes AMTRON', technician: null, scheduledTime: null, estimatedDuration: 60, slaDeadline: '28/03 12:00', slaRisk: 'normal', description: 'Diagnosi per soroll elèctric detectat. Possible interferència amb maquinària industrial.', distance: 11 },
  { id: 'vis-P1210', aiScore: 42, workType: 'preventiu', status: 'pendent', satNumber: null, address: 'Av. dels Paisos Catalans, 200', municipality: 'Reus', client: 'Ajuntament de Reus', chargerModel: 'Circontrol CPF 22', technician: null, scheduledTime: null, estimatedDuration: 90, slaDeadline: '31/03', slaRisk: 'normal', description: 'Manteniment preventiu trimestral. 3 punts de recàrrega pública.', distance: 14 },
];

const initialAlerts: Alert[] = [
  { id: 'alert-001', type: 'error', title: 'SLA en risc crític', message: 'SAT-2847 vence a les 12:00 — sense tècnic assignat', time: '11:30', read: false },
  { id: 'alert-002', type: 'warning', title: 'Trànsit N-340', message: 'Marc Puigdomènech afectat. Retard estimat 45 min.', time: '10:47', read: false },
  { id: 'alert-003', type: 'warning', title: 'Falta material', message: 'Connector Mennekes Tipus 2 no disponible per SAT-2847', time: '11:12', read: false },
  { id: 'alert-004', type: 'info', title: 'Visita completada', message: 'Núria Valls ha completat P-1204 a Tarragona', time: '10:15', read: true },
  { id: 'alert-005', type: 'info', title: 'Nou SAT creat', message: 'SAT-2882 assignat automàticament per prioritat IA', time: '09:45', read: true },
];

const AppContext = createContext<AppState | null>(null);

let idCounter = 1000;

export function AppProvider({ children }: { children: ReactNode }) {
  const [interventions, setInterventions] = useState<Intervention[]>(initialInterventions);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  const unreadAlerts = alerts.filter((a) => !a.read).length;

  const addIntervention = useCallback((intervention: Omit<Intervention, 'id'>) => {
    const id = `vis-NEW${++idCounter}`;
    setInterventions((prev) => [{ ...intervention, id }, ...prev]);
  }, []);

  const updateIntervention = useCallback((id: string, updates: Partial<Intervention>) => {
    setInterventions((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  }, []);

  const deleteIntervention = useCallback((id: string) => {
    setInterventions((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const assignTechnician = useCallback((interventionId: string, technician: string, time: string) => {
    setInterventions((prev) =>
      prev.map((i) =>
        i.id === interventionId
          ? { ...i, technician, scheduledTime: time, status: 'assignada' as InterventionStatus }
          : i
      )
    );
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'read'>) => {
    const id = `alert-${Date.now()}`;
    setAlerts((prev) => [{ ...alert, id, read: false }, ...prev]);
  }, []);

  return React.createElement(AppContext.Provider, {
    value: { interventions, alerts, unreadAlerts, addIntervention, updateIntervention, deleteIntervention, assignTechnician, markAlertRead, markAllAlertsRead, addAlert },
    children,
  });
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
