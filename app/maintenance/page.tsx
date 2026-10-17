'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Wrench, Calendar, Settings2, Clock, 
  CheckCircle2, AlertTriangle, Loader2, ChevronRight, MapPin, ShieldCheck, QrCode, X, Building2,
  LayoutList, CalendarDays, FileSignature, FileText
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import ChecklistModal from '@/components/ChecklistModal';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';
import { EquipmentType } from '@prisma/client';

export default function MaintenancePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [month, setMonth] = useState(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState('');
  const [clientId, setClientId] = useState('');
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState('');

  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedForApproval, setSelectedForApproval] = useState<string[]>([]);
  const [approvalModalId, setApprovalModalId] = useState<string | null>(null);
  const [isGeneratingApproval, setIsGeneratingApproval] = useState(false);

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.clients || []);
    }
  });

  const { data: schedules = [], isLoading, refetch: fetchSchedules } = useQuery<any[]>({
    queryKey: ['maintenance-schedules', month, statusFilter, equipmentTypeFilter, clientId],
    queryFn: async () => {
      const params = new URLSearchParams({ month });
      if (statusFilter) params.set('status', statusFilter);
      if (equipmentTypeFilter) params.set('equipmentType', equipmentTypeFilter);
      if (clientId) params.set('clientId', clientId);
      
      const res = await fetch(`/api/maintenance?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const role = session?.user?.role;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/maintenance/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        throw new Error('El servidor devolvió una respuesta no válida. Revisa la consola.');
      }

      if (!res.ok) throw new Error(data.error || data.message || 'Error del servidor');
      toast.success(data.message || 'Operación exitosa');
      fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || 'Error al generar cronograma');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateApproval = async () => {
    if (selectedForApproval.length === 0) return;
    setIsGeneratingApproval(true);
    try {
      const res = await fetch('/api/maintenance/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleIds: selectedForApproval })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al generar aprobación');
      }
      const { id } = await res.json();
      setApprovalModalId(id);
      setSelectedForApproval([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGeneratingApproval(false);
    }
  };

  const toggleApprovalSelection = (id: string) => {
    setSelectedForApproval(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const daysInMonth = useMemo(() => {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr || '2026', 10);
    const m = parseInt(monthStr || '10', 10);
    const totalDays = new Date(year, m, 0).getDate();
    const rawFirst = new Date(year, m - 1, 1).getDay();
    const firstDayIndex = (rawFirst + 6) % 7; // Monday = 0
    return { year, month: m, totalDays, firstDayIndex };
  }, [month]);

  const schedulesByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    schedules.forEach((s: any, idx: number) => {
      let day = 1;
      if (s.scheduledDate) {
        day = new Date(s.scheduledDate).getDate();
      } else {
        day = (idx % daysInMonth.totalDays) + 1;
      }
      if (!map[day]) map[day] = [];
      map[day].push(s);
    });
    return map;
  }, [schedules, daysInMonth]);

  const kpis = {
    total: schedules.length,
    pending: schedules.filter(s => s.status === 'PENDING').length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length,
    signed: schedules.filter(s => s.status === 'SIGNED').length,
    overdue: schedules.filter(s => s.status === 'OVERDUE').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Subnavigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center gap-1.5 border border-primary/20">
            <Wrench className="w-3.5 h-3.5" /> Planificación Operativa
          </span>
          <Link href="/maintenance/approvals" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-muted transition-colors">
            <FileSignature className="w-3.5 h-3.5 text-blue-500" /> Aprobaciones & Firmas
          </Link>
          <Link href="/maintenance/reports" className="text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-muted transition-colors">
            <FileText className="w-3.5 h-3.5 text-emerald-500" /> Reportes & Cierres
          </Link>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
              viewMode === 'list' ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutList className="w-3.5 h-3.5" /> Lista
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={clsx(
              "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
              viewMode === 'calendar' ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendario
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Wrench className="w-6 h-6 text-primary" />
            </div>
            Rutas de Mantenimiento Preventivo
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">Planificación y checklists preventivos multiactivo</p>
        </div>
        {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
          <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary py-2 px-4 gap-2 shrink-0 rounded-xl text-sm">
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4" />}
            Generar Tareas del Mes
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard label="Total del Mes" value={kpis.total} color="primary" />
        <KpiCard label="Completados" value={kpis.completed} color="emerald" />
        <KpiCard label="Firmados" value={kpis.signed} color="blue" />
        <KpiCard label="Pendientes" value={kpis.pending} color="amber" />
        <KpiCard label="Vencidos" value={kpis.overdue} color="red" />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="select pl-10 min-w-[180px]"
          >
            <option value="">Todas las Empresas</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="select min-w-[150px]"
        >
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="COMPLETED">Completado</option>
          <option value="OVERDUE">Atrasado</option>
          <option value="EXPIRED">Vencido</option>
          <option value="SIGNED">Firmado</option>
        </select>
        <select
          value={equipmentTypeFilter}
          onChange={e => setEquipmentTypeFilter(e.target.value)}
          className="select min-w-[180px]"
        >
          <option value="">Todos los activos</option>
          <option value="AIR_CONDITIONER">Aires Acondicionados</option>
          <option value="COLD_ROOM">Cámaras Frigoríficas</option>
          <option value="DISPENSER">Dispensers de Agua</option>
          <option value="REFRIGERATOR">Heladeras Comerciales</option>
          <option value="VENTILATION">Ventilación / Extracción</option>
          <option value="OTHER">Otros Equipos</option>
        </select>
      </div>

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <div className="glass-card p-4 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-base text-foreground capitalize">
                Calendario Operativo — {new Date(daysInMonth.year, daysInMonth.month - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-muted-foreground">Planificación mensual de tareas preventivas e intervenciones técnicas</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Completado</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Firmado</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pendiente</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> Vencido</span>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-2 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider py-1 border-b border-border/50">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
            <div>Dom</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 md:gap-2">
            {/* Empty offset padding */}
            {Array.from({ length: daysInMonth.firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] rounded-xl bg-muted/15 border border-border/20 opacity-40 hidden sm:block" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth.totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const daySchedules = schedulesByDay[dayNum] || [];
              const isToday = new Date().getDate() === dayNum && (new Date().getMonth() + 1) === daysInMonth.month && new Date().getFullYear() === daysInMonth.year;

              return (
                <div 
                  key={`day-${dayNum}`}
                  className={clsx(
                    "min-h-[90px] p-1.5 md:p-2 rounded-xl border flex flex-col justify-between transition-colors",
                    isToday ? "border-primary bg-primary/5" : "border-border bg-card/60 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx(
                      "text-[11px] md:text-xs font-extrabold w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center",
                      isToday ? "bg-primary text-white" : "text-muted-foreground"
                    )}>
                      {dayNum}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full">
                        {daySchedules.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {daySchedules.map((s: any) => {
                      const eqType = s.dispenser?.equipmentType || 'DISPENSER';
                      const Icon = getEquipmentTypeIcon(eqType);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSchedule(s)}
                          className={clsx(
                            "p-1 rounded text-[9px] md:text-[10px] font-semibold border flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform",
                            s.status === 'COMPLETED' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                            s.status === 'SIGNED' ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" :
                            s.status === 'OVERDUE' ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400" :
                            "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                          )}
                          title={`${s.dispenserId} - ${t(s.status)}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <Icon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{s.dispenserId}</span>
                          </div>
                          <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", 
                            s.status === 'COMPLETED' ? "bg-emerald-500" :
                            s.status === 'SIGNED' ? "bg-blue-500" :
                            s.status === 'OVERDUE' ? "bg-red-500" : "bg-amber-500"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-lg" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <Wrench className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">No hay mantenimientos planificados</p>
          <p className="text-sm mt-1">Generá las tareas del mes para empezar a trabajar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {schedules.map(schedule => {
            const isCompleted = schedule.status === 'COMPLETED';
            const isSelected = selectedForApproval.includes(schedule.id);
            const clientName = schedule.dispenser?.client?.nombre || 
                               schedule.dispenser?.plant?.client?.nombre || 
                               schedule.dispenser?.location?.plant?.client?.nombre;

            return (
              <div key={schedule.id} className={clsx('glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors', isSelected && 'border-primary shadow-sm')}>
                <div className="flex items-start sm:items-center gap-4">
                  {isCompleted && (
                    <input 
                      type="checkbox" 
                      className="mt-1.5 sm:mt-0 w-5 h-5 accent-primary cursor-pointer"
                      checked={isSelected}
                      onChange={() => toggleApprovalSelection(schedule.id)}
                    />
                  )}
                  {(() => {
                    const eqType = schedule.dispenser?.equipmentType || 'DISPENSER';
                    const Icon = getEquipmentTypeIcon(eqType);
                    return (
                      <div className={clsx(
                        'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', 
                        isCompleted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-lg">{schedule.dispenserId}</span>
                      <span className={clsx('badge text-[10px] px-2 py-0.5', getStatusColor(schedule.status))}>
                        {t(schedule.status)}
                      </span>
                      {clientName && (
                        <span className="badge bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 flex items-center gap-1 font-semibold">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {clientName}
                        </span>
                      )}
                      <span className="badge badge-outline text-[10px] px-1.5 py-0">
                        {getEquipmentTypeLabel(schedule.dispenser?.equipmentType || 'DISPENSER')}
                      </span>
                      {schedule.dispenser?.criticality === 'CRITICAL' && (
                        <span className="badge bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px] px-1.5 py-0 font-bold">
                          CRÍTICO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{schedule.dispenser?.location?.plant?.nombre}</span>
                      {schedule.dispenser?.location?.sector?.nombre && (
                        <span>— {schedule.dispenser.location.sector.nombre}</span>
                      )}
                      <span>({schedule.dispenser?.location?.nombre || 'Sin ubicación'})</span>
                    </p>
                    {schedule.dispenser?.marca && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {schedule.dispenser.marca} {schedule.dispenser.modelo || ''}
                      </p>
                    )}
                    {schedule.checklist?.measurements && Object.keys(schedule.checklist.measurements).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {schedule.checklist.measurements.presionBajaPsi && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono">
                            Succión: <strong>{schedule.checklist.measurements.presionBajaPsi} PSI</strong>
                          </span>
                        )}
                        {schedule.checklist.measurements.saltoTermicoC && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono">
                            Salto Térmico: <strong>{schedule.checklist.measurements.saltoTermicoC} °C</strong>
                          </span>
                        )}
                        {schedule.checklist.measurements.tempCamaraC && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono">
                            Cámara: <strong>{schedule.checklist.measurements.tempCamaraC} °C</strong>
                          </span>
                        )}
                        {schedule.checklist.measurements.corrienteCompresorA && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-foreground font-mono">
                            I: <strong>{schedule.checklist.measurements.corrienteCompresorA} A</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSchedule(schedule)}
                      className={clsx('btn-sm gap-1.5 w-full sm:w-auto', (isCompleted || schedule.status === 'SIGNED' || (role === 'CLIENT_REQUESTER' || role === 'CLIENT_RESPONSIBLE')) ? 'btn-outline' : 'btn-primary')}
                    >
                      {isCompleted || schedule.status === 'SIGNED' ? 'Ver Reporte' : (role === 'CLIENT_REQUESTER' || role === 'CLIENT_RESPONSIBLE') ? 'Ver Detalles' : 'Completar Checklist'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSchedule && (
        <ChecklistModal 
          schedule={selectedSchedule} 
          onClose={() => setSelectedSchedule(null)}
          onSuccess={() => { setSelectedSchedule(null); fetchSchedules(); }}
        />
      )}

      {selectedForApproval.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-40 flex justify-between items-center animate-slide-up">
          <div className="flex flex-col ml-12 lg:ml-64">
            <span className="font-semibold">{selectedForApproval.length} seleccionados</span>
            <span className="text-sm text-muted-foreground">Listos para firma de cliente</span>
          </div>
          <button 
            onClick={handleGenerateApproval} 
            disabled={isGeneratingApproval}
            className="btn-primary gap-2"
          >
            {isGeneratingApproval ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
            Pedir Firma
          </button>
        </div>
      )}

      {approvalModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 relative">
            <button 
              onClick={() => { setApprovalModalId(null); fetchSchedules(); }}
              className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <QrCode className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-6">Firma del Cliente</h2>
              
              <div className="bg-white p-4 rounded-xl mx-auto inline-block">
                <QRCodeSVG 
                  value={`${window.location.origin}/public/approval/${approvalModalId}`}
                  size={200}
                  level="H"
                />
              </div>

              <p className="text-xs text-muted-foreground mt-6 break-all">
                URL manual: {window.location.origin}/public/approval/{approvalModalId}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'border-t-primary text-primary',
    emerald: 'border-t-emerald-500 text-emerald-600 dark:text-emerald-400',
    blue: 'border-t-blue-500 text-blue-600 dark:text-blue-400',
    amber: 'border-t-amber-500 text-amber-600 dark:text-amber-400',
    red: 'border-t-red-500 text-red-600 dark:text-red-400',
  };
  return (
    <div className={`glass-card p-4 border-t-4 ${colorMap[color]?.split(' ')[0]}`}>
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(' ').slice(1).join(' ')}`}>{value}</p>
    </div>
  );
}
