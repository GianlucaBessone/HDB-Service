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
      case 'BUENO': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'MEDIO': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'MALO': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Análisis de Performance & KPIs
          </h1>
          <p className="text-muted-foreground mt-1">
            Métricas operacionales y salud del parque de dispensers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-outline flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Vista General
          </Link>
          <button onClick={fetchAnalytics} className="btn-ghost p-2 rounded-full">
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Building2 className="w-3 h-3" /> Cliente
          </label>
          <select 
            className="select h-10"
            value={selectedClient}
            onChange={(e) => { setSelectedClient(e.target.value); setSelectedPlant(''); }}
          >
            <option value="">Todos los Clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Planta
          </label>
          <select 
            className="select h-10"
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
          >
            <option value="">Todas las Plantas</option>
            {plants.filter(p => !selectedClient || p.clientId === selectedClient).map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="btn-primary h-10 px-6 gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Calculando algoritmos de salud...</p>
        </div>
      ) : data ? (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 border-l-4 border-l-primary">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">SLA (Respuesta)</span>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{data.kpis.sla}</span>
                <span className="text-sm text-muted-foreground mb-1">horas</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Tiempo promedio desde Ticket hasta Acción.
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-cyan-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">MTTR (Reparación)</span>
                <Wrench className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{data.kpis.mttr}</span>
                <span className="text-sm text-muted-foreground mb-1">horas</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Mean Time To Repair (Resolución completa).
              </p>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">MTBF (Disponibilidad)</span>
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{data.kpis.mtbf}</span>
                <span className="text-sm text-muted-foreground mb-1">días</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Tiempo medio entre fallas reportadas.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Failure Analysis */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Top 5 Fallas Recurrentes
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {data.failures.top.length > 0 ? data.failures.top.map((f, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-muted-foreground">{f.count} reincidencias</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500" 
                        style={{ width: `${(f.count / data.failures.top[0].count) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Promedio reparación: {Math.round(f.avgRepairTime)}h</span>
                      <span className={f.count > 5 ? 'text-red-500 font-bold' : ''}>
                        {f.count > 5 ? 'GRAVE' : 'MODERADA'}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-10 text-muted-foreground italic text-sm">
                    No hay fallas registradas en este periodo.
                  </p>
                )}
              </div>
            </div>

            {/* Health Distribution */}
            <div className="glass-card overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-primary" />
                  Distribución de Salud del Parque
                </h3>
              </div>
              <div className="p-8">
                <div className="flex h-12 w-full rounded-2xl overflow-hidden shadow-inner bg-muted">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${(data.health.distribution.bueno / (data.health.distribution.bueno + data.health.distribution.medio + data.health.distribution.malo || 1)) * 100}%` }}
                    title={`Bueno: ${data.health.distribution.bueno}`}
                  />
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500" 
                    style={{ width: `${(data.health.distribution.medio / (data.health.distribution.bueno + data.health.distribution.medio + data.health.distribution.malo || 1)) * 100}%` }}
                    title={`Medio: ${data.health.distribution.medio}`}
                  />
                  <div 
                    className="h-full bg-red-500 transition-all duration-500" 
                    style={{ width: `${(data.health.distribution.malo / (data.health.distribution.bueno + data.health.distribution.medio + data.health.distribution.malo || 1)) * 100}%` }}
                    title={`Malo: ${data.health.distribution.malo}`}
                  />
                </div>
                <div className="grid grid-cols-3 mt-6 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-500">{data.health.distribution.bueno}</p>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Buenos</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <p className="text-2xl font-bold text-amber-500">{data.health.distribution.medio}</p>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Medios</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-500">{data.health.distribution.malo}</p>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Malos</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Ranking */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Equipos Críticos (Peor Estado de Salud)
              </h3>
              <span className="text-xs text-muted-foreground">Top 10 unidades que requieren atención prioritaria</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Dispenser</th>
                    <th className="text-center">Score Salud</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">KPI Alerta</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {data.health.ranking.map((h, i) => (
                    <tr key={h.id}>
                      <td>
                        <div className="font-bold">{h.id}</div>
                        <div className="text-xs text-muted-foreground">{h.marca} {h.modelo}</div>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${h.score > 80 ? 'bg-emerald-500' : h.score > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${h.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-mono">{h.score}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`badge border ${getStatusColor(h.status)}`}>
                          {h.status}
                        </span>
                      </td>
                      <td className="text-center text-xs italic text-muted-foreground">
                        {h.score < 50 ? 'MTTR Alto / MTBF Bajo' : 'Normal'}
                      </td>
                      <td className="text-right">
                        <Link href={`/dispensers/${h.id}`} className="btn-ghost btn-sm text-primary">Ver Detalle</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 glass-card">
          <p className="text-muted-foreground">No hay datos suficientes para generar analíticas.</p>
        </div>
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
