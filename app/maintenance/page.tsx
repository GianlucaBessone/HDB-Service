'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Wrench, Calendar, Settings2, Clock, 
  CheckCircle2, AlertTriangle, Loader2, ChevronRight, MapPin, ShieldCheck, QrCode, X
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import ChecklistModal from '@/components/ChecklistModal';

const COMMON_FAILURES = [
  'Pérdida de agua', 'Filtro saturado', 'Canilla rota/goteando', 
  'No enfría', 'No calienta', 'Ruido excesivo del motor', 'Cable dañado'
];

export default function MaintenancePage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [month, setMonth] = useState(currentMonthStr);
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [selectedForApproval, setSelectedForApproval] = useState<string[]>([]);
  const [approvalModalId, setApprovalModalId] = useState<string | null>(null);
  const [isGeneratingApproval, setIsGeneratingApproval] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ month });
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/maintenance?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSchedules(data);
    } catch (error) {
      toast.error('Error al cargar cronograma');
    } finally {
      setIsLoading(false);
    }
  }, [month, statusFilter]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

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

  const kpis = {
    total: schedules.length,
    pending: schedules.filter(s => s.status === 'PENDING').length,
    completed: schedules.filter(s => s.status === 'COMPLETED').length,
    signed: schedules.filter(s => s.status === 'SIGNED').length,
    overdue: schedules.filter(s => s.status === 'OVERDUE').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wrench className="w-7 h-7 text-primary" />
            </div>
            Rutas de Mantenimiento
          </h1>
          <p className="text-muted-foreground mt-1">Planificación y checklists preventivos</p>
        </div>
        <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary btn-lg gap-2 shrink-0">
          {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Settings2 className="w-5 h-5" />}
          Generar Tareas del Mes
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
      </div>

      {/* Table / List */}
      {isLoading ? (
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
                  <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center shrink-0', isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary')}>
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{schedule.dispenserId}</span>
                      <span className={clsx('badge text-[10px] px-1.5 py-0', getStatusColor(schedule.status))}>{t(schedule.status)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {schedule.dispenser?.location?.plant?.nombre} — {schedule.dispenser?.location?.nombre || 'Sin ubicación'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSchedule(schedule)}
                    className={clsx('btn-sm gap-1.5 w-full sm:w-auto', isCompleted || schedule.status === 'SIGNED' ? 'btn-outline' : 'btn-primary')}
                  >
                    {isCompleted || schedule.status === 'SIGNED' ? 'Ver Reporte' : 'Completar Checklist'}
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
