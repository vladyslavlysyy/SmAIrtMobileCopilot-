'use client';

import React, { useState } from 'react';
import { User, MapPin, Zap, Clock, Phone, X, Eye, ChevronDown, Check, Users, Settings, Plus, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveTechnician } from '@/actions/technicians';

interface TechHeaderProps {
  technicians: any[];
  selectedTechId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}

export default function TechnicianHeader({ technicians, selectedTechId, onSelect, onRefresh }: TechHeaderProps) {
  const [showSelector, setShowSelector] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  // Buscamos al técnico seleccionado actualmente
  const techData = technicians.find(t => t.id === selectedTechId) || null;

  const handleCall = (contact: string) => {
    setShowCallModal(false);
    toast.success(`Trucant a ${contact}...`, { description: 'Connexió establerta.' });
  };

  const openNewModal = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  const openEditModal = () => {
    if (techData) {
      setEditData(techData);
      setIsModalOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    if (editData?.id) {
      formData.append('id', editData.id);
    }

    const res = await saveTechnician(formData);
    
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(editData ? 'Tècnic actualitzat correctament' : 'Nou tècnic registrat');
      setIsModalOpen(false);
      onRefresh(); // Recargar datos desde la Base de Datos
    }
    setIsSaving(false);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 px-6 py-5 border-b border-slate-700 relative z-20">
        <div className="absolute top-0 right-0 bg-blue-600/20 text-blue-300 text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 uppercase tracking-wider">
          <Eye size={10} /> Vista de Supervisió Admin
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4 max-w-screen-2xl mx-auto mt-2">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/30 border-2 border-blue-400/50 flex items-center justify-center flex-shrink-0 mt-1">
              <User size={22} className="text-blue-300" />
            </div>
            <div>
              {techData ? (
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => setShowSelector(!showSelector)} className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 -ml-2 rounded-lg transition-colors group">
                      <h1 className="text-white font-bold text-xl">{techData.name}</h1>
                      <ChevronDown size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                    <button onClick={openEditModal} className="text-slate-400 hover:text-blue-400 p-1.5 bg-slate-800/50 rounded-md transition-colors" title="Modificar Tècnic">
                      <Settings size={14} />
                    </button>
                  </div>

                  {showSelector && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSelector(false)} />
                      <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="px-3 py-2 border-b border-slate-700/50 mb-1 flex justify-between items-center">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Users size={12}/> El teu Equip</p>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {technicians.map(t => (
                            <button key={t.id} onClick={() => { onSelect(t.id); setShowSelector(false); }} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/50 transition-colors text-left">
                              <span className={`text-sm font-medium ${t.id === selectedTechId ? 'text-blue-400' : 'text-slate-200'}`}>{t.name}</span>
                              {t.id === selectedTechId && <Check size={16} className="text-blue-400" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-medium rounded-full">
                      {techData.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-slate-300 text-sm mt-3">
                    <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400"/> {techData.loc}</span>
                    <span className="flex items-center gap-1.5"><Zap size={14} className="text-slate-400"/> {techData.vehicle}</span>
                  </div>
                </div>
              ) : (
                <h1 className="text-white font-bold text-xl py-1">Cap tècnic actiu</h1>
              )}
            </div>
          </div>

          <div className="text-right mt-1 flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-slate-400 text-xs">Dijous, 26 de Març</p>
                <p className="text-white font-bold text-lg font-mono tabular-nums">11:36</p>
              </div>
              {techData && (
                <button onClick={() => setShowCallModal(true)} className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium rounded-lg transition-all duration-150">
                  <Phone size={14} /> Operacions
                </button>
              )}
            </div>
            <button onClick={openNewModal} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Plus size={16} /> Nou Tècnic
            </button>
          </div>
        </div>

        {techData && (
          <div className="mt-5 max-w-screen-2xl mx-auto">
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Progrés de la jornada</span>
              <span className="font-mono">--</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700" style={{ width: '50%' }} />
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-700/50 bg-slate-800/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {editData ? <Settings size={18} className="text-blue-400" /> : <Plus size={18} className="text-blue-400" />}
                {editData ? 'Modificar Tècnic' : 'Registrar Nou Tècnic'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nom Complet</label>
                <input required name="name" type="text" defaultValue={editData?.name || ''} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ex: Maria Garcia" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Correu (App Tècnic)</label>
                  <input required name="email" type="email" defaultValue={editData?.email || ''} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="maria@etecnic.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Telèfon de flota</label>
                  <input required name="phone" type="tel" defaultValue={editData?.phone || ''} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="+34 600..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Furgoneta / Vehicle Assignat</label>
                <input required name="vehicle" type="text" defaultValue={editData?.vehicle || ''} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ex: Renault Zoe · E-1247-TGN" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Zona Habitual</label>
                  <input required name="loc" type="text" defaultValue={editData?.loc || 'Base Tarragona'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Estat</label>
                  <select name="status" defaultValue={editData?.status || 'En servei actiu'} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="En servei actiu">En servei actiu</option>
                    <option value="En ruta">En ruta</option>
                    <option value="En pausa (Dinar)">En pausa (Dinar)</option>
                    <option value="Fora de servei">Fora de servei</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 mt-2 border-t border-slate-700 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-300 hover:text-white transition-colors">Cancel·lar</button>
                <button disabled={isSaving} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editData ? 'Guardar Canvis' : 'Crear Tècnic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCallModal && techData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg"><Phone size={16} className="text-blue-600" /></div>
                <h3 className="font-bold text-foreground">Contactar {techData.name.split(' ')[0]}</h3>
              </div>
              <button onClick={() => setShowCallModal(false)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { name: `Trucar a ${techData.name}`, role: 'Mòbil d\'empresa', ext: techData.phone || 'Sense telèfon' },
                { name: 'Enviar missatge urgent', role: 'Notificació a l\'App', ext: 'App Push' },
              ].map((contact) => (
                <button key={contact.name} onClick={() => handleCall(contact.name)} className="w-full flex items-center justify-between p-3 bg-muted/40 border border-border rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all group">
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{contact.ext}</span>
                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                      <Phone size={12} className="text-green-600 group-hover:text-white" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}