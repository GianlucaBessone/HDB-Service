'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  X, Ticket, GlassWater, MapPin, MessageSquare, Clock,
  CheckCircle2, Archive, Send, Loader2, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import RepairModal from '@/components/RepairModal';
import ConfirmModal from '@/components/ConfirmModal';

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

  const handleRegisterRepair = async () => {
    if (!ticket?.dispenser) return toast.error('No hay dispenser asociado');

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
      await refetch();
      onUpdate();
      setShowRepairModal(true);
    } catch {
      toast.error('Error al actualizar dispenser');
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
      <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse p-6">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Cargando ticket...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background border-l border-border shadow-2xl absolute md:relative top-0 right-0 w-full md:w-auto z-50">
      
      {/* Header Sticky */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/20 shrink-0 sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground shrink-0" title="Cerrar panel">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <span className="font-mono text-sm font-semibold text-primary block truncate">Ticket: {ticket.id}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pb-24">
        {/* Ticket Summary */}
        <div className="space-y-4">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight leading-tight">{ticket.reason}</h1>
          <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
            <span className={clsx('badge text-xs', getStatusColor(ticket.priority))}>{t(ticket.priority)}</span>
            <span className={clsx('badge text-xs', getStatusColor(ticket.status))}>
              {ticket.status === 'OPEN' ? <Ticket className="w-3.5 h-3.5 mr-1"/> :
               ticket.status === 'IN_PROGRESS' ? <Clock className="w-3.5 h-3.5 mr-1"/> :
               ticket.status === 'RESOLVED' ? <CheckCircle2 className="w-3.5 h-3.5 mr-1"/> :
               <Archive className="w-3.5 h-3.5 mr-1"/>}
              {t(ticket.status)}
            </span>
            <span className="text-xs">Creado: {new Date(ticket.createdAt).toLocaleDateString('es-AR')}</span>
          </div>

          <div className="flex flex-wrap items-start gap-2 pt-2">
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <button 
                onClick={handleRegisterRepair} 
                disabled={isSettingRepair}
                className="btn-primary btn-sm gap-2 w-full md:w-auto justify-center"
              >
                {isSettingRepair ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Registrar Reparación
              </button>
            )}
            <button onClick={() => setShowStatusModal(true)} className="btn-outline btn-sm gap-2 w-full md:w-auto justify-center">
              <RefreshCw className="w-4 h-4" />
              Cambiar Estado
            </button>
          </div>

          {ticket.description && (
            <div className="p-4 bg-muted/30 rounded-lg text-sm border mt-4">
              {ticket.description}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
            {/* Creator Info */}
            <div className="flex gap-3 md:col-span-2">
              <div className="p-2 bg-primary/10 rounded-lg h-min shrink-0">
                <Ticket className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Creado por</p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-0.5">
                  <p className="font-semibold">{ticket.reportedBy?.nombre || 'Usuario Desconocido'}</p>
                  <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                  <div className="flex items-center gap-2 text-xs">
                    {ticket.wantsPushNotifications ? (
                      <span className="text-primary font-medium flex items-center gap-1">Notificaciones: Activadas</span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">Notificaciones: Desactivadas</span>
                    )}
                    {ticket.wantsEmailNotifications && (
                      <span className="text-primary font-medium"> (Email)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Equipment Info */}
            <div className="flex gap-3 mt-2">
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
            <div className="flex gap-3 mt-2">
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

        {/* Chat / Comments Section */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col h-[500px]">
          <h3 className="font-semibold text-lg flex items-center gap-2 mb-4 shrink-0">
            <MessageSquare className="w-5 h-5 text-primary" />
            Comentarios y Notas
          </h3>
          
          <div className="flex-1 space-y-4 pr-2 custom-scrollbar pb-4 overflow-y-auto flex flex-col">
            {ticket.comments?.length === 0 || !ticket.comments ? (
              <div className="text-center text-muted-foreground italic py-8 flex-1 flex items-center justify-center">
                Aún no hay comentarios en este ticket.
              </div>
            ) : (
              ticket.comments?.map((comment: any) => {
                const isMe = comment.userId === session?.user?.id;
                return (
                  <div 
                    key={comment.id} 
                    className={clsx(
                      "flex flex-col max-w-[85%] rounded-2xl p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300",
                      isMe 
                        ? "ml-auto bg-primary text-primary-foreground rounded-tr-none" 
                        : "mr-auto bg-muted border border-border rounded-tl-none"
                    )}
                  >
                    <div className="flex justify-between items-center gap-4 mb-1">
                      <span className={clsx(
                        "text-[10px] font-bold uppercase tracking-wider",
                        isMe ? "text-primary-foreground/80" : "text-primary"
                      )}>
                        {comment.user?.nombre} {comment.user?.apellido} • {t(comment.user?.role)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{comment.message}</p>
                    <span className={clsx(
                      "text-[9px] mt-1 self-end opacity-70 font-mono",
                      isMe ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {new Date(comment.createdAt).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* New Comment Input */}
          <div className="pt-4 flex gap-2 shrink-0 bg-background/50 backdrop-blur-sm mt-auto">
            <textarea
              className="textarea flex-1 min-h-[44px] max-h-32 py-2.5 resize-none shadow-inner"
              placeholder="Escribe un comentario..."
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
              className="btn-primary h-11 px-5 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>

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
      <div className="modal-overlay z-[60]" onClick={onClose}>
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
