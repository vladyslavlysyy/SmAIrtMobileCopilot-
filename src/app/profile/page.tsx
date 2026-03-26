'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, User, Mail, Phone, Loader2, 
  ShieldCheck, Key, Bell, ToggleLeft, ToggleRight,
  AlertTriangle, Lock
} from 'lucide-react';
import { toast } from 'sonner';
// AÑADIDO: Importamos la función de updateProfile
import { getCurrentUser, updateProfile } from '@/actions/auth'; 
import AppLayout from '@/components/ui/AppLayout';

export default function ProfilePage() {
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'notifications'>('general');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);

  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) {
        setUser(u);
        setName(u.name);
        setEmail(u.email);
        // Cargamos el teléfono real de la base de datos
        if (u.phone) setPhone(u.phone); 
        
        const savedImage = localStorage.getItem('smairt_profile_pic');
        if (savedImage) setProfileImage(savedImage);
      }
    });
  }, []);

  // --- LÓGICA REAL DE GUARDADO EN BASE DE DATOS ---
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Empaquetamos los datos que has escrito en la pantalla
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    
    if (activeTab === 'security') {
      if (!currentPass || !newPass) {
        toast.error('Has d\'omplir els dos camps de contrasenya');
        setIsSaving(false);
        return;
      }
      formData.append('currentPass', currentPass);
      formData.append('newPass', newPass);
    }

    // Enviamos al backend real
    const res = await updateProfile(formData);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Canvis guardats correctament', {
        description: 'La teva configuració s\'ha actualitzat a la base de dades.'
      });
      // Actualizamos el estado visual
      setUser({ name, email }); 
      if (activeTab === 'security') {
        setCurrentPass('');
        setNewPass('');
      }
    }
    setIsSaving(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Format invàlid', { description: 'Si us plau, puja una imatge (JPG, PNG, etc).' });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Image = event.target?.result as string;
        setProfileImage(base64Image);
        // Persistencia de imagen en LocalStorage
        localStorage.setItem('smairt_profile_pic', base64Image);
        toast.success('Foto actualitzada', { description: 'La teva foto de perfil s\'ha canviat per sempre.' });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-background animate-fade-in">
        
        <div className="bg-card border-b border-border px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <ShieldCheck size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">El Meu Perfil</h1>
              <p className="text-muted-foreground text-sm">Configuració d'administrador i preferències</p>
            </div>
          </div>
        </div>

        <div className="p-6 max-w-5xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            
            <div className="p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-900/40 to-slate-900/40 border-b border-slate-800/50" />
              
              <div className="relative group cursor-pointer z-10" onClick={handleImageClick}>
                <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-slate-500" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                  <Camera size={24} className="text-white" />
                </div>
                <div className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full border-4 border-slate-900 z-20 shadow-lg">
                  <Camera size={14} className="text-white" />
                </div>
              </div>
              
              <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

              <div className="z-10 text-center md:text-left mt-4 md:mt-12">
                <h2 className="text-2xl font-bold text-white">{user.name}</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider border border-blue-500/20 mt-2">
                  <ShieldCheck size={14} /> Super Administrador
                </span>
              </div>
            </div>

            <div className="flex border-b border-slate-800 px-8">
              <button onClick={() => setActiveTab('general')} className={`px-4 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'general' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                <User size={16} /> Dades Personals
              </button>
              <button onClick={() => setActiveTab('security')} className={`px-4 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'security' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                <Key size={16} /> Seguretat
              </button>
              <button onClick={() => setActiveTab('notifications')} className={`px-4 py-4 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'notifications' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
                <Bell size={16} /> Notificacions
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8">
              
              {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nom complet</label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="text" value={name} onChange={e => setName(e.target.value)} required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Correu electrònic</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Telèfon de contacte</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                  <div className="md:col-span-2">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3">
                      <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
                      <p className="text-sm text-amber-200/80 leading-relaxed">
                        Per motius de seguretat, necessitem la teva contrasenya actual per poder establir-ne una nova a la base de dades.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Contrasenya Actual</label>
                    <div className="relative">
                      <Key size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Nova Contrasenya</label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínim 8 caràcters"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <h3 className="text-white font-medium">Alertes per Correu Electrònic</h3>
                      <p className="text-slate-400 text-sm mt-1">Rebre un resum diari de les intervencions crítiques.</p>
                    </div>
                    <button type="button" onClick={() => setNotifEmail(!notifEmail)} className="text-blue-500 hover:text-blue-400 transition-colors">
                      {notifEmail ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-slate-600" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div>
                      <h3 className="text-white font-medium">Notificacions Push (Navegador)</h3>
                      <p className="text-slate-400 text-sm mt-1">Avisos instantanis quan es trenca un SLA o hi ha una urgència.</p>
                    </div>
                    <button type="button" onClick={() => setNotifPush(!notifPush)} className="text-blue-500 hover:text-blue-400 transition-colors">
                      {notifPush ? <ToggleRight size={36} /> : <ToggleLeft size={36} className="text-slate-600" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-8 mt-8 border-t border-slate-800 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 px-6 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar Canvis
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}