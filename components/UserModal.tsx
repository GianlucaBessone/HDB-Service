'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Loader2, User, Mail, Shield, Building2, Lock, Eye, EyeOff, Check, MapPin, UserPlus, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { UserRole } from '@prisma/client';
import { t } from '@/lib/translations';

interface UserModalProps {
  user?: any;
  onClose: () => void;
  onSuccess: () => void;
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  icon: Icon
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  placeholder?: string;
  disabled?: boolean;
  icon?: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
          disabled
            ? 'opacity-50 cursor-not-allowed bg-muted/30 border-border text-muted-foreground'
            : isOpen
              ? 'border-primary ring-2 ring-primary/20 bg-background shadow-sm text-foreground'
              : 'bg-card border-border hover:border-muted-foreground/40 hover:bg-accent/40 text-foreground'
        )}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
          <span className={clsx('truncate', !selectedOption && 'text-muted-foreground')}>
            {selectedOption ? selectedOption.label : (placeholder || 'Seleccionar...')}
          </span>
        </div>
        <ChevronDown className={clsx('w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-60 overflow-y-auto rounded-xl bg-card border border-border shadow-xl p-1.5 custom-scrollbar animate-in fade-in zoom-in-95 duration-150">
          {options.length === 0 ? (
            <div className="p-3 text-xs text-muted-foreground text-center italic">
              No hay opciones disponibles
            </div>
          ) : (
            options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all',
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'hover:bg-accent hover:text-foreground text-muted-foreground'
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate">{opt.label}</p>
                    {opt.sublabel && <p className="text-[10px] opacity-70 truncate mt-0.5">{opt.sublabel}</p>}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 stroke-[3]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CustomCheckbox({
  checked,
  onChange,
  label,
  id
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => onChange(!checked)}
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer group',
        checked
          ? 'bg-primary/10 border-primary text-primary shadow-sm font-semibold'
          : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30 text-foreground'
      )}
    >
      <div
        className={clsx(
          'w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0',
          checked
            ? 'bg-primary border-primary text-primary-foreground'
            : 'bg-background border-border group-hover:border-muted-foreground/50'
        )}
      >
        {checked && <Check className="w-3 h-3 stroke-[3]" />}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

export default function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const isEditing = !!user;
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    email: user?.email || '',
    role: user?.role || 'TECHNICIAN',
    clientId: user?.clientId || '',
    plantIds: user?.plantAccess?.map((pa: any) => pa.plantId) || [],
    equipmentTypes: user?.equipmentTypes || ['DISPENSER'],
    password: '',
    active: user?.active !== undefined ? user.active : true,
  });

  const isClientRole = form.role === 'CLIENT_RESPONSIBLE' || form.role === 'CLIENT_REQUESTER';
  const isTechnician = form.role === 'TECHNICIAN';
  const canAssignPlants = isClientRole || isTechnician;
  const isRequester = form.role === 'CLIENT_REQUESTER';

  const toggleEquipmentType = (type: string) => {
    setForm(prev => {
      const current = prev.equipmentTypes || [];
      const updated = current.includes(type)
        ? current.filter((t: string) => t !== type)
        : [...current, type];
      return {
        ...prev,
        equipmentTypes: updated.length === 0 ? [type] : updated
      };
    });
  };

  // Pre-cached Clients query with React Query
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Pre-cached Plants query with React Query
  const { data: availablePlants = [], isLoading: isLoadingPlants } = useQuery({
    queryKey: ['plants-list', form.clientId, form.role],
    queryFn: async () => {
      const url = form.clientId ? `/api/plants?clientId=${form.clientId}` : '/api/plants';
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: canAssignPlants,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

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

  const togglePlant = (plantId: string) => {
    setForm(prev => ({
      ...prev,
      plantIds: prev.plantIds.includes(plantId)
        ? prev.plantIds.filter((id: string) => id !== plantId)
        : [...prev.plantIds, plantId]
    }));
  };

  const roleOptions = Object.values(UserRole).map(role => ({
    value: role,
    label: t(role)
  }));

  const clientOptions = [
    { value: '', label: isTechnician ? 'Todos los clientes (o filtrar...)' : 'Seleccione un cliente...' },
    ...clients.map((c: any) => ({ value: c.id, label: c.nombre }))
  ];

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
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
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
                <CustomSelect
                  value={form.role}
                  onChange={val => setForm({ ...form, role: val as any, clientId: val.includes('CLIENT') ? form.clientId : '' })}
                  options={roleOptions}
                  icon={Shield}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Cliente / Empresa {isClientRole && <span className="text-red-500">*</span>}
                </label>
                <CustomSelect
                  disabled={!isClientRole && !isTechnician}
                  value={form.clientId}
                  onChange={val => setForm({ ...form, clientId: val, plantIds: [] })}
                  options={clientOptions}
                  placeholder={isTechnician ? 'Todos los clientes' : 'Seleccione cliente...'}
                  icon={Building2}
                />
              </div>
            </div>

            {canAssignPlants && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Plantas asignadas / autorizadas {isClientRole && <span className="text-red-500">*</span>}
                </label>
                
                {isLoadingPlants ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg border border-dashed border-border">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Cargando plantas...
                  </div>
                ) : availablePlants.length === 0 ? (
                  <div className="text-xs text-amber-600 p-4 bg-amber-50 rounded-lg border border-amber-100 italic">
                    {form.clientId ? 'Este cliente no tiene plantas registradas aún.' : 'No hay plantas disponibles.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                    {availablePlants.map((plant: any) => {
                      const isSelected = form.plantIds.includes(plant.id);
                      return (
                        <button
                          key={plant.id}
                          type="button"
                          onClick={() => togglePlant(plant.id)}
                          className={clsx(
                            'flex items-center gap-3 p-3 rounded-lg border text-left transition-all group',
                            isSelected 
                              ? 'bg-primary/10 border-primary text-primary shadow-sm font-semibold' 
                              : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30 text-foreground'
                          )}
                        >
                          <div className={clsx(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border group-hover:border-muted-foreground/50'
                          )}>
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
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
                  <p className="text-[10px] text-amber-600 font-medium">Si no selecciona ninguna planta, {isRequester ? 'el referente no tendrá acceso a ningún equipo.' : 'el responsable verá todas las plantas del cliente por defecto.'}</p>
                )}
                {isTechnician && (
                  <p className="text-[10px] text-muted-foreground italic">
                    * Los tickets de las plantas seleccionadas se enviarán y enrutarán automáticamente a este técnico.
                  </p>
                )}
              </div>
            )}

            {isTechnician && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-border/60 pt-4">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  Especialidad / Equipos que Atiende <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'DISPENSER', label: 'Dispensers / Bebederos' },
                    { id: 'AIR_CONDITIONER', label: 'Aires Acondicionados' },
                    { id: 'REFRIGERATOR', label: 'Heladeras / Freezers' },
                    { id: 'OTHER', label: 'Otros Equipos' }
                  ].map(eq => {
                    const isSelected = (form.equipmentTypes || []).includes(eq.id);
                    return (
                      <button
                        key={eq.id}
                        type="button"
                        onClick={() => toggleEquipmentType(eq.id)}
                        className={clsx(
                          'flex items-center gap-3 p-3 rounded-lg border text-left transition-all group',
                          isSelected 
                            ? 'bg-primary/10 border-primary text-primary shadow-sm font-semibold' 
                            : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30 text-foreground'
                        )}
                      >
                        <div className={clsx(
                          'w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0',
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-border group-hover:border-muted-foreground/50'
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <p className="text-xs font-bold truncate">{eq.label}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * El técnico solo verá y recibirá notificaciones de tickets correspondientes a sus especialidades.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña Inicial'} {!isEditing && <span className="text-red-500">*</span>}
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
              <CustomCheckbox
                id="active"
                checked={form.active}
                onChange={val => setForm({ ...form, active: val })}
                label="Usuario Activo (Permitir acceso al sistema)"
              />
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
