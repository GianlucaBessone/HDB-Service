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
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';
import { EquipmentType } from '@prisma/client';

export default function MaintenancePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
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
      <PageHeader
        title="Mantenimiento preventivo"
        description="Planificación mensual de rutas y checklists por activo."
        actions={
          (role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
            <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
              Generar tareas del mes
            </button>
          )
        }
      />

      {/* Subnavegación + vista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <nav className="tabs flex-1 sm:border-b-0" aria-label="Secciones de mantenimiento">
          <span className="tab-active" aria-current="page">
            <Wrench className="h-4 w-4" /> Planificación
          </span>
          <Link href="/maintenance/approvals" className="tab">
            <FileSignature className="h-4 w-4" /> Firmas
          </Link>
          <Link href="/maintenance/reports" className="tab">
            <FileText className="h-4 w-4" /> Reportes
          </Link>
        </nav>
        <div className="segmented self-start sm:self-auto" role="group" aria-label="Vista">
          <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'segmented-item-active' : 'segmented-item'} aria-pressed={viewMode === 'list'}>
            <LayoutList className="h-3.5 w-3.5" /> Lista
          </button>
          <button onClick={() => setViewMode('calendar')} className={viewMode === 'calendar' ? 'segmented-item-active' : 'segmented-item'} aria-pressed={viewMode === 'calendar'}>
            <CalendarDays className="h-3.5 w-3.5" /> Calendario
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Total del mes" value={kpis.total} />
        <StatCard label="Completados" value={kpis.completed} tone="success" />
        <StatCard label="Firmados" value={kpis.signed} tone="info" />
        <StatCard label="Pendientes" value={kpis.pending} tone="warning" />
        <StatCard label="Vencidos" value={kpis.overdue} tone="danger" emphasize={kpis.overdue > 0} />
      </div>

      <FilterBar>
        <FieldIcon icon={Calendar} className="lg:w-48">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input pl-9" aria-label="Mes" />
        </FieldIcon>
        <FieldIcon icon={Building2} className="lg:w-56">
          <select value={clientId} onChange={e => setClientId(e.target.value)} className="select pl-9" aria-label="Empresa">
            <option value="">Todas las empresas</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </FieldIcon>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select lg:w-44" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="COMPLETED">Completado</option>
          <option value="OVERDUE">Atrasado</option>
          <option value="EXPIRED">Vencido</option>
          <option value="SIGNED">Firmado</option>
        </select>
        <select value={equipmentTypeFilter} onChange={e => setEquipmentTypeFilter(e.target.value)} className="select lg:w-52" aria-label="Tipo de activo">
          <option value="">Todos los activos</option>
          <option value="AIR_CONDITIONER">Aires acondicionados</option>
          <option value="COLD_ROOM">Cámaras frigoríficas</option>
          <option value="DISPENSER">Dispensers de agua</option>
          <option value="REFRIGERATOR">Heladeras comerciales</option>
          <option value="VENTILATION">Ventilación / extracción</option>
          <option value="OTHER">Otros equipos</option>
        </select>
      </FilterBar>

      {/* Calendar or List View */}
      {viewMode === 'calendar' ? (
        <div className="glass-card space-y-4 p-3 sm:p-5">
          <div className="flex flex-col justify-between gap-2 border-b border-border pb-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="panel-title first-letter:uppercase">
                {new Date(daysInMonth.year, daysInMonth.month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-muted-foreground">Tareas preventivas programadas por día.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="status-dot bg-success"></span> Completado</span>
              <span className="flex items-center gap-1.5"><span className="status-dot bg-info"></span> Firmado</span>
              <span className="flex items-center gap-1.5"><span className="status-dot bg-warning"></span> Pendiente</span>
              <span className="flex items-center gap-1.5"><span className="status-dot bg-destructive"></span> Vencido</span>
            </div>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 py-1 text-center eyebrow md:gap-2">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div>Sáb</div>
            <div>Dom</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* Empty offset padding */}
            {Array.from({ length: daysInMonth.firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[64px] rounded-md bg-muted/40 sm:min-h-[90px]" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth.totalDays }).map((_, i) => {
              const dayNum = i + 1;
              const daySchedules = schedulesByDay[dayNum] || [];
              const isToday = new Date().getDate() === dayNum && (new Date().getMonth() + 1) === daysInMonth.month && new Date().getFullYear() === daysInMonth.year;

              return (
                <div
                  key={`day-${dayNum}`}
                  onClick={() => daySchedules.length > 0 && setSelectedDay(dayNum)}
                  className={clsx(
                    selectedDay === dayNum && 'ring-2 ring-primary/40 sm:ring-0',
                    daySchedules.length > 0 && 'cursor-pointer sm:cursor-default',
                    "flex min-h-[64px] flex-col rounded-md border p-1 transition-colors sm:min-h-[90px] md:p-2",
                    isToday ? "border-primary bg-primary/[0.04]" : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={clsx(
                      "text-2xs md:text-xs font-semibold w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center",
                      isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {dayNum}
                    </span>
                    {daySchedules.length > 0 && (
                      <span className="rounded bg-muted px-1 text-2xs font-semibold text-foreground tabular">
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
                            "hidden cursor-pointer items-center justify-between rounded border p-1 text-2xs font-medium sm:flex",
                            s.status === 'COMPLETED' ? "bg-success/10 border-success/30 text-success" :
                            s.status === 'SIGNED' ? "bg-info/10 border-info/30 text-info" :
                            s.status === 'OVERDUE' ? "bg-destructive/10 border-destructive/30 text-destructive" :
                            "bg-warning/10 border-warning/30 text-warning"
                          )}
                          title={`${s.dispenserId} - ${t(s.status)}`}
                        >
                          <div className="flex items-center gap-1 truncate">
                            <Icon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{s.dispenserId}</span>
                          </div>
                          <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", 
                            s.status === 'COMPLETED' ? "bg-success" :
                            s.status === 'SIGNED' ? "bg-info" :
                            s.status === 'OVERDUE' ? "bg-destructive" : "bg-warning"
                          )} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Móvil: detalle del día seleccionado */}
          <div className="sm:hidden">
            {selectedDay && (schedulesByDay[selectedDay] || []).length > 0 ? (
              <div className="rounded-md border border-border">
                <p className="eyebrow border-b border-border px-3 py-2">Día {selectedDay}</p>
                <ul className="divide-y divide-border">
                  {(schedulesByDay[selectedDay] || []).map((s: any) => (
                    <li key={s.id}>
                      <button onClick={() => setSelectedSchedule(s)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                        <span className="font-mono text-sm font-medium">{s.dispenserId}</span>
                        <span className={clsx('badge', getStatusColor(s.status))}>{t(s.status)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Tocá un día con tareas para ver el detalle.</p>
            )}
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-lg" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState icon={Wrench} title="No hay mantenimientos planificados" description="Generá las tareas del mes para comenzar." />
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden">
          {schedules.map(schedule => {
            const isCompleted = schedule.status === 'COMPLETED';
            const isSelected = selectedForApproval.includes(schedule.id);
            const clientName = schedule.dispenser?.client?.nombre || 
                               schedule.dispenser?.plant?.client?.nombre || 
                               schedule.dispenser?.location?.plant?.client?.nombre;

            return (
              <div key={schedule.id} className={clsx('flex flex-col justify-between gap-3 p-4 transition-colors sm:flex-row sm:items-center', isSelected && 'bg-primary/[0.05]')}>
                <div className="flex min-w-0 items-start gap-3">
                  {isCompleted && (
                    <input 
                      type="checkbox" 
                      className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[hsl(var(--primary))]"
                      aria-label={`Seleccionar ${schedule.dispenserId} para firma`}
                      checked={isSelected}
                      onChange={() => toggleApprovalSelection(schedule.id)}
                    />
                  )}
                  {(() => {
                    const eqType = schedule.dispenser?.equipmentType || 'DISPENSER';
                    const Icon = getEquipmentTypeIcon(eqType);
                    return (
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Icon className="h-[18px] w-[18px]" />
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 font-mono text-[15px] font-semibold">{schedule.dispenserId}</span>
                      <span className={clsx('badge', getStatusColor(schedule.status))}>
                        {t(schedule.status)}
                      </span>
                      {clientName && (
                        <span className="badge-neutral">
                          <Building2 className="h-3 w-3 shrink-0" />
                          {clientName}
                        </span>
                      )}
                      <span className="badge-neutral">
                        {getEquipmentTypeLabel(schedule.dispenser?.equipmentType || 'DISPENSER')}
                      </span>
                      {schedule.dispenser?.criticality === 'CRITICAL' && (
                        <span className="badge-danger">Crítico</span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{schedule.dispenser?.location?.plant?.nombre}</span>
                      {schedule.dispenser?.location?.sector?.nombre && (
                        <span>· {schedule.dispenser.location.sector.nombre}</span>
                      )}
                      <span>· {schedule.dispenser?.location?.nombre || 'Sin ubicación'}</span>
                    </p>
                    {schedule.dispenser?.marca && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {schedule.dispenser.marca} {schedule.dispenser.modelo || ''}
                      </p>
                    )}
                    {schedule.checklist?.measurements && Object.keys(schedule.checklist.measurements).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {schedule.checklist.measurements.presionBajaPsi && (
                          <span className="badge-neutral tabular">
                            Succión: <strong>{schedule.checklist.measurements.presionBajaPsi} PSI</strong>
                          </span>
                        )}
                        {schedule.checklist.measurements.saltoTermicoC && (
                          <span className="badge-neutral tabular">
                            Salto térmico: <strong>{schedule.checklist.measurements.saltoTermicoC} °C</strong>
                          </span>
                        )}
                        {schedule.checklist.measurements.tempCamaraC && (
                          <span className="badge-neutral tabular">
                            Cámara: <strong>{schedule.checklist.measurements.tempCamaraC} °C</strong>
                          </span>
                        )}
                        {schedule.checklist.measurements.corrienteCompresorA && (
                          <span className="badge-neutral tabular">
                            I: <strong>{schedule.checklist.measurements.corrienteCompresorA} A</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2 sm:pl-4">
                  <button
                    onClick={() => setSelectedSchedule(schedule)}
                    className={clsx('w-full sm:w-auto', (isCompleted || schedule.status === 'SIGNED' || (role === 'CLIENT_REQUESTER' || role === 'CLIENT_RESPONSIBLE')) ? 'btn-outline' : 'btn-primary')}
                  >
                    {isCompleted || schedule.status === 'SIGNED' ? 'Ver reporte' : (role === 'CLIENT_REQUESTER' || role === 'CLIENT_RESPONSIBLE') ? 'Ver detalle' : 'Completar checklist'}
                    <ChevronRight className="h-4 w-4" />
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
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 shadow-lg animate-sheet-up md:bottom-0 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:left-[248px] lg:px-8">
          <div className="min-w-0">
            <p className="text-sm font-semibold tabular">{selectedForApproval.length} seleccionados</p>
            <p className="text-xs text-muted-foreground">Listos para firma del cliente</p>
          </div>
          <button onClick={handleGenerateApproval} disabled={isGeneratingApproval} className="btn-primary shrink-0">
            {isGeneratingApproval ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Solicitar firma
          </button>
        </div>
      )}

      {approvalModalId && (
        <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) { setApprovalModalId(null); fetchSchedules(); } }}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2>Firma del cliente</h2>
              <button onClick={() => { setApprovalModalId(null); fetchSchedules(); }} className="modal-close" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="modal-body text-center">
              <p className="mb-4 text-sm text-muted-foreground">El cliente puede escanear este código para revisar y firmar la conformidad.</p>
              <div className="inline-block rounded-lg border border-border bg-white p-4">
                <QRCodeSVG value={`${window.location.origin}/public/approval/${approvalModalId}`} size={200} level="H" />
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2 text-left">
                <code className="min-w-0 flex-1 truncate text-xs">{window.location.origin}/public/approval/{approvalModalId}</code>
                <button
                  className="btn-outline btn-sm shrink-0"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/public/approval/${approvalModalId}`);
                    toast.success('Enlace copiado');
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
