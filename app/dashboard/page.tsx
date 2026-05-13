'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Ticket,
  GlassWater,
  AlertTriangle,
  CheckCircle2,
  PackageX,
  CalendarClock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  HeartPulse
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

interface DashboardStats {
  user: { nombre: string };
  tickets: { open: number; total: number; slaCompliance: number };
  dispensers: { total: number; inService: number; repair: number; blocked: number };
  stock: { lowAlerts: number };
  maintenance: { pending: number; overdue: number };
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Dashboard init failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
    initDashboard();
  }, []);

  if (isLoading || !stats) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded skeleton"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 glass-card skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Hola, {stats.user.nombre.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Aquí tienes el resumen de operaciones de hoy.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <Link href="/tickets" className="metric-card border-t-4 border-t-primary hover:scale-[1.02] transition-transform cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Tickets Abiertos</p>
              <p className="metric-value">{stats.tickets.open}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Ticket className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={clsx(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              stats.tickets.slaCompliance >= 90 ? "bg-emerald-100 text-emerald-700" :
              stats.tickets.slaCompliance >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
            )}>
              {stats.tickets.slaCompliance}% SLA
            </span>
            <span className="text-xs text-muted-foreground">de {stats.tickets.total} totales</span>
          </div>
        </Link>

        <Link href="/dispensers" className="metric-card border-t-4 border-t-emerald-500 hover:scale-[1.02] transition-transform cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Dispensers Activos</p>
              <p className="metric-value">{stats.dispensers.inService}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
             <span className="flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-amber-500"></span>
               {stats.dispensers.repair} en Taller
             </span>
             <span className="flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-red-500"></span>
               {stats.dispensers.blocked} Bloqueados
             </span>
          </div>
        </Link>

        <Link href="/maintenance" className="metric-card border-t-4 border-t-amber-500 hover:scale-[1.02] transition-transform cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Mantenimientos</p>
              <p className="metric-value">{stats.maintenance.pending}</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
              <CalendarClock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            {stats.maintenance.overdue > 0 ? (
              <span className="metric-trend-down">
                <AlertTriangle className="w-3 h-3" />
                {stats.maintenance.overdue} Vencidos
              </span>
            ) : (
              <span className="metric-trend-up">
                Al día
              </span>
            )}
          </div>
        </Link>

        <Link href="/inventory" className="metric-card border-t-4 border-t-red-500 hover:scale-[1.02] transition-transform cursor-pointer group">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Alertas de Stock</p>
              <p className="metric-value">{stats.stock.lowAlerts}</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
              <PackageX className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
             <span className="text-xs text-muted-foreground">Insumos bajo mínimo</span>
          </div>
        </Link>

      </div>

      {/* Advanced Analytics Summary Link */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link 
          href="/dashboard/analytics" 
          className="glass-card p-8 flex flex-col items-center justify-center border-primary/20 hover:border-primary/50 transition-all group"
        >
          <div className="p-4 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
            <BarChart3 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold mt-4">Análisis de Performance & KPIs</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
            Ver métricas detalladas de SLA, MTTR, MTBF y análisis de fallas recurrentes.
          </p>
          <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm">
            Explorar Analytics <ArrowUpRight className="w-4 h-4" />
          </div>
        </Link>

        <Link 
          href="/dashboard/analytics" 
          className="glass-card p-8 flex flex-col items-center justify-center border-emerald-500/20 hover:border-emerald-500/50 transition-all group"
        >
          <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:scale-110 transition-transform">
            <HeartPulse className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold mt-4">Salud del Parque Automática</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-xs">
            Algoritmo inteligente de evaluación: Buenos, Medios y Malos.
          </p>
          <div className="mt-6 flex items-center gap-2 text-emerald-500 font-bold text-sm">
            Ver Ranking Crítico <ArrowUpRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
      
    </div>
  );
}
