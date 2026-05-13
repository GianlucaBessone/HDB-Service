'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Ticket, GlassWater, MapPin, MessageSquare, Clock,
  CheckCircle2, Archive, Send, Loader2, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
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
    if (!ticket.dispenser) return toast.error('No hay dispenser asociado');

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
      toast.success('Dispenser movido a Reparación');
      await fetchTicket();
      setShowRepairModal(true);
    } catch {
      toast.error('Error al actualizar dispenser');
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

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/tickets" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Tickets
        </Link>
        <span>/</span>
        <span className="text-foreground font-mono">{ticket.id}</span>
      </div>

      {/* Header Info */}
      <div className="glass-card p-6 border-t-4 border-t-primary">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{ticket.reason}</h1>
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
              <span className={clsx('badge text-xs', getStatusColor(ticket.priority))}>{t(ticket.priority)}</span>
              <span>·</span>
              <span className={clsx('badge text-xs', getStatusColor(ticket.status))}>
                {ticket.status === 'OPEN' ? <Ticket className="w-3.5 h-3.5 mr-1"/> :
                 ticket.status === 'IN_PROGRESS' ? <Clock className="w-3.5 h-3.5 mr-1"/> :
                 ticket.status === 'RESOLVED' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> :
                 <Archive className="w-3.5 h-3.5 mr-1"/>}
                {t(ticket.status)}
              </span>
              <span>·</span>
              <span>Creado: {new Date(ticket.createdAt).toLocaleString('es-AR')}</span>
            </div>
          </div>
          <div className="shrink-0 flex flex-wrap items-start gap-2">
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button 
                onClick={handleRegisterRepair} 
                disabled={isSettingRepair}
                className="btn-primary btn-sm gap-2"
              >
                {isSettingRepair ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Registrar Reparación
              </button>
            )}
            <button onClick={() => setShowStatusModal(true)} className="btn-outline btn-sm gap-2">
              <RefreshCw className="w-4 h-4" />
              Cambiar Estado
            </button>
          </div>
        </div>

        {ticket.description && (
          <div className="mt-6 p-4 bg-muted/30 rounded-lg text-sm border">
            {ticket.description}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
          {/* Equipment Info */}
          <div className="flex gap-3">
            <div className="p-2 bg-primary/10 rounded-lg h-min shrink-0">
              <GlassWater className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Equipo Afectado</p>
              {ticket.dispenser ? (
                <>
                  <Link href={`/dispensers/${ticket.dispenser.id}`} className="font-semibold text-primary hover:underline block mt-0.5">
                    {ticket.dispenser.id}
                  </Link>
                  <p className="text-sm mt-0.5">{ticket.dispenser.marca} {ticket.dispenser.modelo}</p>
                </>
              ) : (
                <p className="text-sm italic mt-0.5">Ninguno</p>
              )}
            </div>
          </div>

          {/* Location Info */}
          <div className="flex gap-3">
            <div className="p-2 bg-primary/10 rounded-lg h-min shrink-0">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Ubicación</p>
              {ticket.dispenser?.status === 'UNDER_REPAIR' ? (
                <div className="mt-0.5">
                  <p className="font-semibold text-amber-600">En Taller / Reparación</p>
                  <p className="text-xs text-muted-foreground">Retirado de: {ticket.location?.nombre || ticket.location?.plant?.nombre || 'Ubicación original'}</p>
                </div>
              ) : (ticket.location || ticket.dispenser?.location) ? (
                <>
                  <p className="font-semibold block mt-0.5">{(ticket.location || ticket.dispenser?.location).plant?.nombre}</p>
                  <p className="text-sm mt-0.5">
                    {(ticket.location || ticket.dispenser?.location).sector?.nombre ? `${(ticket.location || ticket.dispenser?.location).sector.nombre} — ` : ''}
                    {(ticket.location || ticket.dispenser?.location).nombre}
                  </p>
                </>
              ) : (
                <p className="text-sm italic mt-0.5">Desconocida</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat / Comments Section */}
        <div className="lg:col-span-2 glass-card p-6 flex flex-col h-[600px]">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
            Comentarios y Notas
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-4">
            {ticket.comments?.length === 0 ? (
              <div className="text-center text-muted-foreground italic py-10">
                Aún no hay comentarios en este ticket.
              </div>
            ) : (
              ticket.comments?.map((comment: any) => (
                <div key={comment.id} className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-primary">{comment.user?.nombre} {comment.user?.apellido}</span>
                    <span className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString('es-AR')}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                </div>
              ))
            )}
          </div>

          {/* New Comment Input */}
          <div className="pt-4 mt-auto border-t border-border shrink-0 flex gap-2">
            <textarea
              className="textarea flex-1 min-h-[44px] max-h-32 py-2.5"
              placeholder="Escribe un comentario o actualización..."
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
              className="btn-primary h-auto px-4"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Métricas SLA</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venc. Respuesta</span>
                <span className={clsx(ticket.slaResponseBreached ? 'text-red-500 font-medium' : '')}>
                  {ticket.slaResponseDeadline ? new Date(ticket.slaResponseDeadline).toLocaleString('es-AR') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venc. Resolución</span>
                <span className={clsx(ticket.slaResolutionBreached ? 'text-red-500 font-medium' : '')}>
                  {ticket.slaResolutionDeadline ? new Date(ticket.slaResolutionDeadline).toLocaleString('es-AR') : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Historial de Estados</h3>
            <div className="space-y-4">
              {ticket.statusHistory?.map((hist: any, index: number) => {
                return (
                  <div key={hist.id} className="relative pl-6">
                    {/* Vertical line connector */}
                    {index !== ticket.statusHistory.length - 1 && (
                      <div className="absolute left-2.5 top-5 bottom-[-20px] w-0.5 bg-border" />
                    )}
                    <div className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-sm font-medium">{t(hist.toStatus)}</p>
                    <p className="text-xs text-muted-foreground">{hist.changedBy} · {new Date(hist.changedAt).toLocaleString('es-AR')}</p>
                    {hist.notes && <p className="text-xs italic mt-0.5 text-muted-foreground">"{hist.notes}"</p>}
                  </div>
                );
              })}
            </div>
          </div>
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
          title="Pasar a Reparación"
          description='El dispenser no está en estado "En Reparación". ¿Desea pasarlo a Reparación ahora? (Esto lo sacará de su ubicación actual)'
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
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="text-lg font-semibold">Actualizar Estado</h2>
          </div>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Nuevo Estado</label>
              <select className="select mt-1" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="OPEN">Abierto</option>
                <option value="IN_PROGRESS">En Progreso</option>
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
          description="¿Desea cerrar el ticket sin resolverlo? Esto se le informará al solicitante y al supervisor."
          confirmLabel="Cerrar Ticket"
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
