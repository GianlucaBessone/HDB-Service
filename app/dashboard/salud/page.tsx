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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';

function SaludContent() {
  const { filters, setFilter, clearFilters } = useDashboardFilters();
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  const handleDeleteDispenser = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Está seguro de eliminar permanentemente este dispenser?')) return;
    
    try {
      const res = await fetch(`/api/dispensers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Dispenser eliminado exitosamente');
        fetchAnalytics();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Error al eliminar');
      }
    } catch (error) {
      toast.error('Error de red al eliminar');
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
      case 'ÓPTIMO': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'ESTABLE': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'CRÍTICO': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HeartPulse className="w-8 h-8 text-emerald-500" />
            Salud del Parque
          </h1>
          <p className="text-muted-foreground mt-1">
            Evaluación integral del estado, confiabilidad y ciclo de vida de los equipos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <button 
              onClick={exportReport}
              disabled={isExporting}
              className="btn-outline border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 gap-2"
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
        {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Cliente
            </label>
            <select 
              className="select h-10"
              value={filters.clientId}
              onChange={(e) => { setFilter('clientId', e.target.value); setFilter('plantId', ''); }}
            >
              <option value="">Todos los Clientes</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}
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
        <button onClick={clearFilters} className="btn-ghost text-muted-foreground h-10 text-xs font-bold uppercase">
          Limpiar
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-emerald-500" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="glass-card p-8 flex flex-col justify-center">
              <div className="flex h-12 w-full rounded-2xl overflow-hidden shadow-inner bg-muted">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${(data.distribution.optimo / Math.max(1, data.distribution.optimo + data.distribution.estable + data.distribution.critico)) * 100}%` }}
                />
                <div 
                  className="h-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${(data.distribution.estable / Math.max(1, data.distribution.optimo + data.distribution.estable + data.distribution.critico)) * 100}%` }}
                />
                <div 
                  className="h-full bg-red-500 transition-all duration-500" 
                  style={{ width: `${(data.distribution.critico / Math.max(1, data.distribution.optimo + data.distribution.estable + data.distribution.critico)) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-3 mt-6 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-emerald-500">{data.distribution.optimo}</p>
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest mt-1">Óptimos</p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-3xl font-bold text-amber-500">{data.distribution.estable}</p>
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest mt-1">Estables</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-500">{data.distribution.critico}</p>
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest mt-1">Críticos</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 glass-card p-4 flex flex-col h-[200px]">
              <h3 className="font-bold mb-2 ml-2 text-sm text-muted-foreground uppercase">Evolución Score Global</h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dx={-10} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="score" name="Score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h3 className="font-bold">Ranking de Dispensers (Peor a Mejor)</h3>
              <div className="relative w-full sm:w-auto min-w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar ID, Marca, Modelo, Planta..."
                  className="input pl-9 h-9 text-sm"
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
                    <th className="text-left">ID / Serial</th>
                    <th className="text-left">Modelo / Planta</th>
                    <th className="text-center">Score</th>
                    <th className="text-center">Estado</th>
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
                          <button onClick={() => setExpandedRow(expandedRow === h.id ? null : h.id)} className="p-2 hover:bg-muted rounded-lg">
                            {expandedRow === h.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </td>
                        <td className="text-left">
                          <div className="flex items-center gap-2">
                            <div className="font-bold">{h.id}</div>
                            {h.details.ownerPlantId && h.details.currentPlantId && h.details.ownerPlantId !== h.details.currentPlantId && (
                              <span className={clsx(
                                "text-[8px] px-1.5 py-0.5 rounded-full font-bold border",
                                session?.user?.plantIds?.includes(h.details.currentPlantId) 
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-purple-100 text-purple-700 border-purple-200"
                              )}>
                                {session?.user?.plantIds?.includes(h.details.currentPlantId) ? 'PRESTADO' : 'PRESTADO A OTRO'}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{h.serial || 'S/N'}</div>
                        </td>
                        <td className="text-left">
                          <div className="font-medium text-sm">{h.marca} {h.modelo}</div>
                          <div className="text-xs text-muted-foreground">{h.planta}</div>
                        </td>
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-16 h-2.5 bg-background rounded-full overflow-hidden border border-border/50 shadow-inner">
                              <div 
                                className={`h-full transition-all duration-700 ${h.score > 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : h.score >= 50 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}
                                style={{ width: `${h.score}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-sm min-w-[30px]">{h.score}</span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge border text-xs px-2.5 py-0.5 ${getStatusColor(h.status)}`}>
                            {h.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {role === 'ADMIN' && (
                              <button 
                                onClick={(e) => handleDeleteDispenser(h.id, e)}
                                title="Eliminar Dispenser"
                                className="btn-ghost btn-sm text-red-500 hover:bg-red-500/10 p-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <Link href={`/dispensers/${h.id}`} className="btn-ghost btn-sm text-emerald-600 font-medium">Ver Ficha</Link>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === h.id && (
                        <tr className="bg-muted/10 border-b border-border shadow-inner">
                          <td colSpan={6} className="p-0">
                            <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                                    MTBF
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-help" />
                                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Tiempo promedio entre fallas (Mean Time Between Failures).<br/><br/>
                                    <span className="text-muted-foreground">Un número mayor indica mayor confiabilidad.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-bold">
                                  {h.details.mtbfDays > 30 ? (
                                    <>{h.details.mtbfMonths} <span className="text-xs text-muted-foreground font-normal">meses</span></>
                                  ) : (
                                    <>{h.details.mtbfDays} <span className="text-xs text-muted-foreground font-normal">días</span></>
                                  )}
                                </p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                                    MTTR
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-help" />
                                  <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Tiempo promedio de reparación (Mean Time To Repair).<br/><br/>
                                    <span className="text-muted-foreground">Calculado desde la creación hasta la resolución del ticket.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-bold">{h.details.mttrHours} <span className="text-xs text-muted-foreground font-normal">hs</span></p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                                    Reincidencias
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Fallas reportadas y reparadas en los últimos 6 meses.<br/><br/>
                                    <span className="text-muted-foreground">Se asocia a la estabilidad a corto plazo.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-bold">{h.details.recurrences}</p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                                    Cond. Gral
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-help" />
                                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Promedio de condición (1-100%).<br/><br/>
                                    <span className="text-muted-foreground">Recolectado por técnicos durante rutinas de mantenimiento preventivo.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-bold">{h.details.condition}%</p>
                              </div>

                              <div className="space-y-1">
                                <div className="relative group inline-flex items-center gap-1">
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                                    Vida Útil Cons.
                                  </span>
                                  <Info className="w-3 h-3 text-muted-foreground/70 cursor-help" />
                                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2.5 bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-xs font-normal text-foreground normal-case tracking-normal">
                                    Porcentaje de la vida teórica total consumida.<br/><br/>
                                    <span className="text-muted-foreground">Calculado según meses de uso vs vida teórica del equipo.</span>
                                  </div>
                                </div>
                                <p className="text-lg font-bold">{h.details.progress}%</p>
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
      ) : null}
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
