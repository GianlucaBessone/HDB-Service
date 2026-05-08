'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  GlassWater, Search, Plus, Filter, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Wrench, Archive, Eye, X, Loader2, QrCode,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

type Dispenser = {
  id: string;
  marca: string;
  modelo: string;
  status: string;
  numeroSerie: string | null;
  lifecycleMonths: number;
  lifecycleStartDate: string | null;
  createdAt: string;
  location: {
    id: string;
    nombre: string;
    plant: { id: string; nombre: string; client: { id: string; nombre: string } };
    sector: { id: string; nombre: string } | null;
  } | null;
  _count: { tickets: number; repairHistory: number; maintenanceSchedules: number };
};

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  IN_SERVICE:           { label: 'En Servicio',           badge: 'badge-success', icon: CheckCircle2 },
  UNDER_REPAIR:         { label: 'En Reparación',         badge: 'badge-warning', icon: Wrench },
  IN_TECHNICAL_SERVICE: { label: 'En Servicio Técnico',   badge: 'badge-warning', icon: Wrench },
  BLOCKED:              { label: 'Bloqueado',             badge: 'badge-danger',  icon: AlertTriangle },
  BLOCKED_WAITING_OC:   { label: 'Bloqueado (Esperando OC)',badge: 'badge-danger', icon: AlertTriangle },
  OUT_OF_SERVICE:       { label: 'Fuera de Servicio',     badge: 'badge-neutral', icon: Archive },
  BACKUP:               { label: 'Backup',                badge: 'badge-info',    icon: Archive },
};

export default function DispensersPage() {
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchDispensers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/dispensers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDispensers(data.dispensers || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching dispensers:', error);
      toast.error('Error al cargar dispensers');
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchDispensers, 300);
    return () => clearTimeout(debounce);
  }, [fetchDispensers]);

  // KPI counts
  const kpis = {
    total: total,
    inService: dispensers.filter(d => d.status === 'IN_SERVICE').length,
    repair: dispensers.filter(d => d.status === 'UNDER_REPAIR').length,
    blocked: dispensers.filter(d => d.status === 'BLOCKED').length,
    backup: dispensers.filter(d => d.status === 'BACKUP').length,
  };

  // Client-side sort
  const sorted = [...dispensers].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortField) {
      case 'id': aVal = a.id; bVal = b.id; break;
      case 'marca': aVal = a.marca; bVal = b.marca; break;
      case 'planta': aVal = a.location?.plant?.nombre || ''; bVal = b.location?.plant?.nombre || ''; break;
      case 'status': aVal = a.status; bVal = b.status; break;
      default: aVal = a.createdAt; bVal = b.createdAt;
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GlassWater className="w-7 h-7 text-primary" />
            </div>
            Dispensers
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de equipos dispensadores de agua</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.open(`/dispensers/print-qr?ids=${sorted.map(d => d.id).join(',')}`, '_blank')} 
            className="btn-outline btn-lg gap-2 shrink-0 hidden sm:flex"
            disabled={sorted.length === 0}
          >
            <QrCode className="w-5 h-5" />
            Imprimir QRs
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-lg gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            Nuevo Dispenser
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total" value={kpis.total} color="primary" />
        <KpiCard label="En Servicio" value={kpis.inService} color="emerald" />
        <KpiCard label="En Reparación" value={kpis.repair} color="amber" />
        <KpiCard label="Bloqueados" value={kpis.blocked} color="red" />
        <KpiCard label="Backup" value={kpis.backup} color="sky" />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por ID, marca, modelo, serie..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select pl-10 min-w-[180px]"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <GlassWater className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">No se encontraron dispensers</p>
          <p className="text-muted-foreground text-sm mt-1">Intenta con otros filtros o crea uno nuevo</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('id')}>
                  ID / Serie <SortIcon field="id" />
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('marca')}>
                  Marca / Modelo <SortIcon field="marca" />
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('planta')}>
                  Ubicación <SortIcon field="planta" />
                </th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  Estado <SortIcon field="status" />
                </th>
                <th>Tickets</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => {
                const sc = STATUS_CONFIG[d.status] || STATUS_CONFIG['BACKUP'];
                const StatusIcon = sc.icon;
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="font-semibold text-foreground">{d.id}</div>
                      {d.numeroSerie && d.numeroSerie !== d.id && (
                        <div className="text-xs text-muted-foreground">S/N: {d.numeroSerie}</div>
                      )}
                    </td>
                    <td>
                      <div className="font-medium">{d.marca}</div>
                      <div className="text-xs text-muted-foreground">{d.modelo}</div>
                    </td>
                    <td>
                      {d.location ? (
                        <div>
                          <div className="font-medium">{d.location.plant.nombre}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.location.sector?.nombre} — {d.location.nombre}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <span className={sc.badge}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {sc.label}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-muted-foreground">{d._count.tickets}</span>
                    </td>
                    <td className="text-right">
                      <Link
                        href={`/dispensers/${d.id}`}
                        className="btn-ghost btn-sm gap-1.5 text-primary hover:text-primary/80"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateDispenserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchDispensers(); }}
        />
      )}
    </div>
  );
}

// ─── KPI Card ───────────────────────────────────────
function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'border-t-primary text-primary',
    emerald: 'border-t-emerald-500 text-emerald-600 dark:text-emerald-400',
    amber: 'border-t-amber-500 text-amber-600 dark:text-amber-400',
    red: 'border-t-red-500 text-red-600 dark:text-red-400',
    sky: 'border-t-sky-500 text-sky-600 dark:text-sky-400',
  };
  return (
    <div className={`glass-card p-4 border-t-4 ${colorMap[color]?.split(' ')[0]}`}>
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(' ').slice(1).join(' ')}`}>{value}</p>
    </div>
  );
}

// ─── Create Modal ───────────────────────────────────
function CreateDispenserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ id: '', marca: '', modelo: '', numeroSerie: '', lifecycleMonths: '60', notas: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.marca.trim() || !form.modelo.trim()) {
      toast.error('ID, Marca y Modelo son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/dispensers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id.trim(),
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          numeroSerie: form.numeroSerie.trim() || null,
          lifecycleMonths: parseInt(form.lifecycleMonths) || 60,
          notas: form.notas.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al crear dispenser');
        return;
      }
      toast.success('Dispenser creado exitosamente');
      onCreated();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Nuevo Dispenser</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">ID del Equipo *</label>
                <input
                  className="input mt-1"
                  placeholder="DISP-XXXX"
                  value={form.id}
                  onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">N° Serie</label>
                <input
                  className="input mt-1"
                  placeholder="Opcional"
                  value={form.numeroSerie}
                  onChange={e => setForm(p => ({ ...p, numeroSerie: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Marca *</label>
                <input
                  className="input mt-1"
                  placeholder="PSA, AquaCool..."
                  value={form.marca}
                  onChange={e => setForm(p => ({ ...p, marca: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="label">Modelo *</label>
                <input
                  className="input mt-1"
                  placeholder="02P-B-F/C..."
                  value={form.modelo}
                  onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Vida Útil (meses)</label>
              <input
                type="number"
                className="input mt-1"
                value={form.lifecycleMonths}
                onChange={e => setForm(p => ({ ...p, lifecycleMonths: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea
                className="textarea mt-1"
                rows={2}
                placeholder="Observaciones..."
                value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Dispenser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
