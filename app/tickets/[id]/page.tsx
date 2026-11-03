'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Ticket, MapPin, Clock, X, Wrench,
  CheckCircle2, Archive, Send, Loader2, RefreshCw
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Panel from '@/components/ui/Panel';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import { getEquipmentTypeIcon, getEquipmentTypeLabel } from '@/lib/equipment';
import RepairModal from '@/components/RepairModal';
import ConfirmModal from '@/components/ConfirmModal';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [isSettingRepair, setIsSettingRepair] = useState(false);

  const [showConfirmRepairModal, setShowConfirmRepairModal] = useState(false);

  const handleRegisterRepair = async () => {
    if (!ticket.dispenser) return toast.error('No hay equipo asociado');

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
      await fetchTicket();
      setShowRepairModal(true);
    } catch {
      toast.error('Error al actualizar equipo');
    } finally {
      setIsSettingRepair(false);
      setShowConfirmRepairModal(false);
    }
  };

  const fetchTicket = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setTicket(data);
    } catch {
      toast.error('Ticket no encontrado');
      router.push('/tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTicket(); }, [ticketId]);

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
      fetchTicket();
    } catch {
      toast.error('Error al enviar comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !ticket) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-48 skeleton rounded-lg" />
      </div>
    );
  }

  const isActive = ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED';
  const loc = ticket.location || ticket.dispenser?.location;
  const StatusIcon =
    ticket.status === 'OPEN' ? Ticket :
    ticket.status === 'IN_PROGRESS' ? Clock :
    ticket.status === 'RESOLVED' ? CheckCircle2 : Archive;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <PageHeader
        backHref="/tickets"
        backLabel="Tickets"
        eyebrow={<span className="font-mono normal-case tracking-normal">{ticket.id}</span>}
        title={ticket.reason}
        meta={
          <>
            <span className={clsx('badge', getStatusColor(ticket.status))}>
              <StatusIcon className="h-3 w-3" />
              {t(ticket.status)}
            </span>
            <span className={clsx('badge', getStatusColor(ticket.priority))}>Prioridad {t(ticket.priority).toLowerCase()}</span>
            <span className="text-xs text-muted-foreground tabular">Creado {new Date(ticket.createdAt).toLocaleString('es-AR')}</span>
          </>
        }
        actions={
          <>
            <button onClick={() => setShowStatusModal(true)} className="btn-outline">
              <RefreshCw className="h-4 w-4" />
              Cambiar estado
            </button>
            {isActive && (
              <button onClick={handleRegisterRepair} disabled={isSettingRepair} className="btn-primary">
                {isSettingRepair ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Registrar reparación
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Detalle">
            {ticket.description && (
              <p className="mb-5 whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed">
                {ticket.description}
              </p>
            )}
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="eyebrow">Activo</dt>
                <dd className="mt-1">
                  {ticket.dispenser ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dispensers/${ticket.dispenser.id}`} className="font-mono font-medium text-primary hover:underline">
                          {ticket.dispenser.id}
                        </Link>
                        {ticket.dispenser.equipmentType && (
                          <span className="badge-neutral">{getEquipmentTypeLabel(ticket.dispenser.equipmentType)}</span>
                        )}
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
                      <div>
                        <p className="font-medium">{loc.plant?.nombre}</p>
                        <p className="text-muted-foreground">{loc.sector?.nombre ? `${loc.sector.nombre} · ` : ''}{loc.nombre}</p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Sin ubicación</span>
                  )}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title={<>Comentarios <span className="font-normal text-muted-foreground tabular">({ticket.comments?.length || 0})</span></>} flush>
            <div className="max-h-[520px] space-y-3 overflow-y-auto p-4 custom-scrollbar sm:p-5">
              {!ticket.comments || ticket.comments.length === 0 ? (
                <p className="rounded-md border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  Todavía no hay comentarios.
                </p>
              ) : (
                ticket.comments.map((comment: any) => (
                  <div key={comment.id} className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold">{comment.user?.nombre} {comment.user?.apellido}</span>
                      <span className="text-2xs text-muted-foreground tabular">{new Date(comment.createdAt).toLocaleString('es-AR')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.message}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-end gap-2 border-t border-border p-3">
              <textarea
                className="textarea max-h-32 min-h-[44px] flex-1 resize-none py-2.5 sm:min-h-[40px]"
                placeholder="Escribir un comentario o actualización…"
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
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="SLA">
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Vencimiento respuesta</dt>
                <dd className={clsx('text-right tabular', ticket.slaResponseBreached && 'font-medium text-destructive')}>
                  {ticket.slaResponseDeadline ? new Date(ticket.slaResponseDeadline).toLocaleString('es-AR') : '—'}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Vencimiento resolución</dt>
                <dd className={clsx('text-right tabular', ticket.slaResolutionBreached && 'font-medium text-destructive')}>
                  {ticket.slaResolutionDeadline ? new Date(ticket.slaResolutionDeadline).toLocaleString('es-AR') : '—'}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Historial de estados">
            {ticket.statusHistory?.length ? (
              <ol className="space-y-4">
                {ticket.statusHistory.map((hist: any, index: number) => (
                  <li key={hist.id} className="relative pl-5">
                    {index !== ticket.statusHistory.length - 1 && (
                      <span className="absolute bottom-[-18px] left-[3px] top-4 w-px bg-border" aria-hidden="true" />
                    )}
                    <span className="absolute left-0 top-1.5 h-[7px] w-[7px] rounded-full bg-primary" aria-hidden="true" />
                    <p className="text-sm font-medium">{t(hist.toStatus)}</p>
                    <p className="text-xs text-muted-foreground tabular">{hist.changedBy} · {new Date(hist.changedAt).toLocaleString('es-AR')}</p>
                    {hist.notes && <p className="mt-0.5 text-xs text-muted-foreground">“{hist.notes}”</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>
            )}
          </Panel>
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <StatusModal 
          ticket={ticket} 
          onClose={() => setShowStatusModal(false)} 
          onSuccess={() => { setShowStatusModal(false); fetchTicket(); }} 
        />
      )}

      {/* Repair Modal */}
      {showRepairModal && (
        <RepairModal 
          ticket={ticket} 
          onClose={() => setShowRepairModal(false)} 
          onSuccess={() => { setShowRepairModal(false); fetchTicket(); }} 
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
      <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
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
