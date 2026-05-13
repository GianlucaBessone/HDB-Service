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
  BarChart3
} from 'lucide-react';
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
        
        <div className="metric-card border-t-4 border-t-primary">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Tickets Abiertos</p>
              <p className="metric-value">{stats.tickets.open}</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg">
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
        </div>

        <div className="metric-card border-t-4 border-t-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Dispensers Activos</p>
              <p className="metric-value">{stats.dispensers.inService}</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
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
        </div>

        <div className="metric-card border-t-4 border-t-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Mantenimientos</p>
              <p className="metric-value">{stats.maintenance.pending}</p>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg">
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
        </div>

        <div className="metric-card border-t-4 border-t-red-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="metric-label">Alertas de Stock</p>
              <p className="metric-value">{stats.stock.lowAlerts}</p>
            </div>
            <div className="p-2 bg-red-500/10 rounded-lg">
              <PackageX className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
             <span className="text-xs text-muted-foreground">Insumos bajo mínimo</span>
          </div>
        </div>

      </div>

      {/* Placeholders for Charts/Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-96 flex flex-col items-center justify-center border-dashed border-2">
          <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Evolución de SLA</p>
          <p className="text-xs text-muted-foreground mt-1">Gráfico en construcción</p>
        </div>
        <div className="glass-card p-6 h-96 flex flex-col items-center justify-center border-dashed border-2">
          <GlassWater className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium">Salud de Flota</p>
          <p className="text-xs text-muted-foreground mt-1">Lista de dispensers críticos en construcción</p>
        </div>
      </div>
      
    </div>
  );
}
