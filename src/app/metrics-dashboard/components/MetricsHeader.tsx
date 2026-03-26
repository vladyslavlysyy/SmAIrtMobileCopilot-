'use client';

import React, { useState } from 'react';
import { BarChart3, Download, Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface MetricsFilters {
  dateRange: string;
  technician: string;
}

interface MetricsHeaderProps {
  onFiltersChange?: (filters: MetricsFilters) => void;
}

export default function MetricsHeader({ onFiltersChange }: MetricsHeaderProps) {
  const [dateRange, setDateRange] = useState('last30');
  const [technician, setTechnician] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDateChange = (value: string) => {
    setDateRange(value);
    onFiltersChange?.({ dateRange: value, technician });
    toast.info('Filtre aplicat', { description: `Mostrant dades per: ${value === 'last7' ? 'Últims 7 dies' : value === 'last30' ? 'Últims 30 dies' : value === 'last90' ? 'Últims 90 dies' : 'Any 2026'}` });
  };

  const handleTechnicianChange = (value: string) => {
    setTechnician(value);
    onFiltersChange?.({ dateRange, technician: value });
    if (value !== 'all') {
      toast.info('Filtre tècnic aplicat', { description: `Mostrant dades de: ${value === 'marc' ? 'Marc Puigdomènech' : value === 'laia' ? 'Laia Ferré' : value === 'jordi' ? 'Jordi Casals' : value === 'nuria' ? 'Núria Valls' : 'Pau Ribas'}` });
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Mètriques actualitzades', { description: `Dades actualitzades a ${new Date().toLocaleTimeString('ca-ES')}` });
    }, 1000);
  };

  const handleExportPDF = () => {
    // Generate a simple text report as a downloadable file
    const reportContent = `INFORME DE MÈTRIQUES - SmAIrt Mobility Copilot
Data: ${new Date().toLocaleDateString('ca-ES')}
Període: ${dateRange === 'last7' ? 'Últims 7 dies' : dateRange === 'last30' ? 'Últims 30 dies' : dateRange === 'last90' ? 'Últims 90 dies' : 'Any 2026'}
Tècnic: ${technician === 'all' ? 'Tots els tècnics' : technician}

RESUM EXECUTIU
==============
Intervencions completades: 183 de 211 planificades (86.7%)
Km recorreguts: 8.742 km
Hores efectives: 312 h
Compliment SLA global: 87.3% (Objectiu: 95%)

COMPLIMENT SLA PER TIPUS
========================
Correctiu Crític: 78% (Objectiu: 99%) ✗
Correctiu No Crític: 85% (Objectiu: 95%) ✗
Preventiu: 94% (Objectiu: 90%) ✓
Posada en Marxa: 97% (Objectiu: 95%) ✓
Diagnosi: 91% (Objectiu: 90%) ✓

Generat per SmAIrt Mobility Copilot - Etecnic Mobilitat Elèctrica, SL`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metriques_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Informe exportat', { description: 'El fitxer s\'ha descarregat correctament.' });
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <BarChart3 size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Dashboard de Mètriques</h1>
          <p className="text-muted-foreground text-sm">Observabilitat operativa · Etecnic Camp de Tarragona</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={dateRange}
            onChange={(e) => handleDateChange(e.target.value)}
            className="appearance-none pl-8 pr-8 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="last7">Últims 7 dies</option>
            <option value="last30">Últims 30 dies</option>
            <option value="last90">Últims 90 dies</option>
            <option value="thisyear">Any 2026</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={technician}
            onChange={(e) => handleTechnicianChange(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="all">Tots els tècnics</option>
            <option value="marc">Marc Puigdomènech</option>
            <option value="laia">Laia Ferré</option>
            <option value="jordi">Jordi Casals</option>
            <option value="nuria">Núria Valls</option>
            <option value="pau">Pau Ribas</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-muted transition-all duration-150 disabled:opacity-60"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          Actualitzar
        </button>

        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-150"
        >
          <Download size={14} />
          Exportar PDF
        </button>
      </div>
    </div>
  );
}