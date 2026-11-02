'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Wrench, Activity, AlertTriangle,
  Building2, MapPin, RefreshCw, LayoutDashboard, Download, X
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Panel from '@/components/ui/Panel';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';
import { CHART, chartTooltip, chartAxis, areaFill } from '@/lib/chartTheme';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DashboardFilterProvider, useDashboardFilters } from '@/components/dashboard/FilterContext';
import ReactECharts from 'echarts-for-react';

function PerformanceContent() {
  const { filters, setFilter, clearFilters } = useDashboardFilters();
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const role = session?.user?.role;
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  async function fetchFiltersData() {
    const [cRes, pRes] = await Promise.all([
      fetch('/api/clients'),
      fetch('/api/plants')
    ]);
    if (cRes.ok) setClients(await cRes.json());
    if (pRes.ok) setPlants(await pRes.json());
  }

  async function fetchAnalytics() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.clientId) params.append('clientId', filters.clientId);
      if (filters.plantId) params.append('plantId', filters.plantId);
      if (filters.failureName) params.append('failureName', filters.failureName);

      const res = await fetch(`/api/dashboard/performance?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Error al cargar performance');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }

  const exportReport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/dashboard/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance',
          filters,
          data
        })
      });

      if (!res.ok) throw new Error('Error al generar PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Performance_${new Date().getTime()}.pdf`;
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

  const isStaff = role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="Performance operativa"
        description="Tiempos de respuesta y reparación, y evolución de incidentes."
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
        {filters.failureName && (
          <span className="badge-warning h-9 gap-2 px-2.5 text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            Falla: {filters.failureName}
            <button onClick={() => setFilter('failureName', '')} aria-label="Quitar filtro de falla"><X className="h-3.5 w-3.5" /></button>
          </span>
        )}
        <button onClick={clearFilters} className="btn-ghost lg:ml-auto">Limpiar filtros</button>
      </FilterBar>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="skeleton h-[104px] rounded-lg" />)}
          </div>
          <div className="skeleton h-[400px] rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${isStaff ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {isStaff && (
              <StatCard label="SLA · tiempo de respuesta" value={<>{data.kpis.sla}<span className="ml-1 text-sm font-normal text-muted-foreground">h</span></>} icon={TrendingUp} tone="primary" />
            )}
            <StatCard label="MTTR · tiempo de reparación" value={<>{data.kpis.mttr}<span className="ml-1 text-sm font-normal text-muted-foreground">h</span></>} icon={Wrench} tone="primary" />
            <StatCard label="MTBF · entre fallas" value={<>{data.kpis.mtbf}<span className="ml-1 text-sm font-normal text-muted-foreground">días</span></>} icon={Activity} tone="success" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Panel title="Tipos de falla" description="Seleccioná una falla para filtrar." flush className="flex flex-col lg:h-[420px]" bodyClassName="flex-1 overflow-y-auto custom-scrollbar">
              {data.failures.length > 0 ? (
                <ul className="divide-y divide-border">
                  {data.failures.map((f: any, i: number) => {
                    const isSelected = filters.failureName === f.name;
                    return (
                      <li key={i}>
                        <button
                          onClick={() => setFilter('failureName', isSelected ? '' : f.name)}
                          aria-pressed={isSelected}
                          className={`w-full space-y-1.5 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-warning/10' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="font-medium text-foreground">{f.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground tabular">{f.count} casos</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-warning" style={{ width: `${(f.count / data.failures[0].count) * 100}%` }} />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState bare icon={AlertTriangle} title="Sin fallas registradas" />
              )}
            </Panel>

            <Panel title="Evolución de tiempos" className="lg:col-span-2" bodyClassName="h-[320px] sm:h-[360px]">
              <ReactECharts
                option={{
                  textStyle: { fontFamily: CHART.font },
                  tooltip: { trigger: 'axis', ...chartTooltip },
                  legend: {
                    data: isStaff ? ['SLA (h)', 'MTTR (h)'] : ['MTTR (h)'],
                    bottom: 0,
                    textStyle: { color: CHART.axis, fontSize: 12 },
                    icon: 'roundRect',
                    itemWidth: 10,
                    itemHeight: 10,
                  },
                  grid: { top: 10, right: 12, left: 8, bottom: 36, containLabel: true },
                  xAxis: { type: 'category', data: data.timeline.map((d: any) => d.month), ...chartAxis, splitLine: { show: false } },
                  yAxis: { type: 'value', ...chartAxis },
                  series: [
                    ...(isStaff ? [{
                      name: 'SLA (h)',
                      data: data.timeline.map((d: any) => d.sla),
                      type: 'line',
                      symbol: 'circle',
                      symbolSize: 5,
                      itemStyle: { color: CHART.secondary },
                      lineStyle: { width: 2 },
                    }] : []),
                    {
                      name: 'MTTR (h)',
                      data: data.timeline.map((d: any) => d.mttr),
                      type: 'line',
                      symbol: 'circle',
                      symbolSize: 5,
                      itemStyle: { color: CHART.primary },
                      lineStyle: { width: 2 },
                      areaStyle: { color: areaFill(CHART.primary) },
                    },
                  ],
                }}
                style={{ height: '100%', width: '100%' }}
              />
            </Panel>
          </div>
        </>
      ) : (
        <EmptyState icon={Activity} title="No se pudieron cargar los datos" description="Intentá nuevamente en unos minutos." />
      )}
    </div>
  );
}

export default function PerformancePage() {
  return (
    <DashboardFilterProvider>
      <PerformanceContent />
    </DashboardFilterProvider>
  );
}
