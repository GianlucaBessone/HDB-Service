'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  GlassWater, Search, Plus, Filter, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, Wrench, Archive, Eye, X, Loader2, QrCode,
  Wind, Snowflake, Fan, Cpu, SlidersHorizontal, Layers, ShieldAlert, Building2
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import InitConsumablesModal from '@/components/InitConsumablesModal';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { 
  EquipmentType, 
  AssetCriticality, 
  EQUIPMENT_TYPE_LABELS, 
  CRITICALITY_LABELS, 
  CRITICALITY_COLORS, 
  SPEC_FIELDS_BY_TYPE,
  getEquipmentTypeLabel,
  getCriticalityColor,
  getCriticalityLabel 
} from '@/lib/equipment';

type Dispenser = {
  id: string;
  equipmentType: EquipmentType;
  criticality: AssetCriticality;
  marca: string;
  modelo: string;
  status: string;
  technicalSpecs?: Record<string, any> | null;
  numeroSerie: string | null;
  lifecycleMonths: number;
  lifecycleStartDate: string | null;
  createdAt: string;
  clientId?: string | null;
  client?: { id: string; nombre: string } | null;
  location: {
    id: string;
    nombre: string;
    plant: { id: string; nombre: string; client: { id: string; nombre: string } };
    sector: { id: string; nombre: string } | null;
  } | null;
  plant: { id: string; nombre: string; client?: { id: string; nombre: string } } | null; // Owner plant
  _count: { tickets: number; repairHistory: number; maintenanceSchedules: number };
};

export function getEquipmentIcon(type?: string) {
  switch (type) {
    case 'AIR_CONDITIONER': return Wind;
    case 'COLD_ROOM': return Snowflake;
    case 'REFRIGERATOR': return Layers;
    case 'VENTILATION': return Fan;
    case 'DISPENSER': return GlassWater;
    default: return Cpu;
  }
}

export default function DispensersPage() {
  const { role, plantIds } = useAuthStore();
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dispenserToInit, setDispenserToInit] = useState<any>(null);
  const [sortField, setSortField] = useState<string>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.clients || []);
    }
  });
  const clients = clientsData || [];

  const { data, isLoading, refetch: fetchDispensers } = useQuery({
    queryKey: ['dispensers', search, clientFilter, statusFilter, typeFilter, criticalityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (clientFilter) params.set('clientId', clientFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('equipmentType', typeFilter);
      if (criticalityFilter) params.set('criticality', criticalityFilter);
      const res = await fetch(`/api/dispensers?${params}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch: ${res.status}`);
      }
      return res.json();
    }
  });

  const dispensers: Dispenser[] = data?.dispensers || [];
  const total = data?.total || 0;

  // KPI counts
  const kpis = {
    total: total,
    inService: dispensers.filter(d => d.status === 'IN_SERVICE').length,
    repair: dispensers.filter(d => d.status === 'UNDER_REPAIR').length,
    blocked: dispensers.filter(d => d.status === 'BLOCKED' || d.status === 'BLOCKED_WAITING_OC').length,
    backup: dispensers.filter(d => d.status === 'BACKUP').length,
  };

  // Client-side sort
  const sorted = [...dispensers].sort((a, b) => {
    let aVal: any, bVal: any;
    switch (sortField) {
      case 'id': aVal = a.id; bVal = b.id; break;
      case 'marca': aVal = a.marca; bVal = b.marca; break;
      case 'equipmentType': aVal = a.equipmentType || ''; bVal = b.equipmentType || ''; break;
      case 'client':
        aVal = a.client?.nombre || a.plant?.client?.nombre || a.location?.plant?.client?.nombre || '';
        bVal = b.client?.nombre || b.plant?.client?.nombre || b.location?.plant?.client?.nombre || '';
        break;
      case 'planta': aVal = a.location?.plant?.nombre || ''; bVal = b.location?.plant?.nombre || ''; break;
      case 'planta_duena': aVal = a.plant?.nombre || ''; bVal = b.plant?.nombre || ''; break;
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

  const categoryOptions: { key: string; label: string; icon: React.ElementType }[] = [
    { key: '', label: 'Todos', icon: SlidersHorizontal },
    { key: 'AIR_CONDITIONER', label: 'Aires acondicionados', icon: Wind },
    { key: 'COLD_ROOM', label: 'Cámaras frigoríficas', icon: Snowflake },
    { key: 'DISPENSER', label: 'Dispensers', icon: GlassWater },
    { key: 'REFRIGERATOR', label: 'Heladeras / freezers', icon: Layers },
    { key: 'VENTILATION', label: 'Ventilación', icon: Fan },
    { key: 'OTHER', label: 'Otros', icon: Cpu },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Activos"
        description="Parque instalado: climatización, refrigeración, ventilación, dispensers y otros equipos."
        actions={
          (role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <>
              {sorted.length > 0 ? (
                <Link
                  href={`/dispensers/print-qr?ids=${sorted.map(d => d.id).join(',')}`}
                  target="_blank"
                  className="btn-outline hidden sm:inline-flex"
                >
                  <QrCode className="h-4 w-4" />
                  Imprimir QR ({sorted.length})
                </Link>
              ) : (
                <button className="btn-outline hidden sm:inline-flex" disabled>
                  <QrCode className="h-4 w-4" />
                  Imprimir QR
                </button>
              )}
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <Plus className="h-4 w-4" />
                Nuevo activo
              </button>
            </>
          )
        }
      />

      {/* Tipo de activo */}
      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Tipo de activo">
        {categoryOptions.map(cat => {
          const Icon = cat.icon;
          const isSelected = typeFilter === cat.key;
          return (
            <button
              key={cat.key}
              role="tab"
              aria-selected={isSelected}
              onClick={() => setTypeFilter(cat.key)}
              className={clsx(
                'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Total" value={kpis.total} />
        <StatCard label="En servicio" value={kpis.inService} tone="success" />
        <StatCard label="En reparación" value={kpis.repair} tone="warning" />
        <StatCard label="Bloqueados / OC" value={kpis.blocked} tone="danger" emphasize={kpis.blocked > 0} />
        <StatCard label="Reserva / backup" value={kpis.backup} tone="info" />
      </div>

      <FilterBar>
        <FieldIcon icon={Search} className="sm:col-span-2 lg:min-w-[240px] lg:flex-1">
          <input
            type="search"
            placeholder="Buscar por ID, marca, modelo o serie…"
            aria-label="Buscar activos"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </FieldIcon>
        <FieldIcon icon={Building2} className="lg:w-52">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="select pl-9" aria-label="Empresa">
            <option value="">Todas las empresas</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </FieldIcon>
        <FieldIcon icon={Filter} className="lg:w-52">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select pl-9" aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="IN_SERVICE">En servicio</option>
            <option value="UNDER_REPAIR">En reparación</option>
            <option value="IN_TECHNICAL_SERVICE">En servicio técnico</option>
            <option value="BLOCKED">Bloqueado</option>
            <option value="BLOCKED_WAITING_OC">Bloqueado (esperando OC)</option>
            <option value="OUT_OF_SERVICE">Fuera de servicio</option>
            <option value="BACKUP">Backup / reserva</option>
          </select>
        </FieldIcon>
        <select value={criticalityFilter} onChange={e => setCriticalityFilter(e.target.value)} className="select lg:w-44" aria-label="Criticidad">
          <option value="">Toda criticidad</option>
          <option value="CRITICAL">Crítica</option>
          <option value="HIGH">Alta</option>
          <option value="MEDIUM">Media</option>
          <option value="LOW">Baja</option>
        </select>
      </FilterBar>

      {/* Table */}
      {isLoading ? (
        <div className="glass-card divide-y divide-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={Cpu} title="No se encontraron activos" description="Probá con otros filtros o registrá un activo nuevo." />
      ) : (
        <>
        {/* Móvil: tarjetas */}
        <ul className="glass-card divide-y divide-border overflow-hidden md:hidden">
          {sorted.map(d => {
            const TypeIcon = getEquipmentIcon(d.equipmentType);
            const clientName = d.client?.nombre || d.plant?.client?.nombre || d.location?.plant?.client?.nombre;
            return (
              <li key={d.id}>
                <Link href={`/dispensers/${d.id}`} className="flex items-start gap-3 px-4 py-3.5 active:bg-muted/60">
                  <TypeIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{d.id}</span>
                      <span className={clsx('badge', getStatusColor(d.status))}>{t(d.status)}</span>
                    </div>
                    <p className="truncate text-[13px] text-foreground">{d.marca} {d.modelo}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[clientName, d.location ? `${d.location.plant.nombre} · ${d.location.nombre}` : 'Sin ubicación'].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className={clsx('badge', getCriticalityColor(d.criticality))}>{getCriticalityLabel(d.criticality)}</span>
                      <span className="text-2xs text-muted-foreground tabular">{d._count.tickets} tickets</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop: tabla */}
        <div className="table-container hidden md:block">
          <table className="table">
            <thead>
              <tr>
                <th className="cursor-pointer select-none text-left" onClick={() => toggleSort('equipmentType')}>
                  Tipo <SortIcon field="equipmentType" />
                </th>
                <th className="cursor-pointer select-none text-left" onClick={() => toggleSort('id')}>
                  ID / Serie <SortIcon field="id" />
                </th>
                <th className="cursor-pointer select-none text-left" onClick={() => toggleSort('marca')}>
                  Marca / Modelo <SortIcon field="marca" />
                </th>
                <th className="cursor-pointer select-none text-left" onClick={() => toggleSort('client')}>
                  Empresa / Cliente <SortIcon field="client" />
                </th>
                <th className="cursor-pointer select-none text-center">
                  Criticidad
                </th>
                <th className="cursor-pointer select-none text-center" onClick={() => toggleSort('planta_duena')}>
                  Planta dueña <SortIcon field="planta_duena" />
                </th>
                <th className="cursor-pointer select-none text-center" onClick={() => toggleSort('planta')}>
                  Ubicación actual <SortIcon field="planta" />
                </th>
                <th className="cursor-pointer select-none text-center" onClick={() => toggleSort('status')}>
                  Estado <SortIcon field="status" />
                </th>
                <th className="text-center">Tickets</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(d => {
                const TypeIcon = getEquipmentIcon(d.equipmentType);
                const clientName = d.client?.nombre || d.plant?.client?.nombre || d.location?.plant?.client?.nombre;
                return (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="text-xs font-medium text-foreground">
                          {getEquipmentTypeLabel(d.equipmentType)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="font-mono text-sm font-semibold text-foreground">{d.id}</div>
                      {d.numeroSerie && d.numeroSerie !== d.id && (
                        <div className="text-2xs text-muted-foreground font-mono">S/N: {d.numeroSerie}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm font-medium">{d.marca}</div>
                      <div className="text-xs text-muted-foreground">{d.modelo}</div>
                    </td>
                    <td>
                      {clientName ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-xs text-foreground/90 truncate max-w-[130px]" title={clientName}>
                            {clientName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sin cliente</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={clsx('badge', getCriticalityColor(d.criticality))}>
                        {getCriticalityLabel(d.criticality)}
                      </span>
                    </td>
                    <td className="text-center">
                      {d.plant ? (
                        <div className="text-xs font-medium">{d.plant.nombre}</div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">No definida</span>
                      )}
                    </td>
                    <td className="text-center">
                      {d.location ? (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1.5">
                            <div className="font-medium text-xs">{d.location.plant.nombre}</div>
                            {d.plant && d.location.plant.id !== d.plant.id && (
                              <span className="badge-info">
                                {plantIds?.includes(d.location.plant.id) ? 'Prestado' : 'Prestado a otra planta'}
                              </span>
                            )}
                          </div>
                          <div className="text-2xs text-muted-foreground">
                            {d.location.sector?.nombre} — {d.location.nombre}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <span className={clsx('badge', getStatusColor(d.status))}>
                          {d.status === 'IN_SERVICE' ? <CheckCircle2 className="h-3 w-3" /> :
                           d.status === 'BLOCKED' || d.status === 'BLOCKED_WAITING_OC' ? <AlertTriangle className="h-3 w-3" /> :
                           d.status === 'UNDER_REPAIR' || d.status === 'IN_TECHNICAL_SERVICE' ? <Wrench className="h-3 w-3" /> :
                           <Archive className="h-3 w-3" />}
                          {t(d.status)}
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="text-xs text-muted-foreground tabular">{d._count.tickets}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <Link
                          href={`/dispensers/${d.id}`}
                          className="btn-ghost btn-sm text-primary"
                        >
                          <Eye className="h-4 w-4" />
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateAssetModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(newAsset) => {
            setShowCreateModal(false);
            fetchDispensers();
            if (newAsset) {
              setDispenserToInit(newAsset);
            }
          }}
        />
      )}

      {dispenserToInit && (
        <InitConsumablesModal
          dispenser={dispenserToInit}
          onClose={() => setDispenserToInit(null)}
          onInitialized={() => {
            setDispenserToInit(null);
            fetchDispensers();
          }}
        />
      )}
    </div>
  );
}

// ─── Create Asset Modal ──────────────────────────────
function CreateAssetModal({ onClose, onCreated }: { onClose: () => void; onCreated: (d?: any) => void }) {
  const [form, setForm] = useState({ 
    id: '', 
    equipmentType: 'AIR_CONDITIONER' as EquipmentType,
    criticality: 'MEDIUM' as AssetCriticality,
    marca: '', 
    modelo: '', 
    numeroSerie: '', 
    fechaCompra: '', 
    lifecycleMonths: '60', 
    notas: '', 
    clientId: '',
    plantId: '',
    technicalSpecs: {} as Record<string, any>
  });
  
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [initConsumablesNow, setInitConsumablesNow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.ok ? res.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : (data.clients || [])))
      .catch(() => setClients([]));

    fetch('/api/plants')
      .then(res => res.ok ? res.json() : [])
      .then(data => setPlants(Array.isArray(data) ? data : []))
      .catch(() => setPlants([]));
  }, []);

  const handleSpecChange = (key: string, value: any) => {
    setForm(p => ({
      ...p,
      technicalSpecs: { ...p.technicalSpecs, [key]: value }
    }));
  };

  const getPlaceholderId = () => {
    switch (form.equipmentType) {
      case 'AIR_CONDITIONER': return 'AA-SPLIT-01';
      case 'COLD_ROOM': return 'CF-CONG-01';
      case 'DISPENSER': return 'DISP-0101';
      case 'REFRIGERATOR': return 'HEL-001';
      case 'VENTILATION': return 'VENT-01';
      default: return 'ACT-001';
    }
  };

  const getPlaceholderBrand = () => {
    switch (form.equipmentType) {
      case 'AIR_CONDITIONER': return 'BGH, Carrier, Surrey, Daikin...';
      case 'COLD_ROOM': return 'Bitzer, Danfoss, Bohn, Frascold...';
      case 'DISPENSER': return 'PSA, AquaCool, CIBI, Canaletas...';
      case 'REFRIGERATOR': return 'Inelro, Briket, Bambi, Frimax...';
      case 'VENTILATION': return 'Soler & Palau, Glicet, Maraldi...';
      default: return 'Marca del fabricante...';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id.trim() || !form.marca.trim() || !form.modelo.trim()) {
      toast.error('ID, marca y modelo son obligatorios');
      return;
    }
    if (!form.clientId && !form.plantId) {
      toast.error('Seleccioná la empresa o la planta dueña');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/dispensers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id.trim().toUpperCase(),
          equipmentType: form.equipmentType,
          criticality: form.criticality,
          marca: form.marca.trim(),
          modelo: form.modelo.trim(),
          numeroSerie: form.numeroSerie.trim() || null,
          fechaCompra: form.fechaCompra || null,
          lifecycleMonths: parseInt(form.lifecycleMonths) || 60,
          notas: form.notas.trim() || null,
          clientId: form.clientId || null,
          plantId: form.plantId || null,
          technicalSpecs: form.technicalSpecs
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al crear equipo');
        return;
      }
      const newAsset = await res.json();
      toast.success('Activo registrado');
      onCreated(initConsumablesNow ? newAsset : undefined);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const activeSpecFields = SPEC_FIELDS_BY_TYPE[form.equipmentType] || [];

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="modal-header shrink-0">
          <div className="min-w-0">
            <h2>Nuevo activo</h2>
            <p className="text-xs text-muted-foreground">Registrá un activo para su seguimiento y mantenimiento.</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1">
          <div className="modal-body space-y-6">
            {/* Type & Criticality Selector */}
            <section className="space-y-3">
              <label className="eyebrow block">
                1. Tipo y criticidad
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'AIR_CONDITIONER', label: 'Aire acondicionado', icon: Wind },
                  { id: 'COLD_ROOM', label: 'Cámara frigorífica', icon: Snowflake },
                  { id: 'DISPENSER', label: 'Dispenser de agua', icon: GlassWater },
                  { id: 'REFRIGERATOR', label: 'Heladera comercial', icon: Layers },
                  { id: 'VENTILATION', label: 'Ventilación / extracción', icon: Fan },
                  { id: 'OTHER', label: 'Otro activo', icon: Cpu },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = form.equipmentType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, equipmentType: item.id as EquipmentType }))}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 rounded-md border p-3 text-center transition-colors',
                        isSelected
                          ? 'border-primary bg-primary/10 font-medium text-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="label mb-1.5">Criticidad operativa</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as AssetCriticality[]).map(crit => (
                    <button
                      key={crit}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, criticality: crit }))}
                      className={clsx(
                        'min-h-[40px] rounded-md border px-1 text-center text-xs font-medium transition-colors sm:min-h-[36px]',
                        form.criticality === crit
                          ? getCriticalityColor(crit) + ' ring-1 ring-current'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      )}
                    >
                      {CRITICALITY_LABELS[crit]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* General Info */}
            <section className="space-y-4 border-t pt-4">
              <h3 className="eyebrow">
                2. Identificación y ubicación
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">ID del activo *</label>
                  <input
                    className="input mt-1 font-mono font-bold uppercase"
                    placeholder={getPlaceholderId()}
                    value={form.id}
                    onChange={e => setForm(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">N.º de serie</label>
                  <input
                    className="input mt-1"
                    placeholder="S/N en placa..."
                    value={form.numeroSerie}
                    onChange={e => setForm(p => ({ ...p, numeroSerie: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Marca *</label>
                  <input
                    className="input mt-1"
                    placeholder={getPlaceholderBrand()}
                    value={form.marca}
                    onChange={e => setForm(p => ({ ...p, marca: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">Modelo *</label>
                  <input
                    className="input mt-1"
                    placeholder="Modelo exacto..."
                    value={form.modelo}
                    onChange={e => setForm(p => ({ ...p, modelo: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Empresa / cliente *
                  </label>
                  <select
                    className="select mt-1 w-full"
                    value={form.clientId}
                    onChange={e => {
                      const newClientId = e.target.value;
                      setForm(p => ({
                        ...p,
                        clientId: newClientId,
                        plantId: plants.some(pl => pl.id === p.plantId && pl.clientId === newClientId) ? p.plantId : ''
                      }));
                    }}
                    required
                  >
                    <option value="">Seleccionar empresa…</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Planta dueña *</label>
                  <select
                    className="select mt-1 w-full"
                    value={form.plantId}
                    onChange={e => {
                      const selectedPlant = plants.find(p => p.id === e.target.value);
                      setForm(p => ({ 
                        ...p, 
                        plantId: e.target.value,
                        clientId: selectedPlant?.clientId || p.clientId 
                      }));
                    }}
                    required
                  >
                    <option value="">
                      {form.clientId ? 'Seleccionar planta del cliente…' : 'Seleccionar planta…'}
                    </option>
                    {plants
                      .filter(p => !form.clientId || p.clientId === form.clientId)
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Fecha de compra / instalación</label>
                <input
                  type="date"
                  className="input mt-1"
                  value={form.fechaCompra}
                  onChange={e => setForm(p => ({ ...p, fechaCompra: e.target.value }))}
                />
              </div>
            </section>

            {/* Dynamic Technical Specs */}
            {activeSpecFields.length > 0 && (
              <section className="space-y-4 rounded-md border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="eyebrow">
                    3. Ficha técnica ({getEquipmentTypeLabel(form.equipmentType)})
                  </h3>
                  <span className="text-2xs text-muted-foreground">Según tipo de activo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeSpecFields.map(field => {
                    const value = form.technicalSpecs[field.key] || '';
                    if (field.type === 'select') {
                      return (
                        <div key={field.key}>
                          <label className="label mb-1.5">{field.label}</label>
                          <select
                            className="select"
                            value={value}
                            onChange={e => handleSpecChange(field.key, e.target.value)}
                          >
                            <option value="">Seleccionar…</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return (
                      <div key={field.key}>
                        <label className="label mb-1.5">
                          {field.label} {field.unit && <span className="text-muted-foreground font-normal">({field.unit})</span>}
                        </label>
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          className="input"
                          placeholder={field.placeholder || ''}
                          value={value}
                          onChange={e => handleSpecChange(field.key, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Consumables / Initial Supplies */}
            <section className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
                <input
                  type="checkbox"
                  id="initConsumables"
                  className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
                  checked={initConsumablesNow}
                  onChange={e => setInitConsumablesNow(e.target.checked)}
                />
                <label htmlFor="initConsumables" className="cursor-pointer select-none text-sm font-medium">
                  Registrar ahora los insumos instalados
                </label>
              </div>
            </section>

            {/* Other Info */}
            <section className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Vida útil estimada (meses)</label>
                  <input
                    type="number"
                    className="input mt-1"
                    value={form.lifecycleMonths}
                    onChange={e => setForm(p => ({ ...p, lifecycleMonths: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Notas adicionales</label>
                  <input
                    className="input mt-1"
                    placeholder="Ubicación de corte, llaves, etc."
                    value={form.notas}
                    onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary px-8 gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Activo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
