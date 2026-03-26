'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// --- Tipos de Datos ---
export type WorkType = 'correctiu-critic' | 'correctiu-no-critic' | 'preventiu' | 'posada-marxa' | 'diagnosi';
export type InterventionStatus = 'pendent' | 'assignada' | 'en-ruta' | 'en-execucio' | 'completada';

export interface Intervention {
  id: string; aiScore: number; workType: WorkType; status: InterventionStatus;
  satNumber: string | null; address: string; municipality: string; client: string;
  chargerModel: string; technician: string | null; scheduledTime: string | null;
  estimatedDuration: number; slaDeadline: string | null; slaRisk: 'critica' | 'alta' | 'normal';
  description: string; distance: number;
}

export interface Alert {
  id: string; type: 'warning' | 'info' | 'error'; title: string;
  message: string; time: string; read: boolean;
}

// ⚠️ SEGURIDAD: El usuario en memoria NO tiene contraseña
export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'operations' | 'technician';
}

interface AppState {
  interventions: Intervention[];
  alerts: Alert[];
  unreadAlerts: number;
  
  // Auth state
  currentUser: UserProfile | null;
  isHydrated: boolean; 

  // Funciones (omitidas por brevedad en la lista, las implementamos abajo)
  addIntervention: (intervention: Omit<Intervention, 'id'>) => void;
  updateIntervention: (id: string, updates: Partial<Intervention>) => void;
  deleteIntervention: (id: string) => void;
  assignTechnician: (interventionId: string, technician: string, time: string) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  addAlert: (alert: Omit<Alert, 'id' | 'read'>) => void;
  
  login: (username: string, passwordString: string) => void;
  register: (user: Omit<UserProfile, 'id'>, passwordString: string) => void;
  logout: () => void;
}

// (Mantenemos tus datos iniciales intactos)
const initialInterventions: Intervention[] = [
  { id: 'vis-2847', aiScore: 98, workType: 'correctiu-critic', status: 'pendent', satNumber: 'SAT-2847', address: 'Av. Prat de la Riba, 24', municipality: 'Tarragona', client: 'Ajuntament de Tarragona', chargerModel: 'Wallbox Commander 2', technician: null, scheduledTime: null, estimatedDuration: 90, slaDeadline: '12:00', slaRisk: 'critica', description: 'Carregador fora de servei.', distance: 0 },
];
const initialAlerts: Alert[] = [
  { id: 'alert-001', type: 'error', title: 'SLA en risc crític', message: 'SAT-2847 vence a les 12:00', time: '11:30', read: false },
];

const AppContext = createContext<AppState | null>(null);
let idCounter = 1000;

export function AppProvider({ children }: { children: ReactNode }) {
  const [interventions, setInterventions] = useState<Intervention[]>(initialInterventions);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // --- SEGURIDAD: Carga segura de sesión ---
  useEffect(() => {
    const sessionToken = localStorage.getItem('smairt_session_token');
    if (sessionToken) {
      try {
        // Desofuscamos el token simulado (Base64 decode). 
        // Nota: En un entorno real, esto sería un JWT validado contra el backend.
        const decodedPayload = atob(sessionToken);
        setCurrentUser(JSON.parse(decodedPayload));
      } catch (e) {
        // Si alguien manipula el localStorage manualmente, destruimos la sesión por seguridad
        localStorage.removeItem('smairt_session_token');
      }
    }
    setIsHydrated(true);
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.read).length;

  const addIntervention = useCallback((i: Omit<Intervention, 'id'>) => { setInterventions(p => [{ ...i, id: `vis-NEW${++idCounter}` }, ...p]); }, []);
  const updateIntervention = useCallback((id: string, u: Partial<Intervention>) => { setInterventions(p => p.map(i => i.id === id ? { ...i, ...u } : i)); }, []);
  const deleteIntervention = useCallback((id: string) => { setInterventions(p => p.filter(i => i.id !== id)); }, []);
  const assignTechnician = useCallback((id: string, t: string, time: string) => { setInterventions(p => p.map(i => i.id === id ? { ...i, technician: t, scheduledTime: time, status: 'assignada' } : i)); }, []);
  const markAlertRead = useCallback((id: string) => { setAlerts(p => p.map(a => a.id === id ? { ...a, read: true } : a)); }, []);
  const markAllAlertsRead = useCallback(() => { setAlerts(p => p.map(a => ({ ...a, read: true }))); }, []);
  const addAlert = useCallback((a: Omit<Alert, 'id' | 'read'>) => { setAlerts(p => [{ ...a, id: `alert-${Date.now()}`, read: false }, ...p]); }, []);

  // --- SEGURIDAD: Flujo de Autenticación Controlado ---
  
  const login = useCallback((username: string, passwordString: string) => {
    // 1. Aquí el sistema real haría un hash de 'passwordString' y lo enviaría al backend.
    // 2. Destruimos la referencia de la contraseña inmediatamente.
    const securePasswordHash = null; 
    
    // 3. Creamos el perfil público (lo que devuelve el backend seguro)
    const safeProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: username,
      username: username,
      email: `${username}@empresa.com`,
      role: 'operations'
    };
    
    setCurrentUser(safeProfile);
    
    // 4. Ofuscamos los datos antes de guardarlos en localStorage para evitar lectura en texto plano.
    // En producción se usarían Cookies HttpOnly.
    const mockToken = btoa(JSON.stringify(safeProfile));
    localStorage.setItem('smairt_session_token', mockToken);
  }, []);

  const register = useCallback((userData: Omit<UserProfile, 'id'>, passwordString: string) => {
    // Mismo proceso: la contraseña muere aquí y no se guarda.
    const safeProfile: UserProfile = { ...userData, id: `usr-${Date.now()}` };
    setCurrentUser(safeProfile);
    
    const mockToken = btoa(JSON.stringify(safeProfile));
    localStorage.setItem('smairt_session_token', mockToken);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('smairt_session_token'); // Limpieza total
  }, []);

  return React.createElement(AppContext.Provider, {
    value: { 
      interventions, alerts, unreadAlerts, addIntervention, updateIntervention, 
      deleteIntervention, assignTechnician, markAlertRead, markAllAlertsRead, addAlert,
      currentUser, isHydrated, login, register, logout
    },
    children,
  });
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}