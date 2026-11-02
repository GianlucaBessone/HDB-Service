'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Ticket, Search, Plus,
  Clock, CheckCircle2, Archive, MessageSquare, Building2, MapPin, ChevronRight
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import CreateTicketModal from '@/components/CreateTicketModal';
import TicketDetailPanel from '@/components/TicketDetailPanel';
import { getEquipmentTypeLabel } from '@/lib/equipment';
import PageHeader from '@/components/ui/PageHeader';
import StatCard, { StatGrid } from '@/components/ui/StatCard';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';

export default function TicketsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const d = await res.json();
      return Array.isArray(d) ? d : (d.clients || []);
    }
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tickets', statusFilter, priorityFilter, clientIdFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (clientIdFilter) params.set('clientId', clientIdFilter);
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

  const statusIcon = (status: string) =>
    status === 'OPEN' ? Ticket : status === 'IN_PROGRESS' ? Clock : status === 'RESOLVED' ? CheckCircle2 : Archive;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tickets"
        description="Incidencias y pedidos de servicio técnico."
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="h-4 w-4" />
            Nuevo ticket
          </button>
        }
      />

      <StatGrid>
        <StatCard label="Total histórico" value={kpis.total} />
        <StatCard label="Abiertos" value={kpis.open} tone="info" />
        <StatCard label="En progreso" value={kpis.inProgress} tone="warning" />
        <StatCard label="Críticos activos" value={kpis.critical} tone="danger" emphasize={kpis.critical > 0} />
      </StatGrid>

      <FilterBar>
        <FieldIcon icon={Search} className="sm:col-span-2 lg:flex-1 lg:min-w-[240px]">
          <input
            type="search"
            placeholder="Buscar por ID, motivo o activo…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
            aria-label="Buscar tickets"
          />
        </FieldIcon>
        <select value={clientIdFilter} onChange={e => setClientIdFilter(e.target.value)} className="select lg:w-52" aria-label="Empresa">
          <option value="">Todas las empresas</option>
          {clients.map((c: any) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select lg:w-44" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="OPEN">Abierto</option>
          <option value="IN_PROGRESS">En progreso</option>
          <option value="RESOLVED">Resuelto</option>
          <option value="CLOSED">Cerrado</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="select lg:w-44" aria-label="Prioridad">
          <option value="">Todas las prioridades</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
      </FilterBar>

      <div className={clsx(selectedTicketId && 'md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start md:gap-5')}>
        {/* Listado */}
        <div className="min-w-0">
          {isLoading ? (
            <div className="glass-card divide-y divide-border">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-2 p-4">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-4 w-2/3" />
                </div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No hay tickets"
              description={search || statusFilter || priorityFilter || clientIdFilter ? 'Ningún ticket coincide con los filtros aplicados.' : 'Cuando se registre un ticket aparecerá aquí.'}
            />
          ) : (
            <div className="glass-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                <span className="tabular">{filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}</span>
              </div>
              <ul className="divide-y divide-border">
                {filteredTickets.map(ticket => {
                  const isSelected = selectedTicketId === ticket.id;
                  const clientName = ticket.location?.plant?.client?.nombre || ticket.dispenser?.client?.nombre;
                  const SIcon = statusIcon(ticket.status);
                  return (
                    <li key={ticket.id}>
                      <button
                        onClick={() => setSelectedTicketId(ticket.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={clsx(
                          'group relative flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors focus-visible:bg-accent focus-visible:outline-none',
                          isSelected ? 'bg-primary/[0.06]' : 'hover:bg-muted/50'
                        )}
                      >
                        {isSelected && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden="true" />}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
                            <span className={clsx('badge', getStatusColor(ticket.status))}>
                              <SIcon className="h-3 w-3" />
                              {t(ticket.status)}
                            </span>
                            <span className={clsx('badge', getStatusColor(ticket.priority))}>{t(ticket.priority)}</span>
                            {!ticket.assignedToId && <span className="badge-warning">Sin asignar</span>}
                          </div>
                          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{ticket.reason}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {clientName && (
                              <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{clientName}</span>
                            )}
                            {ticket.dispenser ? (
                              <span className="inline-flex items-center gap-1">
                                <span className="font-mono text-foreground">{ticket.dispenser.id}</span>
                                {ticket.dispenser.equipmentType && <span>· {getEquipmentTypeLabel(ticket.dispenser.equipmentType)}</span>}
                              </span>
                            ) : (
                              <span>Sin activo asociado</span>
                            )}
                            {ticket.location?.plant?.nombre && (
                              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ticket.location.plant.nombre}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5 text-xs text-muted-foreground">
                          <span className="tabular">{new Date(ticket.createdAt).toLocaleDateString('es-AR')}</span>
                          <span className="inline-flex items-center gap-1 tabular">
                            <MessageSquare className="h-3 w-3" />
                            {ticket._count?.comments || 0}
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Detalle: pantalla completa en móvil, panel fijo en desktop */}
        {selectedTicketId && (
          <div className="fixed inset-0 z-50 animate-sheet-up md:sticky md:inset-auto md:top-4 md:z-auto md:h-[calc(100dvh-8rem)] md:animate-fade-in md:overflow-hidden md:rounded-lg md:border md:border-border md:shadow-sm">
            <TicketDetailPanel
              ticketId={selectedTicketId}
              onClose={() => setSelectedTicketId(null)}
              onUpdate={() => refetch()}
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); refetch(); }}
        />
      )}
    </div>
  );
}
