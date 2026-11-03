'use client';

import React, { useState, useEffect } from 'react';
import {
  HeartPulse, Building2, MapPin, RefreshCw, LayoutDashboard, Download, Info, ChevronDown, ChevronUp, Trash2, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { DashboardFilterProvider, useDashboardFilters } from '@/components/dashboard/FilterContext';
import { useAuthStore } from '@/lib/store/useAuthStore';
import clsx from 'clsx';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { CHART, chartTooltip, chartAxis, areaFill } from '@/lib/chartTheme';
import ReactECharts from 'echarts-for-react';
import { useQuery } from '@tanstack/react-query';

function SaludContent() {
  const { filters, setFilter, clearFilters } = useDashboardFilters();
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { role } = useAuthStore();

  useEffect(() => {
    async function fetchFiltersData() {
      const [cRes, pRes] = await Promise.all([
        fetch('/api/clients'),
        fetch('/api/plants')
      ]);
      if (cRes.ok) setClients(await cRes.json());
      if (pRes.ok) setPlants(await pRes.json());
    }
    fetchFiltersData();
  }, []);
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const { data, isLoading, refetch: fetchAnalytics } = useQuery({
    queryKey: ['dashboard-salud', filters.clientId, filters.plantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.plantId) params.append('plantId', filters.plantId);

      const res = await fetch(`/api/dashboard/salud?${params.toString()}`);
      if (res.ok) {
        return res.json();
      } else {
        toast.error('Error al cargar salud');
        throw new Error('Failed to fetch');
      }
    }
  });

  const handleDeleteDispenser = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setToDelete(id);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/dispensers/${toDelete}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Activo eliminado');
        fetchAnalytics();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Error al eliminar');
      }
    } catch {
      toast.error('Error de red al eliminar');
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  };

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/dashboard/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'salud',
          filters,
          data
        })
      });

      if (!res.ok) throw new Error('Error al generar PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Salud_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('No se pudo generar el reporte');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ÓPTIMO': return 'text-success bg-success/10 border-success/20';
      case 'ESTABLE': return 'text-warning bg-warning/10 border-warning/20';
      case 'CRÍTICO': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted-foreground/10';
    }
  };

  const STATUS_LABEL: Record<string, string> = { 'ÓPTIMO': 'Óptimo', 'ESTABLE': 'Estable', 'CRÍTICO': 'Crítico' };

  const isStaff = role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="Salud del parque"
        description="Estado, confiabilidad y ciclo de vida de los activos."
        actions={
          isStaff && (
            <button onClick={exportReport} disabled={isExporting} className="btn-outline">
              {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exportar PDF
            </button>
          )
        }
      />

      <FilterBar>
        {isStaff && (
          <FieldIcon icon={Building2} className="lg:w-60">
            <select
              className="select pl-9"
              aria-label="Cliente"
              value={filters.clientId}
              onChange={(e) => { setFilter('clientId', e.target.value); setFilter('plantId', ''); }}
            >
              <option value="">Todos los clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </FieldIcon>
        )}
        <FieldIcon icon={MapPin} className="lg:w-60">
          <select className="select pl-9" aria-label="Planta" value={filters.plantId} onChange={(e) => setFilter('plantId', e.target.value)}>
            <option value="">Todas las plantas</option>
            {plants.filter(p => !filters.clientId || p.clientId === filters.clientId).map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </FieldIcon>
        <button onClick={clearFilters} className="btn-ghost lg:ml-auto">Limpiar filtros</button>
      </FilterBar>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="skeleton h-[200px] rounded-lg" />
            <div className="skeleton h-[200px] rounded-lg lg:col-span-2" />
          </div>
          <div className="skeleton h-80 rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Distribución por estado" bodyClassName="flex flex-col justify-center">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-success transition-all duration-500"
                  style={{ width: `${(data.distribution.optimo / Math.max(1, data.distribution.optimo + data.distribution.estable + data.distribution.critico)) * 100}%` }}
                />
                <div
                  className="h-full bg-warning transition-all duration-500"
                  style={{ width: `${(data.distribution.estable / Math.max(1, data.distribution.optimo + data.distribution.estable + data.distribution.critico)) * 100}%` }}
                />
                <div
                  className="h-full bg-destructive transition-all duration-500"
                  style={{ width: `${(data.distribution.critico / Math.max(1, data.distribution.optimo + data.distribution.estable + data.distribution.critico)) * 100}%` }}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-border">
                {[
                  { label: 'Óptimos', value: data.distribution.optimo, dot: 'bg-success' },
                  { label: 'Estables', value: data.distribution.estable, dot: 'bg-warning' },
                  { label: 'Críticos', value: data.distribution.critico, dot: 'bg-destructive' },
                ].map(item => (
                  <div key={item.label} className="px-3 first:pl-0">
                    <p className="text-2xl font-semibold tabular">{item.value}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`status-dot ${item.dot}`} />{item.label}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Evolución del score global"
              description={
                data.snapshotsAvailable === false
                  ? 'Historial no disponible: falta crear la tabla de fotos mensuales en la base.'
                  : 'Promedio de la flota al cierre de cada mes. Los meses cerrados quedan fijos; el mes en curso es provisorio.'
              }
              className="lg:col-span-2"
              bodyClassName="h-[200px]"
            >
              <ReactECharts
                option={{
                  textStyle: { fontFamily: CHART.font },
                  tooltip: {
                    trigger: 'axis',
                    ...chartTooltip,
                    formatter: (params: any) => {
                      const p = Array.isArray(params) ? params[0] : params;
                      const point = data.timeline[p.dataIndex] || {};
                      const origin: Record<string, string> = {
                        CIERRE: 'Foto de cierre (fija)',
                        RECONSTRUIDO: 'Carga inicial reconstruida (fija)',
                        EN_CURSO: 'Mes en curso (provisorio)',
                        SIN_DATOS: 'Sin foto registrada',
                      };
                      if (point.score === null || point.score === undefined) return `${p.name}<br/>${origin[point.source] || 'Sin datos'}`;
                      return `${p.name}<br/>Score: <b>${point.score}</b><br/>Activos: ${point.assets ?? '—'}<br/><span style="opacity:.75">${origin[point.source] || ''}</span>`;
                    },
                  },
                  grid: { top: 8, right: 8, left: 4, bottom: 4, containLabel: true },
                  xAxis: { type: 'category', data: data.timeline.map((d: any) => d.month), ...chartAxis, splitLine: { show: false } },
                  yAxis: { type: 'value', min: 0, max: 100, ...chartAxis },
                  series: [
                    {
                      name: 'Score',
                      data: data.timeline.map((d: any) => ({
                        value: d.score,
                        symbol: d.source === 'EN_CURSO' ? 'emptyCircle' : 'circle',
                        symbolSize: d.source === 'EN_CURSO' ? 7 : 5,
                      })),
                      type: 'line',
                      symbol: 'circle',
                      symbolSize: 5,
                      connectNulls: false,
                      itemStyle: { color: CHART.primary },
                      lineStyle: { width: 2 },
                      areaStyle: { color: areaFill(CHART.primary) },
                      markLine: {
                        silent: true,
                        symbol: 'none',
                        label: { show: false },
                        lineStyle: { type: 'dashed', width: 1, color: CHART.axis },
                        data: [{ yAxis: 80 }, { yAxis: 50 }],
                      },
                    },
                  ],
                }}
                style={{ height: '100%', width: '100%' }}
              />
            </Panel>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Ranking de salud</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Ordenado de peor a mejor.</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="search"
                  aria-label="Buscar en el ranking"
                  placeholder="Buscar ID, marca, modelo o planta…"
                  className="input pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-10"></th>
                    <th className="text-left">ID / serial</th>
                    <th className="hidden text-left md:table-cell">Modelo / planta</th>
                    <th className="text-center">Score</th>
                    <th className="hidden text-center sm:table-cell">Estado</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.ranking.filter((h: any) =>
                    h.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    h.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    h.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    h.planta.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((h: any) => (
                    <React.Fragment key={h.id}>
                      <tr className={`hover:bg-muted/30 transition-colors ${expandedRow === h.id ? 'bg-muted/20' : ''}`}>
                        <td className="w-10 text-center">
                          <button onClick={() => setExpandedRow(expandedRow === h.id ? null : h.id)} className="btn-icon btn-ghost h-8 w-8 sm:h-8 sm:w-8" aria-label="Ver indicadores">
                            {expandedRow === h.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </td>
                        <td className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="font-mono font-medium">{h.id}</div>
                            {h.equipmentType && (
                              <span className="badge-neutral">
                                {h.equipmentType === 'AIR_CONDITIONER' ? 'Aire acond.' :
                                 h.equipmentType === 'COLD_ROOM' ? 'Cámara frig.' :
                                 h.equipmentType === 'DISPENSER' ? 'Dispenser' :
                                 h.equipmentType === 'REFRIGERATOR' ? 'Heladera' :
                                 h.equipmentType === 'VENTILATION' ? 'Ventilación' : 'Equipo'}
                              </span>
                            )}
                            {h.details.ownerPlantId && h.details.currentPlantId && h.details.ownerPlantId !== h.details.currentPlantId && (
                              <span className="badge-info">
                                {session?.user?.plantIds?.includes(h.details.currentPlantId) ? 'Prestado' : 'Prestado a otra planta'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{h.serial || 'S/N'}</div>
                        </td>
                        <td className="hidden text-left md:table-cell">
                          <div className="font-medium text-sm">{h.marca} {h.modelo}</div>
                          <div className="text-xs text-muted-foreground">{h.planta}</div>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-muted sm:block">
                              <div
                                className={`h-full rounded-full ${h.score > 80 ? 'bg-success' : h.score >= 50 ? 'bg-warning' : 'bg-destructive'}`}
                                style={{ width: `${h.score}%` }}
                              />
                            </div>
                            <span className="min-w-[30px] text-sm font-semibold tabular">{h.score}</span>
                          </div>
                        </td>
                        <td className="hidden text-center sm:table-cell">
                          <span className={`badge ${getStatusColor(h.status)}`}>
                            {STATUS_LABEL[h.status] || h.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {role === 'ADMIN' && (
                              <button
                                onClick={(e) => handleDeleteDispenser(h.id, e)}
                                title="Eliminar activo"
                                aria-label="Eliminar activo"
                                className="btn-ghost btn-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <Link href={`/dispensers/${h.id}`} className="btn-ghost btn-sm text-primary">Ver ficha</Link>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === h.id && (
                        <tr className="bg-muted/30">
                          <td colSpan={6} className="p-0">
                            <div className="grid grid-cols-2 gap-4 p-4 sm:p-5 md:grid-cols-5">
                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="eyebrow">
                                    MTBF
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-pointer" />
                                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Tiempo promedio entre fallas (Mean Time Between Failures).<br /><br />
                                    <span className="text-muted-foreground">Un número mayor indica mayor confiabilidad.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-semibold tabular">
                                  {h.details.mtbfDays > 30 ? (
                                    <>{h.details.mtbfMonths} <span className="text-xs text-muted-foreground font-normal">meses</span></>
                                  ) : (
                                    <>{h.details.mtbfDays} <span className="text-xs text-muted-foreground font-normal">días</span></>
                                  )}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="eyebrow">
                                    MTTR
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-pointer" />
                                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Tiempo promedio de reparación (Mean Time To Repair).<br /><br />
                                    <span className="text-muted-foreground">Calculado desde la creación hasta la resolución del ticket.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-semibold tabular">{h.details.mttrHours} <span className="text-xs text-muted-foreground font-normal">hs</span></p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="eyebrow">
                                    Reincidencias
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-pointer" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Fallas reportadas y reparadas en los últimos 6 meses.<br /><br />
                                    <span className="text-muted-foreground">Se asocia a la estabilidad a corto plazo.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-semibold tabular">{h.details.recurrences}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="eyebrow">
                                    Cond. Gral
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-pointer" />
                                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Promedio de condición (1-100%).<br /><br />
                                    <span className="text-muted-foreground">Recolectado por técnicos durante rutinas de mantenimiento preventivo.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-semibold tabular">{h.details.condition}%</p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="eyebrow">
                                    Vida útil cons.
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-pointer" />
                                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-popover border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Porcentaje de la vida teórica total consumida.<br /><br />
                                    <span className="text-muted-foreground">Calculado según meses de uso vs vida teórica del equipo.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-semibold tabular">{h.details.progress}%</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={HeartPulse} title="No se pudieron cargar los datos" description="Intentá nuevamente en unos minutos." />
      )}

      {toDelete && (
        <ConfirmModal
          title="Eliminar activo"
          description={`¿Eliminar el activo ${toDelete}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
          isLoading={isDeleting}
          variant="danger"
        />
      )}
    </div>
  );
}

export default function SaludPage() {
  return (
    <DashboardFilterProvider>
      <SaludContent />
    </DashboardFilterProvider>
  );
}
