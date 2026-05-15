'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, Wrench, Activity, AlertTriangle, 
  Filter, Building2, MapPin, RefreshCw, LayoutDashboard, Download 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DashboardFilterProvider, useDashboardFilters } from '@/components/dashboard/FilterContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

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

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Performance Operativa
          </h1>
          <p className="text-muted-foreground mt-1">
            Análisis detallado de tiempos y evolución de incidentes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <button 
              onClick={exportReport}
              disabled={isExporting}
              className="btn-outline border-primary/20 text-primary hover:bg-primary/10 gap-2"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar PDF
            </button>
          )}
          <Link href="/dashboard" className="btn-outline flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            General
          </Link>
        </div>
      </div>

      {/* Dynamic Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <Building2 className="w-3 h-3" /> Cliente
          </label>
          {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <select 
              className="select h-10"
              value={filters.clientId}
              onChange={(e) => { setFilter('clientId', e.target.value); setFilter('plantId', ''); }}
            >
              <option value="">Todos los Clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          )}
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3 h-3" /> Planta
          </label>
          <select 
            className="select h-10"
            value={filters.plantId}
            onChange={(e) => setFilter('plantId', e.target.value)}
          >
            <option value="">Todas las Plantas</option>
            {plants.filter(p => !filters.clientId || p.clientId === filters.clientId).map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
        {filters.failureName && (
          <div className="bg-amber-500/10 text-amber-600 border border-amber-500/20 px-4 py-2 rounded-lg flex items-center gap-2 h-10">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-bold">Falla: {filters.failureName}</span>
            <button onClick={() => setFilter('failureName', '')} className="ml-2 hover:text-amber-800 font-bold">&times;</button>
          </div>
        )}
        <button onClick={clearFilters} className="btn-ghost text-muted-foreground h-10 text-xs font-bold uppercase">
          Limpiar
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
              <div className="glass-card p-6 border-l-4 border-l-primary group hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-muted-foreground uppercase">SLA (Respuesta)</span>
                  <TrendingUp className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">{data.kpis.sla}</span>
                  <span className="text-sm text-muted-foreground mb-1">horas</span>
                </div>
              </div>
            )}

            <div className="glass-card p-6 border-l-4 border-l-cyan-500 group hover:bg-cyan-500/5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">MTTR (Reparación)</span>
                <Wrench className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{data.kpis.mttr}</span>
                <span className="text-sm text-muted-foreground mb-1">horas</span>
              </div>
            </div>

            <div className="glass-card p-6 border-l-4 border-l-emerald-500 group hover:bg-emerald-500/5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-muted-foreground uppercase">MTBF (Disponibilidad)</span>
                <Activity className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{data.kpis.mtbf}</span>
                <span className="text-sm text-muted-foreground mb-1">días</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Failures List (Interactive) */}
            <div className="glass-card overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Tipos de Fallas
                </h3>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
                {data.failures.length > 0 ? data.failures.map((f: any, i: number) => {
                  const isSelected = filters.failureName === f.name;
                  return (
                    <div 
                      key={i} 
                      onClick={() => setFilter('failureName', isSelected ? '' : f.name)}
                      className={`space-y-1 p-3 rounded-xl cursor-pointer border transition-all ${isSelected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/30 border-transparent hover:border-border'}`}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-foreground">{f.name}</span>
                        <span className="text-muted-foreground text-xs">{f.count} casos</span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500" 
                          style={{ width: `${(f.count / data.failures[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-center py-10 text-muted-foreground italic text-sm">
                    No hay fallas registradas.
                  </p>
                )}
              </div>
            </div>

            {/* Timeline Charts (BI Style) */}
            <div className="lg:col-span-2 glass-card p-4 flex flex-col h-[400px]">
              <h3 className="font-bold mb-6 ml-2">Evolución de Tiempos</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSla" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMttr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                      dx={-10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
                      <Area type="monotone" dataKey="sla" name="SLA (hs)" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSla)" />
                    )}
                    <Area type="monotone" dataKey="mttr" name="MTTR (hs)" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorMttr)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
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
