'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wrench, 
  Activity, 
  AlertTriangle, 
  Filter, 
  Search,
  Building2,
  MapPin,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  HeartPulse,
  LayoutDashboard
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Panel from '@/components/ui/Panel';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface AnalyticsData {
  kpis: {
    sla: number;
    mttr: number;
    mtbf: number;
  };
  failures: {
    top: { name: string; count: number; avgRepairTime: number; severity: string }[];
    totalReported: number;
  };
  health: {
    ranking: { id: string; marca: string; modelo: string; score: number; status: string }[];
    distribution: { bueno: number; medio: number; malo: number };
  };
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');

  useEffect(() => {
    fetchFilters();
    fetchAnalytics();
  }, []);

  async function fetchFilters() {
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
      if (selectedClient) params.append('clientId', selectedClient);
      if (selectedPlant) params.append('plantId', selectedPlant);

      const res = await fetch(`/api/dashboard/analytics?${params.toString()}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        toast.error('Error al cargar analíticas');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BUENO': return 'text-success bg-success/10 border-success/20';
      case 'MEDIO': return 'text-warning bg-warning/10 border-warning/20';
      case 'MALO': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted-foreground/10';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="Análisis de performance"
        description="Métricas operativas y salud del parque de activos."
        actions={
          <button onClick={fetchAnalytics} className="btn-outline" aria-label="Actualizar">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      <FilterBar>
        <FieldIcon icon={Building2} className="lg:w-60">
          <select
            className="select pl-9"
            aria-label="Cliente"
            value={selectedClient}
            onChange={(e) => { setSelectedClient(e.target.value); setSelectedPlant(''); }}
          >
            <option value="">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </FieldIcon>
        <FieldIcon icon={MapPin} className="lg:w-60">
          <select className="select pl-9" aria-label="Planta" value={selectedPlant} onChange={(e) => setSelectedPlant(e.target.value)}>
            <option value="">Todas las plantas</option>
            {plants.filter(p => !selectedClient || p.clientId === selectedClient).map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </FieldIcon>
        <button onClick={fetchAnalytics} className="btn-primary lg:ml-auto">
          <Filter className="h-4 w-4" />
          Aplicar filtros
        </button>
      </FilterBar>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map(i => <div key={i} className="skeleton h-[120px] rounded-lg" />)}
          </div>
          <div className="skeleton h-72 rounded-lg" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard label="SLA · respuesta" icon={TrendingUp} tone="primary"
              value={<>{data.kpis.sla}<span className="ml-1 text-sm font-normal text-muted-foreground">h</span></>}
              hint="Promedio desde el ticket hasta la primera acción." />
            <StatCard label="MTTR · reparación" icon={Wrench} tone="primary"
              value={<>{data.kpis.mttr}<span className="ml-1 text-sm font-normal text-muted-foreground">h</span></>}
              hint="Tiempo medio hasta la resolución completa." />
            <StatCard label="MTBF · entre fallas" icon={Activity} tone="success"
              value={<>{data.kpis.mtbf}<span className="ml-1 text-sm font-normal text-muted-foreground">días</span></>}
              hint="Tiempo medio entre fallas reportadas." />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failure Analysis */}
            <div className="glass-card overflow-hidden">
              <div className="panel-header">
                <h3 className="panel-title">Fallas más recurrentes</h3>
              </div>
              <div className="panel-body space-y-4">
                {data.failures.top.length > 0 ? data.failures.top.map((f, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground tabular">{f.count} reincidencias</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-warning" 
                        style={{ width: `${(f.count / data.failures.top[0].count) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-2xs text-muted-foreground">
                      <span>Promedio reparación: {Math.round(f.avgRepairTime)}h</span>
                      <span className={f.count > 5 ? 'font-semibold text-destructive' : ''}>
                        {f.count > 5 ? 'Grave' : 'Moderada'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <EmptyState bare icon={AlertTriangle} title="Sin fallas en el período" />
                )}
              </div>
            </div>

            {/* Health Distribution */}
            <div className="glass-card overflow-hidden">
              <div className="panel-header">
                <h3 className="panel-title">Distribución de salud del parque</h3>
              </div>
              <div className="panel-body">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div 
                    className="h-full bg-success transition-all duration-500" 
                    style={{ width: `${(data.health.distribution.bueno / (data.health.distribution.bueno + data.health.distribution.medio + data.health.distribution.malo || 1)) * 100}%` }}
                    title={`Bueno: ${data.health.distribution.bueno}`}
                  />
                  <div 
                    className="h-full bg-warning transition-all duration-500" 
                    style={{ width: `${(data.health.distribution.medio / (data.health.distribution.bueno + data.health.distribution.medio + data.health.distribution.malo || 1)) * 100}%` }}
                    title={`Medio: ${data.health.distribution.medio}`}
                  />
                  <div 
                    className="h-full bg-destructive transition-all duration-500" 
                    style={{ width: `${(data.health.distribution.malo / (data.health.distribution.bueno + data.health.distribution.medio + data.health.distribution.malo || 1)) * 100}%` }}
                    title={`Malo: ${data.health.distribution.malo}`}
                  />
                </div>
                <div className="mt-5 grid grid-cols-3 divide-x divide-border">
                  {[
                    { label: 'Buenos', value: data.health.distribution.bueno, dot: 'bg-success' },
                    { label: 'Medios', value: data.health.distribution.medio, dot: 'bg-warning' },
                    { label: 'Malos', value: data.health.distribution.malo, dot: 'bg-destructive' },
                  ].map(item => (
                    <div key={item.label} className="px-3 first:pl-0">
                      <p className="text-2xl font-semibold tabular">{item.value}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`status-dot ${item.dot}`} />{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Critical Ranking */}
          <div className="glass-card overflow-hidden">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Activos críticos</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Las 10 unidades con peor score de salud.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th className="text-center">Score</th>
                    <th className="hidden text-center sm:table-cell">Estado</th>
                    <th className="hidden text-center md:table-cell">Alerta</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.health.ranking.map((h, i) => (
                    <tr key={h.id}>
                      <td>
                        <div className="font-mono font-medium">{h.id}</div>
                        <div className="text-xs text-muted-foreground">{h.marca} {h.modelo}</div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${h.score > 80 ? 'bg-success' : h.score > 50 ? 'bg-warning' : 'bg-destructive'}`}
                              style={{ width: `${h.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium tabular">{h.score}</span>
                        </div>
                      </td>
                      <td className="hidden text-center sm:table-cell">
                        <span className={`badge ${getStatusColor(h.status)}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="hidden text-center text-xs text-muted-foreground md:table-cell">
                        {h.score < 50 ? 'MTTR alto / MTBF bajo' : 'Normal'}
                      </td>
                      <td className="text-right">
                        <Link href={`/dispensers/${h.id}`} className="btn-ghost btn-sm text-primary">Ver ficha</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={HeartPulse} title="Sin datos suficientes" description="No hay información para calcular analíticas con los filtros aplicados." />
      )}
    </div>
  );
}

function Loader2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
