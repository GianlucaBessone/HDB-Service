'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Ticket, Search, Plus, Filter,
  Clock, CheckCircle2, Archive, Loader2, MessageSquare, QrCode
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import CreateTicketModal from '@/components/CreateTicketModal';

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
          <option value="OPEN">Abierto</option>
          <option value="IN_PROGRESS">En Proceso</option>
          <option value="RESOLVED">Resuelto</option>
          <option value="CLOSED">Cerrado</option>
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="select min-w-[150px]"
        >
          <option value="">Todas las prioridades</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
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
          {filteredTickets.map(ticket => {
            return (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="glass-card p-5 hover:border-primary/50 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-mono text-muted-foreground">{ticket.id}</span>
                  <div className="flex gap-2">
                    <span className={clsx('badge text-[10px] px-1.5 py-0 border', ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-slate-100 text-slate-700 border-slate-200')}>{t(ticket.priority)}</span>
                    <span className={clsx('badge text-[10px] px-1.5 py-0 border', getStatusColor(ticket.status))}>
                      {ticket.status === 'OPEN' ? <Ticket className="w-3 h-3 mr-1" /> :
                       ticket.status === 'IN_PROGRESS' ? <Clock className="w-3 h-3 mr-1" /> :
                       ticket.status === 'RESOLVED' ? <CheckCircle2 className="w-3 h-3 mr-1" /> :
                       <Archive className="w-3 h-3 mr-1" />}
                      {t(ticket.status)}
                    </span>
                  </div>
                </div>
                
                <h3 className="font-semibold text-lg line-clamp-2 leading-tight mb-2">{ticket.reason}</h3>
                
                <div className="mt-auto pt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                  {ticket.dispenser ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{ticket.dispenser.id}</span>
                      <span className="text-xs truncate">· {ticket.location?.plant?.nombre}</span>
                    </div>
                  ) : (
                    <span className="italic">Sin equipo asociado</span>
                  )}
                  
                  <div className="flex justify-between items-center text-xs border-t border-border/50 pt-2 mt-1">
                    <span>{new Date(ticket.createdAt).toLocaleDateString('es-AR')}</span>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{ticket._count?.comments || 0}</span>
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
