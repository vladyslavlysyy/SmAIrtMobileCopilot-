'use client';

import React, { useState, useEffect } from 'react';
import TechnicianHeader from './components/TechnicianHeader';
import RouteTimeline from './components/RouteTimeline';
import BatteryAutonomyCard from './components/BatteryAutonomyCard';
import ContingencyButton from './components/ContingencyButton';
import WeeklyCalendarStrip from './components/WeeklyCalendarStrip';
import { getTechnicians } from '@/actions/technicians';
import { Loader2 } from 'lucide-react';

export default function TeamManagementPage() {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTechs = async () => {
    const data = await getTechnicians();
    setTechnicians(data);
    if (data.length > 0 && !selectedTechId) {
      setSelectedTechId(data[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadTechs();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-theme(spacing.16))] pb-8 bg-background">
      {/* Cabecera interactiva con Base de Datos */}
      <TechnicianHeader 
        technicians={technicians} 
        selectedTechId={selectedTechId} 
        onSelect={setSelectedTechId}
        onRefresh={loadTechs}
      />
      
      {technicians.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
          <p>No hi ha tècnics registrats a la base de dades.</p>
          <p className="text-sm mt-2">Utilitza el botó "Nou Tècnic" de dalt per afegir-ne un.</p>
        </div>
      ) : (
        <div key={selectedTechId} className="flex-1 p-6 max-w-screen-2xl mx-auto w-full animate-fade-in">
          <WeeklyCalendarStrip />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
            <div className="xl:col-span-2 space-y-6">
              <RouteTimeline />
            </div>
            <div className="xl:col-span-1 space-y-4">
              <BatteryAutonomyCard />
              <ContingencyButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}