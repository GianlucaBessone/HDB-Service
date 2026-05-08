'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GlassWater, MapPin, Wrench, Package, Ticket,
  Clock, CheckCircle2, AlertTriangle, Archive, CalendarClock,
  ChevronRight, Loader2, X, RefreshCw, QrCode, Download, Pencil,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { exportDispenserToExcel } from '@/lib/exportExcel';

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  IN_SERVICE:           { label: 'En Servicio',           badge: 'badge-success', icon: CheckCircle2 },
  UNDER_REPAIR:         { label: 'En Reparación',         badge: 'badge-warning', icon: Wrench },
  IN_TECHNICAL_SERVICE: { label: 'En Servicio Técnico',   badge: 'badge-warning', icon: Wrench },
  BLOCKED:              { label: 'Bloqueado',             badge: 'badge-danger',  icon: AlertTriangle },
  BLOCKED_WAITING_OC:   { label: 'Bloqueado (Esperando OC)',badge: 'badge-danger', icon: AlertTriangle },
  OUT_OF_SERVICE:       { label: 'Fuera de Servicio',     badge: 'badge-neutral', icon: Archive },
  BACKUP:               { label: 'Backup',                badge: 'badge-info',    icon: Archive },
};

const ALL_STATUSES = ['IN_SERVICE', 'UNDER_REPAIR', 'IN_TECHNICAL_SERVICE', 'BLOCKED', 'BLOCKED_WAITING_OC', 'OUT_OF_SERVICE', 'BACKUP'];

type Tab = 'info' | 'location' | 'repairs' | 'consumables';

export default function DispenserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispenserId = params.id as string;

  const [dispenser, setDispenser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchDispenser = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dispensers/${dispenserId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setDispenser(data);
    } catch {
      toast.error('Dispenser no encontrado');
      router.push('/dispensers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDispenser(); }, [dispenserId]);

  if (isLoading || !dispenser) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-64 skeleton rounded-lg" />
      </div>
    );
  }

  const sc = STATUS_CONFIG[dispenser.status] || STATUS_CONFIG['BACKUP'];
  const StatusIcon = sc.icon;

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Información', icon: GlassWater },
    { key: 'location', label: 'Ubicaciones', icon: MapPin },
    { key: 'repairs', label: 'Reparaciones', icon: Wrench },
    { key: 'consumables', label: 'Consumibles', icon: Package },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb + Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dispensers" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Dispensers
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{dispenser.id}</span>
      </div>

      {/* Header Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <GlassWater className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{dispenser.id}</h1>
              <p className="text-muted-foreground">
                {dispenser.marca} — {dispenser.modelo}
                {dispenser.numeroSerie && dispenser.numeroSerie !== dispenser.id && (
                  <span className="ml-2">· S/N: {dispenser.numeroSerie}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className={`${sc.badge} text-sm`}>
              <StatusIcon className="w-4 h-4" />
              {sc.label}
            </span>
            <button
              onClick={() => window.open(`/dispensers/print-qr?ids=${dispenser.id}`, '_blank')}
              className="btn-outline btn-sm gap-1.5"
              title="Imprimir QR"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">QR</span>
            </button>
            <button
              onClick={() => exportDispenserToExcel(dispenser)}
              className="btn-outline btn-sm gap-1.5"
              title="Descargar Excel"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-outline btn-sm gap-1.5"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              onClick={() => setShowStatusModal(true)}
              className="btn-primary btn-sm gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Estado
            </button>
          </div>
        </div>

        {/* Location info */}
        {dispenser.location && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{dispenser.location.plant?.nombre}</span>
            <span className="text-muted-foreground">·</span>
            <span>{dispenser.location.sector?.nombre}</span>
            <span className="text-muted-foreground">·</span>
            <span>{dispenser.location.nombre}</span>
          </div>
        )}

        {/* Lifecycle Bar */}
        {dispenser.lifecycleStartDate && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1">
                <CalendarClock className="w-3.5 h-3.5" />
                Ciclo de vida: {dispenser.lifecycleMonths} meses
              </span>
              <span>
                {dispenser.lifecycleRemainingDays != null
                  ? `${dispenser.lifecycleRemainingDays} días restantes`
                  : 'N/A'}
              </span>
            </div>
            <div className="lifecycle-bar">
              <div
                className={clsx('lifecycle-fill', {
                  'bg-emerald-500': (dispenser.lifecycleRemainingDays ?? 0) > 365,
                  'bg-amber-500': (dispenser.lifecycleRemainingDays ?? 0) <= 365 && (dispenser.lifecycleRemainingDays ?? 0) > 90,
                  'bg-red-500': (dispenser.lifecycleRemainingDays ?? 0) <= 90,
                })}
                style={{
                  width: `${Math.min(100, Math.max(5, ((dispenser.lifecycleMonths * 30 - (dispenser.lifecycleRemainingDays ?? 0)) / (dispenser.lifecycleMonths * 30)) * 100))}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'tab-active' : 'tab'}
            >
              <TabIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="glass-card p-6">
        {activeTab === 'info' && <InfoTab dispenser={dispenser} />}
        {activeTab === 'location' && <LocationTab history={dispenser.locationHistory || []} />}
        {activeTab === 'repairs' && <RepairsTab repairs={dispenser.repairHistory || []} />}
        {activeTab === 'consumables' && <ConsumablesTab consumables={dispenser.consumableHistory || []} />}
      </div>

      {/* Tickets section */}
      {dispenser.tickets?.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Últimos Tickets
          </h3>
          <div className="space-y-2">
            {dispenser.tickets.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <span className="font-medium text-sm">{t.reason}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(t.createdAt).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('badge', {
                    'badge-danger': t.priority === 'CRITICAL',
                    'badge-warning': t.priority === 'HIGH',
                    'badge-info': t.priority === 'MEDIUM',
                    'badge-neutral': t.priority === 'LOW',
                  })}>{t.priority}</span>
                  <span className={clsx('badge', {
                    'badge-success': t.status === 'RESOLVED' || t.status === 'CLOSED',
                    'badge-warning': t.status === 'IN_PROGRESS',
                    'badge-info': t.status === 'OPEN',
                  })}>{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <StatusChangeModal
          currentStatus={dispenser.status}
          dispenserId={dispenser.id}
          onClose={() => setShowStatusModal(false)}
          onChanged={() => { setShowStatusModal(false); fetchDispenser(); }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditDispenserModal
          dispenser={dispenser}
          onClose={() => setShowEditModal(false)}
          onChanged={() => { setShowEditModal(false); fetchDispenser(); }}
        />
      )}
    </div>
  );
}

// ─── Info Tab ───────────────────────────────────────
function InfoTab({ dispenser }: { dispenser: any }) {
  const fields = [
    { label: 'ID', value: dispenser.id },
    { label: 'Marca', value: dispenser.marca },
    { label: 'Modelo', value: dispenser.modelo },
    { label: 'N° Serie', value: dispenser.numeroSerie || '—' },
    { label: 'Vida Útil', value: `${dispenser.lifecycleMonths} meses` },
    { label: 'Inicio Ciclo', value: dispenser.lifecycleStartDate ? new Date(dispenser.lifecycleStartDate).toLocaleDateString('es-AR') : '—' },
    { label: 'Fecha Compra', value: dispenser.fechaCompra ? new Date(dispenser.fechaCompra).toLocaleDateString('es-AR') : '—' },
    { label: 'Total Reparaciones', value: dispenser._count?.repairHistory || 0 },
    { label: 'Total Tickets', value: dispenser._count?.tickets || 0 },
    { label: 'Creado', value: new Date(dispenser.createdAt).toLocaleDateString('es-AR') },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {fields.map(f => (
        <div key={f.label} className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground font-medium">{f.label}</p>
          <p className="text-sm font-semibold mt-0.5">{f.value}</p>
        </div>
      ))}
      {dispenser.notas && (
        <div className="p-3 rounded-lg bg-muted/30 sm:col-span-2 lg:col-span-3">
          <p className="text-xs text-muted-foreground font-medium">Notas</p>
          <p className="text-sm mt-0.5">{dispenser.notas}</p>
        </div>
      )}
    </div>
  );
}

// ─── Location History Tab ──────────────────────────
function LocationTab({ history }: { history: any[] }) {
  if (history.length === 0) return <EmptyState text="Sin historial de ubicaciones" />;
  return (
    <div className="space-y-3">
      {history.map((h, i) => (
        <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <div className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
            i === 0 && !h.removedAt ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-muted'
          )}>
            <MapPin className={clsx('w-4 h-4', i === 0 && !h.removedAt ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {h.location?.plant?.nombre} — {h.location?.nombre || h.locationId}
            </p>
            <p className="text-xs text-muted-foreground">
              Asignado: {new Date(h.assignedAt).toLocaleDateString('es-AR')}
              {h.assignedBy && ` por ${h.assignedBy.nombre}`}
              {h.removedAt && ` · Retirado: ${new Date(h.removedAt).toLocaleDateString('es-AR')}`}
            </p>
          </div>
          {i === 0 && !h.removedAt && <span className="badge-success text-xs">Actual</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Repairs Tab ────────────────────────────────────
function RepairsTab({ repairs }: { repairs: any[] }) {
  if (repairs.length === 0) return <EmptyState text="Sin historial de reparaciones" />;
  return (
    <div className="space-y-3">
      {repairs.map(r => (
        <div key={r.id} className="p-4 rounded-lg bg-muted/30">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium">{r.descripcion}</p>
              {r.diagnostico && <p className="text-xs text-muted-foreground mt-1">{r.diagnostico}</p>}
            </div>
            <span className={clsx('badge', r.endDate ? 'badge-success' : 'badge-warning')}>
              {r.endDate ? 'Completada' : 'En curso'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Técnico: {r.technician?.nombre || '—'}</span>
            <span>Inicio: {new Date(r.startDate).toLocaleDateString('es-AR')}</span>
            {r.endDate && <span>Fin: {new Date(r.endDate).toLocaleDateString('es-AR')}</span>}
            {r.costo != null && <span>Costo: ${r.costo}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Consumables Tab ────────────────────────────────
function ConsumablesTab({ consumables }: { consumables: any[] }) {
  if (consumables.length === 0) return <EmptyState text="Sin historial de consumibles" />;
  return (
    <div className="space-y-3">
      {consumables.map(c => {
        const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
        return (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">{c.nombre}</p>
              <p className="text-xs text-muted-foreground">
                Código: {c.materialCode} · Instalado: {new Date(c.installedAt).toLocaleDateString('es-AR')}
              </p>
            </div>
            {c.expiresAt && (
              <span className={isExpired ? 'badge-danger' : 'badge-success'}>
                {isExpired ? 'Vencido' : `Vence: ${new Date(c.expiresAt).toLocaleDateString('es-AR')}`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────
function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 flex flex-col items-center text-center">
      <Clock className="w-12 h-12 text-muted-foreground/20 mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

// ─── Status Change Modal ────────────────────────────
function StatusChangeModal({
  currentStatus, dispenserId, onClose, onChanged
}: {
  currentStatus: string; dispenserId: string; onClose: () => void; onChanged: () => void;
}) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newStatus === currentStatus) { onClose(); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/dispensers/${dispenserId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al cambiar estado');
        return;
      }
      toast.success('Estado actualizado');
      onChanged();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Cambiar Estado</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {ALL_STATUSES.map(s => {
              const cfg = STATUS_CONFIG[s];
              const Icon = cfg.icon;
              return (
                <button
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    newStatus === s
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{cfg.label}</span>
                  {s === currentStatus && (
                    <span className="badge-neutral ml-auto text-xs">Actual</span>
                  )}
                </button>
              );
            })}
          </div>
          {(newStatus === 'BLOCKED' || newStatus === 'OUT_OF_SERVICE') && (
            <div>
              <label className="label">Motivo</label>
              <textarea
                className="textarea mt-1"
                rows={2}
                placeholder="Razón del cambio..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving || newStatus === currentStatus} className="btn-primary gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Dispenser Modal ────────────────────────────
function EditDispenserModal({
  dispenser, onClose, onChanged
}: {
  dispenser: any; onClose: () => void; onChanged: () => void;
}) {
  const [form, setForm] = useState({
    marca: dispenser.marca || '',
    modelo: dispenser.modelo || '',
    numeroSerie: dispenser.numeroSerie || '',
    lifecycleMonths: dispenser.lifecycleMonths || 60,
    notas: dispenser.notas || '',
    locationId: dispenser.locationId || '',
  });
  
  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocations(data || []))
      .catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update basic info
      const res = await fetch(`/api/dispensers/${dispenser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marca: form.marca,
          modelo: form.modelo,
          numeroSerie: form.numeroSerie,
          lifecycleMonths: Number(form.lifecycleMonths),
          notas: form.notas,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar dispenser');
      }

      // 2. Update location if changed
      if (form.locationId && form.locationId !== dispenser.locationId) {
        const assignRes = await fetch(`/api/dispensers/${dispenser.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId: form.locationId, force: true }),
        });
        if (!assignRes.ok) {
          const err = await assignRes.json();
          throw new Error(err.error || 'Error al asignar ubicación');
        }
      }

      toast.success('Dispenser actualizado');
      onChanged();
    } catch (error: any) {
      toast.error(error.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Editar Dispenser</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="modal-body space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Marca</label>
              <input 
                className="input mt-1" 
                value={form.marca} 
                onChange={e => setForm({ ...form, marca: e.target.value })} 
              />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input 
                className="input mt-1" 
                value={form.modelo} 
                onChange={e => setForm({ ...form, modelo: e.target.value })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">N° de Serie</label>
              <input 
                className="input mt-1" 
                value={form.numeroSerie} 
                onChange={e => setForm({ ...form, numeroSerie: e.target.value })} 
              />
            </div>
            <div>
              <label className="label">Vida Útil (meses)</label>
              <input 
                type="number"
                className="input mt-1" 
                value={form.lifecycleMonths} 
                onChange={e => setForm({ ...form, lifecycleMonths: parseInt(e.target.value) || 0 })} 
              />
            </div>
          </div>

          <div>
            <label className="label">Ubicación</label>
            <select
              className="select mt-1"
              value={form.locationId}
              onChange={e => setForm({ ...form, locationId: e.target.value })}
            >
              <option value="">-- Sin asignar --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.plant.nombre} — {loc.nombre}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Al reasignar, si hay otro dispenser activo en esa ubicación será reemplazado.
            </p>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              className="textarea mt-1"
              rows={3}
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
            />
          </div>

        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
