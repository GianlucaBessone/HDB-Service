'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Ticket, Search, Plus, Filter, ChevronDown, ChevronUp,
  AlertTriangle, Clock, CheckCircle2, Archive, Loader2, MessageSquare, QrCode
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ElementType }> = {
  OPEN:        { label: 'Abierto',     badge: 'badge-info',    icon: Ticket },
  IN_PROGRESS: { label: 'En Progreso', badge: 'badge-warning', icon: Clock },
  RESOLVED:    { label: 'Resuelto',    badge: 'badge-success', icon: CheckCircle2 },
  CLOSED:      { label: 'Cerrado',     badge: 'badge-neutral', icon: Archive },
};

const PRIORITY_CONFIG: Record<string, { label: string; badge: string }> = {
  LOW:      { label: 'Baja',     badge: 'badge-neutral' },
  MEDIUM:   { label: 'Media',    badge: 'badge-info' },
  HIGH:     { label: 'Alta',     badge: 'badge-warning' },
  CRITICAL: { label: 'Crítica',  badge: 'badge-danger' },
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      
      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Error al cargar tickets');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const filteredTickets = tickets.filter(t => 
    !search || 
    t.id.toLowerCase().includes(search.toLowerCase()) || 
    t.reason.toLowerCase().includes(search.toLowerCase()) ||
    t.dispenser?.id?.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = {
    total: total,
    open: tickets.filter(t => t.status === 'OPEN').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    critical: tickets.filter(t => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Ticket className="w-7 h-7 text-primary" />
            </div>
            Tickets de Soporte
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de incidencias y pedidos de mantenimiento</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary btn-lg gap-2 shrink-0">
          <Plus className="w-5 h-5" />
          Nuevo Ticket
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Histórico" value={kpis.total} color="primary" />
        <KpiCard label="Abiertos" value={kpis.open} color="sky" />
        <KpiCard label="En Progreso" value={kpis.inProgress} color="amber" />
        <KpiCard label="Alta Prioridad" value={kpis.critical} color="red" />
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por ID, motivo o equipo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="select min-w-[150px]"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="select min-w-[150px]"
        >
          <option value="">Todas las prioridades</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 skeleton rounded-lg" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <Ticket className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">No se encontraron tickets</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map(t => {
            const sc = STATUS_CONFIG[t.status];
            const pc = PRIORITY_CONFIG[t.priority];
            const StatusIcon = sc?.icon || Ticket;
            
            return (
              <Link key={t.id} href={`/tickets/${t.id}`} className="glass-card p-5 hover:border-primary/50 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-mono text-muted-foreground">{t.id}</span>
                  <div className="flex gap-2">
                    <span className={clsx('badge text-[10px] px-1.5 py-0', pc?.badge)}>{pc?.label}</span>
                    <span className={clsx('badge text-[10px] px-1.5 py-0', sc?.badge)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {sc?.label}
                    </span>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2">{t.reason}</h3>
                
                <div className="mt-auto pt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                  {t.dispenser ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{t.dispenser.id}</span>
                      <span className="text-xs truncate">· {t.location?.plant?.nombre}</span>
                    </div>
                  ) : (
                    <span className="italic">Sin equipo asociado</span>
                  )}
                  
                  <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2 mt-1">
                    <span>{new Date(t.createdAt).toLocaleDateString('es-AR')}</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t._count?.comments || 0}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchTickets(); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'border-t-primary text-primary',
    amber: 'border-t-amber-500 text-amber-600 dark:text-amber-400',
    red: 'border-t-red-500 text-red-600 dark:text-red-400',
    sky: 'border-t-sky-500 text-sky-600 dark:text-sky-400',
  };
  return (
    <div className={`glass-card p-4 border-t-4 ${colorMap[color]?.split(' ')[0]}`}>
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]?.split(' ').slice(1).join(' ')}`}>{value}</p>
    </div>
  );
}

// ─── Reason Combobox ────────────────────────────────
const SUGGESTED_REASONS = [
  'Pérdida de agua',
  'No enfría',
  'No calienta',
  'Cortocircuito',
  'Ruido excesivo',
  'No enciende',
  'Agua con mal sabor',
  'Agua con mal olor',
  'Fuga en canilla',
  'Fuga en manguera',
  'Botón roto',
  'Canilla rota (Agua Fría)',
  'Canilla rota (Agua Caliente)',
  'Bandeja desborda',
  'Display apagado',
  'Error eléctrico',
  'Filtro obstruido',
  'Mantenimiento preventivo',
  'Instalación',
  'Desinstalación',
  'Reubicación',
  'Otro',
];

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function ReasonCombobox({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = SUGGESTED_REASONS.filter(r =>
    normalize(r).includes(normalize(value))
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        setHighlightIdx(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && filtered[highlightIdx]) {
      e.preventDefault();
      onChange(filtered[highlightIdx]);
      setOpen(false);
      setHighlightIdx(-1);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        className="input mt-1 w-full"
        placeholder="Ej. Pérdida de agua, no enfría..."
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlightIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        required
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-y-auto"
          style={{ maxHeight: '15rem' }}
        >
          {filtered.slice(0, Math.max(filtered.length, 6)).map((reason, idx) => (
            <li
              key={reason}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                idx === highlightIdx
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted/50'
              }`}
              onMouseDown={(e) => { e.preventDefault(); onChange(reason); setOpen(false); }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ dispenserId: '', reason: '', description: '', priority: 'MEDIUM' });
  const [saving, setSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isScanning) return;
    
    let html5QrCode: any = null;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          const parts = decodedText.split('/');
          const scannedId = parts[parts.length - 1];
          setForm(p => ({ ...p, dispenserId: scannedId.toUpperCase() }));
          setIsScanning(false);
          html5QrCode.stop().catch(console.error);
        },
        (error: any) => {
          // ignore empty scans
        }
      ).catch((err: any) => {
        console.error(err);
        toast.error('Error al acceder a la cámara. Revisa los permisos.');
        setIsScanning(false);
      });
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al crear ticket');
        return;
      }
      toast.success('Ticket creado exitosamente');
      onCreated();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Nuevo Ticket</h2>
          <button onClick={onClose} className="btn-ghost btn-icon">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Equipo (ID Dispenser) *</label>
              <div className="flex gap-2 mt-1">
                <input
                  className="input uppercase flex-1"
                  placeholder="DISP-XXXX"
                  value={form.dispenserId}
                  onChange={e => setForm(p => ({ ...p, dispenserId: e.target.value.toUpperCase() }))}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setIsScanning(!isScanning)}
                  className={clsx('btn-icon rounded-lg border', isScanning ? 'bg-primary/10 text-primary border-primary/50' : 'btn-outline')}
                  title="Escanear QR"
                >
                  <QrCode className="w-5 h-5" />
                </button>
              </div>
              {isScanning && (
                <div className="mt-3 border rounded-lg overflow-hidden bg-black/5">
                  <div id="reader" className="w-full"></div>
                </div>
              )}
            </div>
            <div>
              <label className="label">Motivo *</label>
              <ReasonCombobox
                value={form.reason}
                onChange={(val: string) => setForm(p => ({ ...p, reason: val }))}
              />
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                className="textarea mt-1"
                rows={3}
                placeholder="Detalles adicionales del problema..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Prioridad</label>
              <select
                className="select mt-1"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
