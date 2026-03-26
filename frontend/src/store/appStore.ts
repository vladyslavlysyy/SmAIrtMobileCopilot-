'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type Imprevisto, type Technician, type Visit } from '@/lib/api';

export interface UserProfile {
  id: string;
  name: string;
  role: 'operations' | 'technician';
  selectedTechnicianId?: number;
}

interface AppState {
  visits: Visit[];
  technicians: Technician[];
  imprevistos: Imprevisto[];
  currentUser: UserProfile | null;
  selectedTechnicianId: number | null;
  isHydrated: boolean;
  isLoading: boolean;
  error: string | null;
  setUserRole: (role: 'operations' | 'technician') => void;
  setSelectedTechnician: (id: number) => void;
  loadVisits: (date?: string, technicianId?: number) => Promise<void>;
  loadWeeklyVisits: (weekStart: string, technicianId: number) => Promise<Record<string, number>>;
  loadTechnicians: () => Promise<void>;
  loadImprevistos: (technicianId: number, date?: string) => Promise<void>;
  clearError: () => void;
  logout: () => void;
}

const STORAGE_KEY = 'smairt_user';

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [imprevistos, setImprevistos] = useState<Imprevisto[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const user = JSON.parse(raw) as UserProfile;
        setCurrentUser(user);
        setSelectedTechnicianId(user.selectedTechnicianId ?? null);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsHydrated(true);
  }, []);

  const persistUser = useCallback((user: UserProfile | null) => {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }, []);

  const setUserRole = useCallback(
    (role: 'operations' | 'technician') => {
      const next: UserProfile = {
        id: `usr-${Date.now()}`,
        name: role === 'operations' ? 'Operations' : 'Technician',
        role,
      };
      setCurrentUser(next);
      setSelectedTechnicianId(null);
      persistUser(next);
    },
    [persistUser]
  );

  const setSelectedTechnician = useCallback(
    (id: number) => {
      setSelectedTechnicianId(id);
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, selectedTechnicianId: id };
        persistUser(next);
        return next;
      });
    },
    [persistUser]
  );

  const loadVisits = useCallback(async (date?: string, technicianId?: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getVisits(date, technicianId);
      setVisits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visits');
      setVisits([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWeeklyVisits = useCallback(async (weekStart: string, technicianId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      return await api.getWeeklyVisits(technicianId, weekStart);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly visits');
      return {};
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTechnicians = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allVisits = await api.getVisits();
      const ids = Array.from(
        new Set(allVisits.map((v) => v.technician_id).filter((x): x is number => x !== null))
      );
      const data = ids.map((id) => ({ id, name: `Technician ${id}`, zone: 'Unknown' }));
      setTechnicians(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load technicians');
      setTechnicians([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadImprevistos = useCallback(async (technicianId: number, date?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getImprevistos(technicianId, date);
      setImprevistos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load imprevistos');
      setImprevistos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setSelectedTechnicianId(null);
    setVisits([]);
    setImprevistos([]);
    persistUser(null);
  }, [persistUser]);

  const value = useMemo<AppState>(
    () => ({
      visits,
      technicians,
      imprevistos,
      currentUser,
      selectedTechnicianId,
      isHydrated,
      isLoading,
      error,
      setUserRole,
      setSelectedTechnician,
      loadVisits,
      loadWeeklyVisits,
      loadTechnicians,
      loadImprevistos,
      clearError,
      logout,
    }),
    [
      visits,
      technicians,
      imprevistos,
      currentUser,
      selectedTechnicianId,
      isHydrated,
      isLoading,
      error,
      setUserRole,
      setSelectedTechnician,
      loadVisits,
      loadWeeklyVisits,
      loadTechnicians,
      loadImprevistos,
      clearError,
      logout,
    ]
  );

  return React.createElement(AppContext.Provider, { value }, children);
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
