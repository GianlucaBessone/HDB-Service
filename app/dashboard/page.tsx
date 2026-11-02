'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import {
  Ticket,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  CalendarClock,
  ArrowUpRight,
  BarChart3,
  HeartPulse,
  Building2,
  Cpu,
  Layers,
  Wind,
  Snowflake,
  Fan,
  Droplets,
  ScanLine,
  FileDown,
  Plus,
  Activity,
  Users,
  ShieldCheck,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Panel from '@/components/ui/Panel';
import { FieldIcon } from '@/components/ui/FilterBar';
import clsx from 'clsx';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';

interface DashboardStats {
  user: { nombre: string; role: string };
  tickets: { open: number; total: number; slaCompliance: number };
  dispensers: { total: number; inService: number; repair: number; blocked: number };
  equipmentBreakdown?: { type: string; count: number }[];
  stock: { lowAlerts: number };
  maintenance: { pending: number; overdue: number };
}

export default function DashboardPage() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedEquipmentType, setSelectedEquipmentType] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'health' | 'performance'>('overview');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.clients || []);
    }
  });

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', selectedClient, selectedEquipmentType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClient) params.set('clientId', selectedClient);
      if (selectedEquipmentType) params.set('equipmentType', selectedEquipmentType);
      const res = await fetch(`/api/dashboard?${params}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    }
  });

  // Fetch quick health summary for Tab 2
  const { data: healthData, isLoading: isLoadingHealth } = useQuery({
    queryKey: ['dashboard-health-summary', selectedClient],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClient) params.set('clientId', selectedClient);
      const res = await fetch(`/api/dashboard/salud?${params}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: activeTab === 'health'
  });

  // Fetch quick performance summary for Tab 3
  const { data: perfData, isLoading: isLoadingPerf } = useQuery({
    queryKey: ['dashboard-performance-summary', selectedClient],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClient) params.set('clientId', selectedClient);
      const res = await fetch(`/api/dashboard/performance?${params}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: activeTab === 'performance'
  });

  const role = stats?.user?.role;

  const dash = (v: any, suffix = '') => (v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`);
  const canPickClient = role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN';

  if (isLoading || !stats) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="skeleton h-8 w-72" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-[112px] rounded-lg" />)}
        </div>
        <div className="skeleton h-48 rounded-lg" />
      </div>
    );
  }

  // Resumen de salud calculado a partir de la respuesta real de /api/dashboard/salud
  const ranking: any[] = Array.isArray(healthData?.ranking) ? healthData.ranking : [];
  const healthSummary = {
    overall: ranking.length ? Math.round(ranking.reduce((acc, r) => acc + (r.score || 0), 0) / ranking.length) : null,
    evaluated: ranking.length,
    atRisk: healthData?.distribution?.critico ?? ranking.filter(r => r.status === 'CRÍTICO').length,
    worst: ranking.slice(0, 5),
  };
  const perfKpis = perfData?.kpis || {};

  const tabs = [
    { key: 'overview' as const, label: 'Resumen', icon: Activity },
    { key: 'health' as const, label: 'Salud del parque', icon: HeartPulse },
    { key: 'performance' as const, label: 'Productividad y SLA', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="Estado de la flota, mantenimiento preventivo y cumplimiento de SLA."
        actions={
          <>
            <Link href="/qr/scan" className="btn-outline" title="Escanear QR de un activo">
              <ScanLine className="h-4 w-4" />
              Escanear QR
            </Link>
            <a
              href={`/api/dashboard/pdf?clientId=${selectedClient}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <FileDown className="h-4 w-4" />
              Informe PDF
            </a>
          </>
        }
      />

      {/* Filtros + pestañas */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="tabs flex-1 lg:border-b-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'tab-active' : 'tab'}
              aria-selected={activeTab === tab.key}
              role="tab"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
          {canPickClient && (
            <FieldIcon icon={Building2} className="lg:w-56">
              <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="select pl-9" aria-label="Empresa">
                <option value="">Todas las empresas</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </FieldIcon>
          )}
          <FieldIcon icon={Layers} className="lg:w-56">
            <select value={selectedEquipmentType} onChange={e => setSelectedEquipmentType(e.target.value)} className="select pl-9" aria-label="Tipo de activo">
              <option value="">Todos los activos</option>
              <option value="AIR_CONDITIONER">Aire acondicionado (HVAC)</option>
              <option value="COLD_ROOM">Cámaras frigoríficas</option>
              <option value="VENTILATION">Ventilación / extracción</option>
              <option value="DISPENSER">Dispensers de agua</option>
              <option value="OTHER">Otros equipos</option>
            </select>
          </FieldIcon>
        </div>
      </div>

      {/* RESUMEN */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              href="/tickets"
              label="Tickets abiertos"
              value={stats.tickets.open}
              icon={Ticket}
              tone="primary"
              hint={
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className={clsx('badge', stats.tickets.slaCompliance >= 90 ? 'badge-success' : stats.tickets.slaCompliance >= 75 ? 'badge-warning' : 'badge-danger')}>
                    {stats.tickets.slaCompliance}% SLA
                  </span>
                  <span className="tabular">de {stats.tickets.total}</span>
                </span>
              }
            />
            <StatCard
              href="/dispensers"
              label="Activos en servicio"
              value={stats.dispensers.inService}
              icon={Cpu}
              tone="success"
              hint={
                <span className="flex flex-wrap gap-x-3 gap-y-1 tabular">
                  <span className="inline-flex items-center gap-1.5"><span className="status-dot bg-warning" />{stats.dispensers.repair} en taller</span>
                  <span className="inline-flex items-center gap-1.5"><span className="status-dot bg-destructive" />{stats.dispensers.blocked} bloqueados</span>
                </span>
              }
            />
            <StatCard
              href="/maintenance"
              label="Mantenimientos pendientes"
              value={stats.maintenance.pending}
              icon={CalendarClock}
              tone={stats.maintenance.overdue > 0 ? 'warning' : 'default'}
              hint={
                stats.maintenance.overdue > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-destructive tabular">
                    <AlertTriangle className="h-3.5 w-3.5" /> {stats.maintenance.overdue} vencidos
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Al día
                  </span>
                )
              }
            />
            <StatCard
              href="/inventory"
              label="Alertas de stock"
              value={stats.stock.lowAlerts}
              icon={PackageX}
              tone={stats.stock.lowAlerts > 0 ? 'danger' : 'default'}
              emphasize={stats.stock.lowAlerts > 0}
              hint="Insumos bajo el mínimo"
            />
          </div>

          {stats.equipmentBreakdown && stats.equipmentBreakdown.length > 0 && (
            <Panel
              title="Distribución de la flota"
              description="Parque instalado por tipo de activo. Seleccioná un tipo para filtrar."
              actions={
                <Link href="/dispensers" className="btn-ghost btn-sm text-primary">
                  Ver activos <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {stats.equipmentBreakdown.map((item) => {
                  const Icon = getEquipmentTypeIcon(item.type);
                  const label = getEquipmentTypeLabel(item.type);
                  const selected = selectedEquipmentType === item.type;
                  return (
                    <button
                      key={item.type}
                      onClick={() => setSelectedEquipmentType(selected ? '' : item.type)}
                      aria-pressed={selected}
                      className={clsx(
                        'flex items-center gap-3 rounded-md border p-3 text-left transition-colors',
                        selected ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-muted/50'
                      )}
                    >
                      <Icon className={clsx('h-5 w-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                      <div className="min-w-0">
                        <span className="block text-lg font-semibold leading-tight tabular">{item.count}</span>
                        <span className="block truncate text-xs text-muted-foreground">{label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              { href: '/dashboard/salud', icon: HeartPulse, title: 'Salud del parque', desc: 'Índice de salud ponderado por MTTR, criticidad y recurrencia de fallas.' },
              { href: '/dashboard/performance', icon: BarChart3, title: 'Performance operativa', desc: 'Tiempos de respuesta y resolución, MTBF y evolución de incidentes.' },
            ].map(card => (
              <Link key={card.href} href={card.href} className="glass-card-hover group flex items-start gap-4 p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground group-hover:text-primary">
                  <card.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    {card.title}
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                  </span>
                  <span className="mt-1 block text-[13px] text-muted-foreground">{card.desc}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SALUD */}
      {activeTab === 'health' && (
        <div className="animate-fade-in">
          {isLoadingHealth ? (
            <div className="skeleton h-64 rounded-lg" />
          ) : healthData ? (
            <Panel
              title="Índice global de confiabilidad"
              description="Ponderado por criticidad (cámaras: MTTR 24 h · HVAC: MTTR 48 h)."
              actions={
                <Link href="/dashboard/salud" className="btn-outline btn-sm">
                  Ver detalle <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Salud promedio de flota" value={dash(healthSummary.overall, '%')} tone="success" />
                <StatCard label="Activos evaluados" value={healthSummary.evaluated} />
                <StatCard label="Activos en estado crítico" value={healthSummary.atRisk} tone="danger" emphasize={healthSummary.atRisk > 0} />
              </div>

              {healthSummary.worst.length > 0 && (
                <div className="mt-6">
                  <h3 className="eyebrow mb-2">Requieren atención</h3>
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {healthSummary.worst.map((eq: any) => (
                      <li key={eq.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                          <span className="font-mono font-medium">{eq.id}</span>
                          <span className="truncate text-muted-foreground">{eq.modelo}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-medium text-warning tabular">{eq.score}%</span>
                          <Link href={`/dispensers/${eq.id}`} className="text-[13px] font-medium text-primary hover:underline">
                            Revisar
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay datos de salud disponibles.</p>
          )}
        </div>
      )}

      {/* PRODUCTIVIDAD */}
      {activeTab === 'performance' && (
        <div className="animate-fade-in">
          {isLoadingPerf ? (
            <div className="skeleton h-48 rounded-lg" />
          ) : perfData ? (
            <Panel
              title="Acuerdos de nivel de servicio"
              description="Indicadores del período según los filtros aplicados."
              actions={
                <Link href="/dashboard/performance" className="btn-outline btn-sm">
                  Ver reporte <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard label="Tiempo de respuesta (SLA)" value={dash(perfKpis.sla, ' h')} tone="primary" />
                <StatCard label="MTTR (tiempo medio de reparación)" value={dash(perfKpis.mttr, ' h')} />
                <StatCard label="MTBF (tiempo medio entre fallas)" value={dash(perfKpis.mtbf, ' d')} />
              </div>
            </Panel>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay datos de rendimiento disponibles.</p>
          )}
        </div>
      )}
    </div>
  );
}
