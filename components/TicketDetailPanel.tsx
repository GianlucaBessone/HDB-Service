'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  X, Ticket, MapPin, Clock, ChevronLeft, Maximize2, Wrench,
  CheckCircle2, Archive, Send, Loader2, RefreshCw, User,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import RepairModal from '@/components/RepairModal';
import ConfirmModal from '@/components/ConfirmModal';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';

interface TicketDetailPanelProps {
  ticketId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TicketDetailPanel({ ticketId, onClose, onUpdate }: TicketDetailPanelProps) {
  const queryClient = useQueryClient();

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [isSettingRepair, setIsSettingRepair] = useState(false);
  const [showConfirmRepairModal, setShowConfirmRepairModal] = useState(false);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const { data: ticket, isLoading, refetch } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    // Optionally use initial data from the tickets list cache if available
    initialData: () => {
      // Look through all ticket lists in cache
      const lists = queryClient.getQueriesData({ queryKey: ['tickets'] });
      for (const [_, data] of lists) {
        if (data && (data as any).tickets) {
          const found = (data as any).tickets.find((t: any) => t.id === ticketId);
          if (found) return found; // Initial fast render
        }
      }
      return undefined;
    },
    initialDataUpdatedAt: () => queryClient.getQueryState(['tickets'])?.dataUpdatedAt,
  });

  const [isClaiming, setIsClaiming] = useState(false);

  const handleClaimTicket = async () => {
    if (!session?.user?.id) return;
    setIsClaiming(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: session.user.id, status: 'IN_PROGRESS' }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al tomar el ticket');
      }
      toast.success('¡Has tomado el ticket exitosamente!');
      await refetch();
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Error al tomar el ticket');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRegisterRepair = async () => {
    if (!ticket?.dispenser) return toast.error('No hay equipo asociado');

    if (ticket.dispenser.status !== 'UNDER_REPAIR') {
      setShowConfirmRepairModal(true);
      return;
    }
    setShowRepairModal(true);
  };

  const confirmAndSetRepair = async () => {
    setIsSettingRepair(true);
    try {
      const res = await fetch(`/api/dispensers/${ticket.dispenser.id}/set-repair`, { method: 'POST' });
      if (!res.ok) throw new Error();
      toast.success('Equipo movido a Reparación');
      await refetch();
      onUpdate();
      setShowRepairModal(true);
    } catch {
      toast.error('Error al actualizar equipo');
    } finally {
      setIsSettingRepair(false);
      setShowConfirmRepairModal(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment }),
      });
      if (!res.ok) throw new Error();
      setNewComment('');
      refetch();
    } catch {
      toast.error('Error al enviar comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !ticket) {
    return (
      <div className="flex h-full items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando ticket…
      </div>
    );
  }

  const isTech = session?.user?.role === 'TECHNICIAN';
  const isUnassigned = !ticket.assignedToId;

  const isActive = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  const loc = ticket.location || ticket.dispenser?.location;
  const StatusIcon =
    ticket.status === 'OPEN' ? Ticket :
    ticket.status === 'IN_PROGRESS' ? Clock :
    ticket.status === 'RESOLVED' ? CheckCircle2 : Archive;

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Encabezado */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-2 sm:px-3">
        <button onClick={onClose} className="btn-ghost btn-sm gap-1 md:hidden" aria-label="Volver al listado">
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
        <span className="min-w-0 flex-1 truncate px-1 font-mono text-[13px] text-muted-foreground">{ticket.id}</span>
        <Link href={`/tickets/${ticket.id}`} className="btn-icon btn-ghost" aria-label="Abrir en página completa" title="Abrir en página completa">
          <Maximize2 className="h-4 w-4" />
        </Link>
        <button onClick={onClose} className="btn-icon btn-ghost hidden md:inline-flex" aria-label="Cerrar panel" title="Cerrar panel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Resumen */}
        <div className="space-y-4 border-b border-border p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={clsx('badge', getStatusColor(ticket.status))}>
              <StatusIcon className="h-3 w-3" />
              {t(ticket.status)}
            </span>
            <span className={clsx('badge', getStatusColor(ticket.priority))}>Prioridad {t(ticket.priority).toLowerCase()}</span>
            {isUnassigned && isActive && <span className="badge-warning">Sin asignar</span>}
          </div>
          <h1 className="text-lg font-semibold leading-snug text-foreground sm:text-xl">{ticket.reason}</h1>

          {ticket.description && (
            <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
              {ticket.description}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {isTech && isUnassigned && isActive && (
              <button onClick={handleClaimTicket} disabled={isClaiming} className="btn-primary">
                {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Tomar ticket
              </button>
            )}
            {isActive && (
              <button onClick={handleRegisterRepair} disabled={isSettingRepair} className={isTech && isUnassigned ? 'btn-outline' : 'btn-primary'}>
                {isSettingRepair ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Registrar reparación
              </button>
            )}
            <button onClick={() => setShowStatusModal(true)} className="btn-outline">
              <RefreshCw className="h-4 w-4" />
              Cambiar estado
            </button>
          </div>
        </div>

        {/* Datos */}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 border-b border-border p-4 text-sm sm:grid-cols-2 sm:p-5">
          <div className="min-w-0">
            <dt className="eyebrow">Activo</dt>
            <dd className="mt-1">
              {ticket.dispenser ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/dispensers/${ticket.dispenser.id}`} className="font-mono font-medium text-primary hover:underline">
                      {ticket.dispenser.id}
                    </Link>
                    <span className="badge-neutral">{getEquipmentTypeLabel(ticket.dispenser.equipmentType)}</span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{ticket.dispenser.marca} {ticket.dispenser.modelo}</p>
                </>
              ) : (
                <span className="text-muted-foreground">Sin activo asociado</span>
              )}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="eyebrow">Ubicación</dt>
            <dd className="mt-1">
              {ticket.dispenser?.status === 'UNDER_REPAIR' ? (
                <>
                  <p className="font-medium text-warning">En taller</p>
                  <p className="text-xs text-muted-foreground">Retirado de: {ticket.location?.nombre || ticket.location?.plant?.nombre || 'ubicación original'}</p>
                </>
              ) : loc ? (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="font-medium">{loc.plant?.nombre}</p>
                    <p className="text-muted-foreground">{loc.sector?.nombre ? `${loc.sector.nombre} · ` : ''}{loc.nombre}</p>
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">Sin ubicación</span>
              )}
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="eyebrow">Reportado por</dt>
            <dd className="mt-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium">{ticket.reportedBy?.nombre || 'Usuario desconocido'}</span>
              <span className="text-muted-foreground tabular">· {new Date(ticket.createdAt).toLocaleDateString('es-AR')}</span>
            </dd>
          </div>

          <div className="min-w-0">
            <dt className="eyebrow">Asignado a</dt>
            <dd className="mt-1 font-medium">{ticket.assignedTo?.nombre || <span className="font-normal text-muted-foreground">Sin asignar</span>}</dd>
          </div>

          <div className="min-w-0 sm:col-span-2">
            <dt className="eyebrow">Notificaciones al solicitante</dt>
            <dd className="mt-1 text-muted-foreground">
              {ticket.wantsPushNotifications ? 'Activadas' : 'Desactivadas'}
              {ticket.wantsEmailNotifications && ' · también por correo'}
            </dd>
          </div>
        </dl>

        {/* Comentarios */}
        <section className="flex flex-col p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">
            Comentarios <span className="font-normal text-muted-foreground tabular">({ticket.comments?.length || 0})</span>
          </h3>

          <div className="space-y-3">
            {!ticket.comments || ticket.comments.length === 0 ? (
              <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Todavía no hay comentarios.
              </p>
            ) : (
              ticket.comments.map((comment: any) => {
                const isMe = comment.userId === session?.user?.id;
                return (
                  <div
                    key={comment.id}
                    className={clsx(
                      'max-w-[88%] rounded-lg border px-3 py-2.5',
                      isMe ? 'ml-auto border-primary/20 bg-primary/[0.06]' : 'mr-auto border-border bg-muted/50'
                    )}
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {comment.user?.nombre} {comment.user?.apellido}
                        <span className="font-normal text-muted-foreground"> · {t(comment.user?.role)}</span>
                      </span>
                      <span className="shrink-0 text-2xs text-muted-foreground tabular">
                        {new Date(comment.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{comment.message}</p>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Nuevo comentario */}
      <div className="flex shrink-0 items-end gap-2 border-t border-border bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <textarea
          className="textarea max-h-32 min-h-[44px] flex-1 resize-none py-2.5 sm:min-h-[40px]"
          placeholder="Escribir un comentario…"
          aria-label="Nuevo comentario"
          rows={1}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handlePostComment();
            }
          }}
        />
        <button
          onClick={handlePostComment}
          disabled={isSubmitting || !newComment.trim()}
          className="btn-primary h-11 w-11 shrink-0 p-0 sm:h-10 sm:w-10"
          aria-label="Enviar comentario"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal 
          ticket={ticket} 
          onClose={() => setShowStatusModal(false)} 
          onSuccess={() => { setShowStatusModal(false); refetch(); onUpdate(); }} 
        />
      )}

      {/* Repair Modal */}
      {showRepairModal && (
        <RepairModal 
          ticket={ticket} 
          onClose={() => setShowRepairModal(false)} 
          onSuccess={() => { setShowRepairModal(false); refetch(); onUpdate(); }} 
        />
      )}

      {/* Confirm Repair Transition Modal */}
      {showConfirmRepairModal && (
        <ConfirmModal
          title="Pasar a reparación"
          description="El activo no está en reparación. ¿Pasarlo a reparación ahora? Se retirará de su ubicación actual."
          confirmLabel="Sí, pasar a reparación"
          cancelLabel="Cancelar"
          onConfirm={confirmAndSetRepair}
          onClose={() => setShowConfirmRepairModal(false)}
          isLoading={isSettingRepair}
          variant="warning"
        />
      )}
    </div>
  );
}

function StatusModal({ ticket, onClose, onSuccess }: { ticket: any, onClose: () => void, onSuccess: () => void }) {
  const [status, setStatus] = useState(ticket.status);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSave = async (force = false) => {
    if (!force && status === 'CLOSED' && ticket.status !== 'RESOLVED') {
      setShowConfirm(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      if (!res.ok) throw new Error();
      toast.success('Estado actualizado');
      onSuccess();
    } catch {
      toast.error('Error al actualizar estado');
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <div className="modal-overlay z-[60]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-content max-w-sm">
          <div className="modal-header">
            <h2>Cambiar estado</h2>
            <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Nuevo estado</label>
              <select className="select mt-1" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En progreso</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="CLOSED">Cerrado</option>
              </select>
            </div>
            <div>
              <label className="label">Notas (opcional)</label>
              <textarea className="textarea mt-1" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn-outline">Cancelar</button>
            <button onClick={() => handleSave()} disabled={saving || status === ticket.status} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="Cerrar sin resolver"
          description="¿Cerrar el ticket sin resolverlo? Se informará al solicitante y al supervisor."
          confirmLabel="Cerrar ticket"
          cancelLabel="Volver"
          onConfirm={() => handleSave(true)}
          onClose={() => setShowConfirm(false)}
          isLoading={saving}
          variant="warning"
        />
      )}
    </>
  );
}
