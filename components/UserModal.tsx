'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, User, Mail, Shield, Building2, Lock, Eye, EyeOff, Send, Check, MapPin, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { UserRole } from '@prisma/client';
import { t } from '@/lib/translations';

interface UserModalProps {
  user?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const isEditing = !!user;
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [availablePlants, setAvailablePlants] = useState<any[]>([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    role: user?.role || 'TECHNICIAN',
    clientId: user?.clientId || '',
    plantIds: user?.plantAccess?.map((pa: any) => pa.plantId) || [],
    password: '',
    active: user?.active !== undefined ? user.active : true,
  });

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(() => console.error('Error loading clients'));
  }, []);

  useEffect(() => {
    if (form.clientId) {
      setIsLoadingPlants(true);
      fetch(`/api/plants?clientId=${form.clientId}`)
        .then(res => res.json())
        .then(data => {
          setAvailablePlants(data);
          // If editing and no plants selected yet, initialize if they come in user object
          // Otherwise, if changing client, clear selected plants
          if (!isEditing || form.clientId !== user?.clientId) {
            // Only clear if the client actually changed manually
            // Wait, logic: if I select a client, I should see their plants.
          }
        })
        .finally(() => setIsLoadingPlants(false));
    } else {
      setAvailablePlants([]);
    }
  }, [form.clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/users/${user.id}` : '/api/users';
      const method = isEditing ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al guardar usuario');
      }

      toast.success(isEditing ? 'Usuario actualizado' : 'Invitación enviada correctamente');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isClientRole = form.role === 'CLIENT_RESPONSIBLE' || form.role === 'CLIENT_REQUESTER';
  const isRequester = form.role === 'CLIENT_REQUESTER';

  const togglePlant = (plantId: string) => {
    setForm(prev => ({
      ...prev,
      plantIds: prev.plantIds.includes(plantId)
        ? prev.plantIds.filter((id: string) => id !== plantId)
        : [...prev.plantIds, plantId]
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
              <p className="text-xs text-muted-foreground">
                {isEditing ? 'Actualice los datos del perfil.' : 'Se enviará una invitación por email para configurar la contraseña.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-2">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="input"
                  placeholder="Ej: Juan"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Apellido</label>
                <input
                  className="input"
                  placeholder="Ej: Pérez"
                  value={form.apellido}
                  onChange={e => setForm({ ...form, apellido: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email / Usuario <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                disabled={isEditing}
                className="input disabled:opacity-60"
                placeholder="juan.perez@empresa.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              {isEditing && <p className="text-[10px] text-muted-foreground italic">El email no puede ser modificado.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  Rol de Sistema <span className="text-red-500">*</span>
                </label>
                <select
                  className="select"
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value, clientId: e.target.value.includes('CLIENT') ? form.clientId : '' })}
                >
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{t(role)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Cliente / Empresa
                </label>
                <select
                  disabled={!isClientRole}
                  className="select disabled:opacity-50"
                  value={form.clientId}
                  onChange={e => setForm({ ...form, clientId: e.target.value, plantIds: [] })}
                  required={isClientRole}
                >
                  <option value="">Seleccione un cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            {isClientRole && form.clientId && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Plantas autorizadas (Acceso) <span className="text-red-500">*</span>
                </label>
                
                {isLoadingPlants ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg border border-dashed border-border">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando plantas...
                  </div>
                ) : availablePlants.length === 0 ? (
                  <div className="text-xs text-amber-600 p-4 bg-amber-50 rounded-lg border border-amber-100 italic">
                    Este cliente no tiene plantas registradas aún.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                    {availablePlants.map(plant => {
                      const isSelected = form.plantIds.includes(plant.id);
                      return (
                        <button
                          key={plant.id}
                          type="button"
                          onClick={() => togglePlant(plant.id)}
                          className={clsx(
                            'flex items-center gap-3 p-3 rounded-lg border text-left transition-all group',
                            isSelected 
                              ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                              : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                          )}
                        >
                          <div className={clsx(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            isSelected ? 'bg-primary border-primary' : 'bg-background border-border group-hover:border-muted-foreground/50'
                          )}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate leading-tight">{plant.nombre}</p>
                            {plant.direccion && <p className="text-[10px] opacity-70 truncate mt-0.5">{plant.direccion}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {isClientRole && form.plantIds.length === 0 && availablePlants.length > 0 && (
                  <p className="text-[10px] text-amber-600 font-medium">Si no selecciona ninguna planta, {isRequester ? 'el solicitante no tendrá acceso a ningún equipo.' : 'el responsable verá todas las plantas del cliente por defecto.'}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña Inicial'} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!isEditing}
                  className="input pr-10"
                  placeholder={isEditing ? 'Dejar en blanco para no cambiar' : 'Asigne una clave temporal'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!isEditing && (
                <p className="text-[10px] text-amber-600 font-medium italic">
                  * El usuario será forzado a cambiar esta clave al acceder por primera vez.
                </p>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="active"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                />
                <label htmlFor="active" className="text-sm font-medium cursor-pointer">
                  Usuario Activo (Permitir acceso al sistema)
                </label>
              </div>
            )}

          </div>

          <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="btn-outline"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="btn-primary flex items-center gap-2 min-w-[140px] justify-center shadow-lg shadow-primary/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                isEditing ? 'Guardar Cambios' : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Crear Usuario
                  </>
                )
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
