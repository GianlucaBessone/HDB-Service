'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket, Search, Plus, Filter,
  Clock, CheckCircle2, Archive, Loader2, MessageSquare, QrCode
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import CreateTicketModal from '@/components/CreateTicketModal';
import TicketDetailPanel from '@/components/TicketDetailPanel';

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      const res = await fetch(`/api/tickets?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const tickets: any[] = data?.tickets || [];
  const total: number = data?.total || 0;

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
    <div className={clsx("flex flex-col md:flex-row gap-6 animate-fade-in relative", selectedTicketId ? "h-[calc(100vh-8rem)] overflow-hidden" : "pb-12")}>
      
      {/* LEFT COLUMN: Ticket List */}
      <div className={clsx(
        "flex flex-col gap-6 w-full",
        selectedTicketId ? "hidden md:flex md:w-[45%] lg:w-[50%] shrink-0 overflow-y-auto custom-scrollbar pr-2 h-full" : "w-full"
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Ticket className="w-7 h-7 text-primary" />
              </div>
              <span className="truncate">Tickets de Soporte</span>
            </h1>
            {!selectedTicketId && (
              <p className="text-muted-foreground mt-1">Gestión de incidencias y pedidos de mantenimiento</p>
            )}
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary gap-2 shrink-0 h-10 w-full lg:w-auto justify-center">
            <Plus className="w-5 h-5" />
            <span className={clsx(selectedTicketId ? "hidden lg:inline" : "")}>Nuevo Ticket</span>
          </button>
        </div>

        {/* KPI Cards - Hide when detail is open to save space */}
        {!selectedTicketId && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            <KpiCard label="Total Histórico" value={kpis.total} color="primary" />
            <KpiCard label="Abiertos" value={kpis.open} color="sky" />
            <KpiCard label="En Progreso" value={kpis.inProgress} color="amber" />
            <KpiCard label="Alta Prioridad" value={kpis.critical} color="red" />
          </div>
        )}

        {/* Filters */}
        <div className="glass-card p-3 flex flex-col xl:flex-row gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 h-9 text-sm w-full"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="select h-9 text-sm w-1/2 xl:w-auto px-2"
            >
              <option value="">Estados (Todos)</option>
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En Proceso</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="select h-9 text-sm w-1/2 xl:w-auto px-2"
            >
              <option value="">Prioridad (Todas)</option>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>
        </div>

        {/* Table / List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-lg shrink-0" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
            <Ticket className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium">No hay tickets</p>
          </div>
        ) : (
          <div className={clsx("grid gap-4", selectedTicketId ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
            {filteredTickets.map(ticket => {
              const isSelected = selectedTicketId === ticket.id;
              return (
                <button 
                  key={ticket.id} 
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={clsx(
                    "text-left glass-card p-4 hover:border-primary/50 transition-colors flex flex-col focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isSelected ? "border-primary ring-1 ring-primary shadow-md bg-primary/5" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <span className={clsx("text-xs font-mono shrink-0", isSelected ? "text-primary font-bold" : "text-muted-foreground")}>{ticket.id}</span>
                    <div className="flex flex-wrap justify-end gap-1.5">
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
                  
                  <h3 className={clsx("font-semibold line-clamp-2 leading-tight mb-2", selectedTicketId ? "text-sm" : "text-base")}>{ticket.reason}</h3>
                  
                  <div className="mt-auto pt-3 flex flex-col gap-1.5 text-xs text-muted-foreground border-t border-border/50">
                    {ticket.dispenser ? (
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-foreground truncate">{ticket.dispenser.id}</span>
                        <span className="truncate flex-1 text-right">{ticket.location?.plant?.nombre || 'Planta no asig.'}</span>
                      </div>
                    ) : (
                      <span className="italic">Sin equipo asociado</span>
                    )}
                    
                    <div className="flex justify-between items-center mt-1">
                      <span>{new Date(ticket.createdAt).toLocaleDateString('es-AR')}</span>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{ticket._count?.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Ticket Detail (Slide-over in Mobile) */}
      {selectedTicketId && (
        <div className={clsx(
          "flex-1 absolute md:relative top-0 right-0 w-full h-full md:h-auto z-40",
          "animate-in slide-in-from-right-8 duration-200 ease-out",
        )}>
          <div className="h-full rounded-xl overflow-hidden glass-card shadow-2xl md:shadow-none border-0 md:border md:bg-card">
            <TicketDetailPanel 
              ticketId={selectedTicketId} 
              onClose={() => setSelectedTicketId(null)}
              onUpdate={() => refetch()}
            />
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); refetch(); }}
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
