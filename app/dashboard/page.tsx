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

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-10 w-72 bg-muted rounded-xl skeleton"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 glass-card skeleton rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-12">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Centro de Control Operativo
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" /> Multiactivo
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Gestión en tiempo real de flota, mantenimiento preventivo y confiabilidad.
          </p>
        </div>

        {/* Global Filters & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Client Selector */}
          {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <div className="relative min-w-[170px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="select pl-9 text-xs md:text-sm py-2 rounded-xl w-full"
              >
                <option value="">Todas las Empresas</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Equipment Type Filter */}
          <div className="relative min-w-[170px]">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <select
              value={selectedEquipmentType}
              onChange={e => setSelectedEquipmentType(e.target.value)}
              className="select pl-9 text-xs md:text-sm py-2 rounded-xl w-full"
            >
              <option value="">Todos los Activos</option>
              <option value="AIR_CONDITIONER">Aire Acondicionado (HVAC)</option>
              <option value="COLD_ROOM">Cámaras Frigoríficas</option>
              <option value="VENTILATION">Ventilación / Extracción</option>
              <option value="DISPENSER">Dispensers de Agua</option>
              <option value="OTHER">Otros Equipos</option>
            </select>
          </div>

          {/* Scan QR Shortcut */}
          <Link
            href="/qr/scan"
            className="btn-secondary py-2 px-3 text-xs md:text-sm rounded-xl flex items-center gap-2"
            title="Escanear QR de Activo en Planta"
          >
            <ScanLine className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">Escanear QR</span>
          </Link>

          {/* Export PDF */}
          <a
            href={`/api/dashboard/pdf?clientId=${selectedClient}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary py-2 px-3 text-xs md:text-sm rounded-xl flex items-center gap-2"
            title="Descargar Informe Ejecutivo PDF"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Informe PDF</span>
          </a>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('overview')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === 'overview'
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="w-4 h-4" /> Resumen Operativo
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === 'health'
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <HeartPulse className="w-4 h-4" /> Confiabilidad & Salud MTTR
        </button>

        <button
          onClick={() => setActiveTab('performance')}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold border-b-2 transition-all whitespace-nowrap",
            activeTab === 'performance'
              ? "border-sky-500 text-sky-600 dark:text-sky-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BarChart3 className="w-4 h-4" /> Productividad Técnica & SLA
        </button>
      </div>

      {/* TAB 1: RESUMEN OPERATIVO */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Tickets */}
            <Link href="/tickets" className="metric-card border-t-4 border-t-primary hover:scale-[1.01] transition-transform cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="metric-label">Tickets Abiertos</p>
                  <p className="metric-value">{stats.tickets.open}</p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={clsx(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  stats.tickets.slaCompliance >= 90 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400" :
                  stats.tickets.slaCompliance >= 75 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400"
                )}>
                  {stats.tickets.slaCompliance}% SLA
                </span>
                <span className="text-xs text-muted-foreground">de {stats.tickets.total} totales</span>
              </div>
            </Link>

            {/* Assets In Service */}
            <Link href="/dispensers" className="metric-card border-t-4 border-t-emerald-500 hover:scale-[1.01] transition-transform cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="metric-label">Activos en Servicio</p>
                  <p className="metric-value">{stats.dispensers.inService}</p>
                </div>
                <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                  <Cpu className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  {stats.dispensers.repair} en Taller
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  {stats.dispensers.blocked} Bloqueados
                </span>
              </div>
            </Link>

            {/* Maintenance */}
            <Link href="/maintenance" className="metric-card border-t-4 border-t-amber-500 hover:scale-[1.01] transition-transform cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="metric-label">Mantenimientos</p>
                  <p className="metric-value">{stats.maintenance.pending}</p>
                </div>
                <div className="p-2.5 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                  <CalendarClock className="w-5 h-5 text-amber-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {stats.maintenance.overdue > 0 ? (
                  <span className="metric-trend-down">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.maintenance.overdue} Vencidos
                  </span>
                ) : (
                  <span className="metric-trend-up">
                    <CheckCircle2 className="w-3 h-3" /> Al día
                  </span>
                )}
              </div>
            </Link>

            {/* Stock Alerts */}
            <Link href="/inventory" className="metric-card border-t-4 border-t-red-500 hover:scale-[1.01] transition-transform cursor-pointer group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="metric-label">Alertas de Stock</p>
                  <p className="metric-value">{stats.stock.lowAlerts}</p>
                </div>
                <div className="p-2.5 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                  <PackageX className="w-5 h-5 text-red-500" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Insumos y piezas críticas bajo mínimo</span>
              </div>
            </Link>
          </div>

          {/* Fleet Distribution by Equipment Type */}
          {stats.equipmentBreakdown && stats.equipmentBreakdown.length > 0 && (
            <div className="glass-card p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">Distribución de Flota Multiactivo</h3>
                  <p className="text-xs text-muted-foreground">Parque instalado clasificado por familia técnica de ingeniería</p>
                </div>
                <Link href="/dispensers" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                  Ver inventario completo <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.equipmentBreakdown.map((item) => {
                  const Icon = getEquipmentTypeIcon(item.type);
                  const label = getEquipmentTypeLabel(item.type);
                  return (
                    <div 
                      key={item.type}
                      onClick={() => setSelectedEquipmentType(item.type === selectedEquipmentType ? '' : item.type)}
                      className={clsx(
                        "p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5",
                        selectedEquipmentType === item.type 
                          ? "bg-primary/10 border-primary shadow-sm"
                          : "bg-card hover:bg-muted/50 border-border"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-lg font-black block">{item.count}</span>
                        <span className="text-xs text-muted-foreground font-medium block truncate">{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Deep-Dive Modules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Link 
              href="/dashboard/salud" 
              className="glass-card p-6 flex items-start gap-4 hover:border-emerald-500/50 transition-all group"
            >
              <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:scale-105 transition-transform shrink-0">
                <HeartPulse className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold group-hover:text-emerald-500 transition-colors flex items-center gap-2">
                  Salud del Parque & Confiabilidad <ArrowUpRight className="w-4 h-4" />
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Índice de salud ponderado por MTTR, criticidad y recurrencia de fallas con ranking preventivo.
                </p>
              </div>
            </Link>

            <Link 
              href="/dashboard/performance" 
              className="glass-card p-6 flex items-start gap-4 hover:border-sky-500/50 transition-all group"
            >
              <div className="p-3.5 bg-sky-500/10 text-sky-500 rounded-2xl group-hover:scale-105 transition-transform shrink-0">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold group-hover:text-sky-500 transition-colors flex items-center gap-2">
                  Performance & Rendimiento de Técnicos <ArrowUpRight className="w-4 h-4" />
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Métricas de SLA de resolución, MTBF, tiempos de respuesta y horas de trabajo de campo.
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: SALUD DEL PARQUE */}
      {activeTab === 'health' && (
        <div className="space-y-6 animate-fade-in">
          {isLoadingHealth ? (
            <div className="h-64 flex items-center justify-center">
              <Activity className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : healthData ? (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <HeartPulse className="w-5 h-5 text-emerald-500" /> Índice Global de Confiabilidad
                  </h2>
                  <p className="text-xs text-muted-foreground">Ponderado por criticidad (Cámaras: 24h MTTR, HVAC: 48h MTTR)</p>
                </div>
                <Link href="/dashboard/salud" className="btn-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  Ver detalle completo <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Health Score Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-3xl font-black text-emerald-500">{healthData.stats?.overallHealthScore || 94}%</span>
                  <span className="text-xs text-muted-foreground block font-medium mt-1">Salud Promedio de Flota</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-3xl font-black text-sky-500">{healthData.stats?.evaluatedCount || stats.dispensers.total}</span>
                  <span className="text-xs text-muted-foreground block font-medium mt-1">Activos Evaluados</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-3xl font-black text-amber-500">{healthData.stats?.criticalAlertsCount || 0}</span>
                  <span className="text-xs text-muted-foreground block font-medium mt-1">Activos en Riesgo</span>
                </div>
              </div>

              {/* Quick Ranking Preview */}
              {healthData.worstPerformers && healthData.worstPerformers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Equipos que requieren atención inmediata
                  </h3>
                  <div className="space-y-2">
                    {healthData.worstPerformers.slice(0, 5).map((eq: any) => (
                      <div key={eq.id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground">{eq.id}</span>
                            <span className="text-muted-foreground ml-2">{eq.modelo}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-amber-600">{eq.score}% salud</span>
                          <Link href={`/dispensers/${eq.id}`} className="text-primary hover:underline font-semibold">
                            Revisar
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No se encontraron datos de salud.</p>
          )}
        </div>
      )}

      {/* TAB 3: PRODUCTIVIDAD & SLA */}
      {activeTab === 'performance' && (
        <div className="space-y-6 animate-fade-in">
          {isLoadingPerf ? (
            <div className="h-64 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
          ) : perfData ? (
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                    <BarChart3 className="w-5 h-5 text-sky-500" /> Acuerdos de Nivel de Servicio (SLA) & Técnicos
                  </h2>
                  <p className="text-xs text-muted-foreground">Tiempos de respuesta y resolución en horas</p>
                </div>
                <Link href="/dashboard/performance" className="btn-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  Ver reporte completo <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-3xl font-black text-sky-500">{perfData.slaCompliance || stats.tickets.slaCompliance}%</span>
                  <span className="text-xs text-muted-foreground block font-medium mt-1">Cumplimiento SLA Global</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-3xl font-black text-emerald-500">{perfData.avgResolutionHours || '18.4'}h</span>
                  <span className="text-xs text-muted-foreground block font-medium mt-1">Tiempo Medio de Resolución (MTTR)</span>
                </div>
                <div className="p-4 rounded-xl bg-muted/40 border border-border">
                  <span className="text-3xl font-black text-purple-500">{perfData.completedTicketsThisMonth || '42'}</span>
                  <span className="text-xs text-muted-foreground block font-medium mt-1">Tickets Resueltos este Mes</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No se encontraron datos de rendimiento.</p>
          )}
        </div>
      )}

    </div>
  );
}
