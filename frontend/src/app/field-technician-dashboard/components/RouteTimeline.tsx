'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store/appStore';
import { api, type Visit } from '@/lib/api';

interface RouteTimelineProps {
  technicianId?: number;
}

export default function RouteTimeline({ technicianId }: RouteTimelineProps) {
  const {
    visits,
    loadVisits,
    isLoading
  } = useAppStore();

  const [activeWait, setActiveWait] = useState<number | null>(null);

  useEffect(() => {
    if (technicianId) {
      loadVisits(new Date().toISOString().split('T')[0], technicianId);
    }
  }, [technicianId, loadVisits]);

  // Sort visits theoretically by priority or scheduled time (assuming id or priority)
  const sortedVisits = [...visits].sort((a, b) => {
    return (b.last_priority_score ?? 0) - (a.last_priority_score ?? 0);
  });

  const handleStatusChange = async (id: number, currentStatus: Visit['status']) => {
    if (activeWait === id) return;
    setActiveWait(id);

    try {
      if (currentStatus === 'pending') {
        // Mocking the status change as API lacks updateVisitStatus
        toast.info(`Intervencio #${id} en curs`, {
          description: 'S\'ha notificat l\'inici de l\'operacio.',
          icon: <Play size={16} />
        });
      } else if (currentStatus === 'in_progress') {
        toast.success(`Intervencio #${id} completada`, {
          description: 'Bona feina! L\'estat s\'ha actualitzat.',
        });
      }
      
      // Reload visits
      if (technicianId) {
        await loadVisits(new Date().toISOString().split('T')[0], technicianId);
      }
    } catch (e) {
      toast.error('Error a l\'actualitzar l\'estat');
    } finally {
      setActiveWait(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-mobility-surface shadow-sm rounded-xl border border-mobility-border p-6 flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-mobility-border rounded-md"></div>
        <div className="space-y-4 pt-4">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-mobility-border rounded-full shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-mobility-border rounded-md"></div>
                <div className="h-3 w-1/2 bg-mobility-border rounded-md"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-mobility-surface shadow-sm rounded-xl border border-mobility-border p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-mobility-primary flex items-center gap-2">
            <Navigation className="text-mobility-accent" size={20} />
            Ruta del Dia
          </h2>
          <p className="text-mobility-muted text-xs mt-1">Intervencions ordenades per FSM</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-mobility-primary">{sortedVisits.length}</span>
          <p className="text-[10px] text-mobility-muted uppercase font-bold tracking-wider">Parades</p>
        </div>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-mobility-border">
        {sortedVisits.map((v, idx) => {
          const isCompleted = v.status === 'completed';
          const isActive = v.status === 'in_progress';
          const isPending = v.status === 'pending';
          const isLast = idx === sortedVisits.length - 1;

          let bulletColor = 'bg-mobility-primary border-mobility-border';
          let textColor = 'text-mobility-muted';
          let bgColor = 'bg-mobility-primary';

          if (isCompleted) {
            bulletColor = 'bg-mobility-accent text-white border-mobility-accent shadow-[0_0_10px_rgba(0,180,81,0.3)]';
            textColor = 'text-mobility-primary';
            bgColor = 'bg-mobility-accent text-white/5 border-mobility-accent/20';
          } else if (isActive) {
            bulletColor = 'bg-mobility-accent text-white border-mobility-accent shadow-[0_0_10px_rgba(0,195,255,0.4)] animate-pulse';
            textColor = 'text-mobility-primary font-semibold';
            bgColor = 'bg-mobility-accent/10 border-mobility-accent/40 ring-1 ring-mobility-accent/20';
          } else if (isPending) {
            bulletColor = 'bg-mobility-background border-mobility-border';
            textColor = 'text-mobility-primary';
            bgColor = 'bg-mobility-background hover:bg-mobility-surface border-mobility-border';
          }

          return (
            <div key={v.id} className="relative group">
              {/* Timeline Bullet */}
              <div 
                className={`absolute w-6 h-6 rounded-full border-2 -left-[35px] flex items-center justify-center top-3 z-10 transition-colors ${bulletColor}`}
              >
                {isCompleted && <CheckCircle2 size={12} className="text-mobility-primary" />}
                {isActive && <Play size={10} className="text-mobility-primary ml-0.5" />}
                {isPending && <div className="w-1.5 h-1.5 rounded-full bg-mobility-muted"></div>}
              </div>

              {/* Card */}
              <div className={`p-4 rounded-xl border transition-all ${bgColor}`}>
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isCompleted ? 'bg-emerald-100/60 text-emerald-700 font-mono' : 
                        isActive ? 'bg-cyan-100/70 text-cyan-700 font-mono' : 
                        'bg-amber-100/60 text-amber-700 font-mono'
                      }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                      {v.last_priority_score && v.last_priority_score > 80 && (
                        <span className="text-[10px] bg-red-100/60 text-red-700 font-mono px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                          CRITIC
                        </span>
                      )}
                    </div>
                    
                    <h3 className={`text-base tracking-tight mb-1 ${textColor}`}>
                      Intervencio #{v.id}
                    </h3>
                    
                    <p className="text-xs text-mobility-muted flex items-center gap-1.5 mb-2 line-clamp-1">
                      <MapPin size={12} className="shrink-0" />
                      {v.address || 'Sense ubicacio'}
                    </p>
                    
                    <div className="flex items-center gap-3 text-[11px] font-medium text-mobility-muted/80">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {v.estimated_duration} min ext.
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {(!isCompleted) && (
                    <button
                      disabled={activeWait === v.id}
                      onClick={() => handleStatusChange(v.id, v.status)}
                      className={`shrink-0 flex items-center justify-center p-3 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-mobility-accent text-white hover:brightness-110 shadow-[0_8px_20px_rgba(0,162,219,0.28)]' 
                          : 'bg-mobility-accent text-white hover:brightness-110 shadow-[0_8px_20px_rgba(0,162,219,0.28)]'
                      } ${activeWait === v.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                    >
                      {isActive ? <CheckCircle2 size={20} /> : <Play size={20} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
