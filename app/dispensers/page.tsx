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
    { key: '', label: 'Todos los Activos', icon: SlidersHorizontal },
    { key: 'AIR_CONDITIONER', label: 'Aires Acondicionados', icon: Wind },
    { key: 'COLD_ROOM', label: 'Cámaras Frigoríficas', icon: Snowflake },
    { key: 'DISPENSER', label: 'Dispensers', icon: GlassWater },
    { key: 'REFRIGERATOR', label: 'Heladeras / Freezers', icon: Layers },
    { key: 'VENTILATION', label: 'Ventilación', icon: Fan },
    { key: 'OTHER', label: 'Otros', icon: Cpu },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Cpu className="w-7 h-7 text-primary" />
            </div>
            Gestión de Activos y Equipos
          </h1>
          <p className="text-muted-foreground mt-1">
            Inventario integral de aires acondicionados, cámaras frigoríficas, dispensers y maquinaria
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <>
              {sorted.length > 0 ? (
                <Link
                  href={`/dispensers/print-qr?ids=${sorted.map(d => d.id).join(',')}`}
                  target="_blank"
                  className="btn-outline btn-lg gap-2 shrink-0 hidden sm:flex"
                >
                  <QrCode className="w-5 h-5" />
                  Imprimir QRs
                </Link>
              ) : (
                <button 
                  className="btn-outline btn-lg gap-2 shrink-0 hidden sm:flex"
                  disabled
                >
                  <QrCode className="w-5 h-5" />
                  Imprimir QRs
                </button>
              )}
              <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-lg gap-2 shrink-0 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5" />
                Nuevo Activo
              </button>
            </>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categoryOptions.map(cat => {
          const Icon = cat.icon;
          const isSelected = typeFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setTypeFilter(cat.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Activos" value={kpis.total} color="primary" />
        <KpiCard label="En Servicio" value={kpis.inService} color="emerald" />
        <KpiCard label="En Reparación" value={kpis.repair} color="amber" />
        <KpiCard label="Bloqueados / OC" value={kpis.blocked} color="red" />
        <KpiCard label="Reserva / Backup" value={kpis.backup} color="sky" />
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
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="select pl-10 min-w-[180px]"
          >
            <option value="">Todas las Empresas</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="select pl-10 min-w-[170px]"
          >
            <option value="">Todos los estados</option>
            <option value="IN_SERVICE">En Servicio</option>
            <option value="UNDER_REPAIR">En Reparación</option>
            <option value="IN_TECHNICAL_SERVICE">En Servicio Técnico</option>
            <option value="BLOCKED">Bloqueado</option>
            <option value="BLOCKED_WAITING_OC">Bloqueado (Esperando OC)</option>
            <option value="OUT_OF_SERVICE">Fuera de Servicio</option>
            <option value="BACKUP">Backup / Reserva</option>
          </select>
        </div>
        <div className="relative">
          <select
            value={criticalityFilter}
            onChange={e => setCriticalityFilter(e.target.value)}
            className="select min-w-[150px]"
          >
            <option value="">Cualquier criticidad</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
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
          <Cpu className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">No se encontraron activos</p>
          <p className="text-muted-foreground text-sm mt-1">Intenta con otros filtros o registra uno nuevo</p>
        </div>
      ) : (
        <div className="table-container">
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
                  Planta Dueña <SortIcon field="planta_duena" />
                </th>
                <th className="cursor-pointer select-none text-center" onClick={() => toggleSort('planta')}>
                  Ubicación Actual <SortIcon field="planta" />
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
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-foreground/80">
                          {getEquipmentTypeLabel(d.equipmentType)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="font-mono font-bold text-sm text-foreground">{d.id}</div>
                      {d.numeroSerie && d.numeroSerie !== d.id && (
                        <div className="text-[10px] text-muted-foreground font-mono">S/N: {d.numeroSerie}</div>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold text-sm">{d.marca}</div>
                      <div className="text-xs text-muted-foreground">{d.modelo}</div>
                    </td>
                    <td>
                      {clientName ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-medium text-xs text-foreground/90 truncate max-w-[130px]" title={clientName}>
                            {clientName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sin cliente</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border', getCriticalityColor(d.criticality))}>
                        {getCriticalityLabel(d.criticality)}
                      </span>
                    </td>
                    <td className="text-center">
                      {d.plant ? (
                        <div className="font-medium text-xs text-primary">{d.plant.nombre}</div>
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
                              <span className={clsx(
                                "text-[9px] px-1.5 py-0.5 rounded-full font-bold border",
                                plantIds?.includes(d.location.plant.id) 
                                  ? "bg-blue-100 text-blue-700 border-blue-200" 
                                  : "bg-purple-100 text-purple-700 border-purple-200"
                              )}>
                                {plantIds?.includes(d.location.plant.id) ? 'PRESTADO' : 'PRESTADO A OTRO'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {d.location.sector?.nombre} — {d.location.nombre}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <span className={clsx('badge gap-1.5 border text-xs', getStatusColor(d.status))}>
                          {d.status === 'IN_SERVICE' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           d.status === 'BLOCKED' || d.status === 'BLOCKED_WAITING_OC' ? <AlertTriangle className="w-3.5 h-3.5" /> :
                           d.status === 'UNDER_REPAIR' || d.status === 'IN_TECHNICAL_SERVICE' ? <Wrench className="w-3.5 h-3.5" /> :
                           <Archive className="w-3.5 h-3.5" />}
                          {t(d.status)}
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="text-xs font-semibold text-muted-foreground">{d._count.tickets}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center">
                        <Link
                          href={`/dispensers/${d.id}`}
                          className="btn-ghost btn-sm gap-1.5 text-primary hover:text-primary/80 font-semibold"
                        >
                          <Eye className="w-4 h-4" />
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
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(' ').slice(1).join(' ')}`}>{value}</p>
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
      toast.error('ID, Marca y Modelo son obligatorios');
      return;
    }
    if (!form.clientId && !form.plantId) {
      toast.error('Debe seleccionar Empresa / Cliente o Planta Dueña');
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
      toast.success('Equipo registrado exitosamente');
      onCreated(initConsumablesNow ? newAsset : undefined);
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const activeSpecFields = SPEC_FIELDS_BY_TYPE[form.equipmentType] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="modal-header shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Nuevo Activo / Equipo</h2>
              <p className="text-xs text-muted-foreground">Registre un nuevo activo para mantenimiento</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1">
          <div className="modal-body space-y-6">
            {/* Type & Criticality Selector */}
            <section className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block">
                1. Tipo de Activo y Criticidad
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'AIR_CONDITIONER', label: 'Aire Acondicionado', icon: Wind },
                  { id: 'COLD_ROOM', label: 'Cámara Frigorífica', icon: Snowflake },
                  { id: 'DISPENSER', label: 'Dispenser de Agua', icon: GlassWater },
                  { id: 'REFRIGERATOR', label: 'Heladera Comercial', icon: Layers },
                  { id: 'VENTILATION', label: 'Ventilación / Extrac.', icon: Fan },
                  { id: 'OTHER', label: 'Otro Activo', icon: Cpu },
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = form.equipmentType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, equipmentType: item.id as EquipmentType }))}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                        isSelected 
                          ? 'bg-primary/10 border-primary text-primary font-bold ring-2 ring-primary/20 shadow-sm'
                          : 'bg-card border-border hover:bg-muted/40 text-muted-foreground'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nivel de Criticidad Operativa</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as AssetCriticality[]).map(crit => (
                    <button
                      key={crit}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, criticality: crit }))}
                      className={clsx(
                        'py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center',
                        form.criticality === crit 
                          ? getCriticalityColor(crit) + ' ring-2 ring-primary/30 shadow-sm'
                          : 'border-border text-muted-foreground hover:bg-muted/30'
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
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                2. Identificación y Ubicación
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Código / ID del Activo *</label>
                  <input
                    className="input mt-1 font-mono font-bold uppercase"
                    placeholder={getPlaceholderId()}
                    value={form.id}
                    onChange={e => setForm(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
                <div>
                  <label className="label">N° de Serie de Fábrica</label>
                  <input
                    className="input mt-1"
                    placeholder="S/N en placa..."
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
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Empresa / Cliente *
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
                    <option value="">Seleccionar Empresa...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Planta Dueña (Propiedad) *</label>
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
                      {form.clientId ? 'Seleccionar Planta del Cliente...' : 'Seleccionar Planta...'}
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
                <label className="label">Fecha de Compra / Instalación</label>
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
              <section className="space-y-4 border-t pt-4 bg-muted/20 p-4 rounded-xl border-dashed">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    3. Ficha Técnica ({getEquipmentTypeLabel(form.equipmentType)})
                  </h3>
                  <span className="text-[10px] text-muted-foreground italic">Específico de este tipo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeSpecFields.map(field => {
                    const value = form.technicalSpecs[field.key] || '';
                    if (field.type === 'select') {
                      return (
                        <div key={field.key}>
                          <label className="text-xs font-semibold text-foreground/80 mb-1 block">{field.label}</label>
                          <select
                            className="select text-xs w-full"
                            value={value}
                            onChange={e => handleSpecChange(field.key, e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            {field.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    return (
                      <div key={field.key}>
                        <label className="text-xs font-semibold text-foreground/80 mb-1 block">
                          {field.label} {field.unit && <span className="text-muted-foreground font-normal">({field.unit})</span>}
                        </label>
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          className="input text-xs w-full"
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
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <input
                  type="checkbox"
                  id="initConsumables"
                  className="w-5 h-5 rounded text-primary focus:ring-primary"
                  checked={initConsumablesNow}
                  onChange={e => setInitConsumablesNow(e.target.checked)}
                />
                <label htmlFor="initConsumables" className="text-sm font-bold cursor-pointer select-none">
                  ¿Desea inicializar insumos / consumibles instalados ahora?
                </label>
              </div>
            </section>

            {/* Other Info */}
            <section className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Vida Útil Estimada (meses)</label>
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

          <div className="modal-footer bg-muted/30 border-t mt-4 sticky bottom-0 p-4">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary px-8 gap-2 shadow-lg shadow-primary/20">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Registrar Activo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
