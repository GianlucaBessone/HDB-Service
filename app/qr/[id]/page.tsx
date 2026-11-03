'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
import { 
  ArrowLeft, 
  Wrench, 
  AlertTriangle, 
  Gauge, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Building2, 
  MapPin, 
  Layers, 
  Loader2, 
  Plus, 
  ExternalLink,
  ShieldCheck,
  Send,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';

export default function FieldEquipmentQuickHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [equipment, setEquipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Ticket Modal State
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Quick Measurement Modal State
  const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
  const [measurementData, setMeasurementData] = useState<Record<string, string>>({});
  const [savingMeasurements, setSavingMeasurements] = useState(false);

  useEffect(() => {
    async function loadEquipment() {
      try {
        setLoading(true);
        const res = await fetch(`/api/dispensers/${id}`);
        if (!res.ok) {
          throw new Error('Equipo no encontrado o fuera de servicio');
        }
        const data = await res.json();
        setEquipment(data.equipment || data.dispenser);
      } catch (err: any) {
        setError(err.message || 'Error al cargar información del activo');
      } finally {
        setLoading(false);
      }
    }
    loadEquipment();
  }, [id]);

  const handleCreateQuickTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) {
      toast.error('Por favor ingresa un título o descripción breve del problema');
      return;
    }

    try {
      setSubmittingTicket(true);
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: ticketTitle,
          description: ticketDescription || ticketTitle,
          priority: ticketPriority,
          dispenserId: id,
          locationId: equipment?.locationId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al generar el ticket');
      }

      const newTicket = await res.json();
      toast.success('¡Ticket generado exitosamente!');
      setIsTicketModalOpen(false);
      setTicketTitle('');
      setTicketDescription('');
      router.push(`/tickets/${newTicket.id}`);
    } catch (err: any) {
      toast.error(err.message || 'No se pudo crear el ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSaveMeasurements = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingMeasurements(true);
      const updatedSpecs = {
        ...(equipment.technicalSpecs || {}),
        lastFieldReadings: {
          ...measurementData,
          recordedAt: new Date().toISOString(),
        },
      };

      const res = await fetch(`/api/dispensers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicalSpecs: updatedSpecs,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar lecturas');
      toast.success('Parámetros y lecturas registrados');
      setIsMeasurementModalOpen(false);
      setEquipment((prev: any) => ({ ...prev, technicalSpecs: updatedSpecs }));
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSavingMeasurements(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p>Cargando ficha del activo…</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="glass-card mx-auto my-12 max-w-md space-y-3 p-6 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
        <h2 className="text-base font-semibold">Activo no encontrado</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push('/qr/scan')}
          className="btn-primary w-full"
        >
          Volver a escanear
        </button>
      </div>
    );
  }

  const equipmentType = equipment.equipmentType || 'DISPENSER';
  const AssetIcon = getEquipmentTypeIcon(equipmentType);
  const typeLabel = getEquipmentTypeLabel(equipmentType);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVO':
        return <span className="badge-success"><span className="status-dot bg-current" /> En servicio</span>;
      case 'EN_REPARACION':
        return <span className="badge-warning"><span className="status-dot bg-current" /> En taller</span>;
      case 'BLOQUEADO':
        return <span className="badge-danger"><span className="status-dot bg-current" /> Fuera de servicio</span>;
      default:
        return <span className="badge-neutral">{status}</span>;
    }
  };

  const actions = [
    { key: 'mtto', href: `/maintenance?equipmentId=${equipment.id}`, icon: Wrench, title: 'Mantenimiento', desc: 'Completar checklist y protocolo de servicio' },
    { key: 'ticket', onClick: () => setIsTicketModalOpen(true), icon: AlertTriangle, title: 'Reportar falla', desc: 'Avería, pérdida, alarma o ruido anormal' },
    { key: 'med', onClick: () => setIsMeasurementModalOpen(true), icon: Gauge, title: 'Registrar mediciones', desc: 'Presiones, temperaturas y corriente' },
    { key: 'ficha', href: `/dispensers/${equipment.id}`, icon: FileText, title: 'Ficha completa', desc: 'Historial, repuestos y QR en PDF' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <PageHeader
        backHref="/qr/scan"
        backLabel="Escáner"
        eyebrow={typeLabel}
        title={<span className="font-mono">{equipment.id}</span>}
        meta={
          <>
            {getStatusBadge(equipment.status)}
            <span className="text-[13px] text-muted-foreground">{equipment.marca} {equipment.modelo}</span>
          </>
        }
      />

      <div className="glass-card grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-2.5 p-3.5 text-[13px]">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{equipment.location?.plant?.client?.nombre || 'Cliente general'} · {equipment.location?.plant?.nombre || 'Planta'}</span>
        </div>
        <div className="flex items-center gap-2.5 p-3.5 text-[13px]">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{equipment.location?.nombre || 'Sin ubicación específica'}</span>
        </div>
      </div>

      <section>
        <h2 className="eyebrow mb-2 px-1">Acciones</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {actions.map(act => {
            const content = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                  <act.icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">{act.title}</span>
                  <span className="block text-xs text-muted-foreground">{act.desc}</span>
                </span>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </>
            );
            const cls = 'glass-card-hover flex min-h-[64px] w-full items-center gap-3 p-3.5 text-left';
            return act.href ? (
              <Link key={act.key} href={act.href} className={cls}>{content}</Link>
            ) : (
              <button key={act.key} onClick={act.onClick} className={cls}>{content}</button>
            );
          })}
        </div>
      </section>

      {equipment.technicalSpecs && Object.keys(equipment.technicalSpecs).length > 0 && (
        <section className="glass-card p-4">
          <h3 className="eyebrow mb-3">Especificaciones técnicas</h3>
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {Object.entries(equipment.technicalSpecs)
              .filter(([k]) => k !== 'lastFieldReadings')
              .map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-baseline justify-between gap-3 border-b border-border py-2 text-[13px]">
                  <dt className="truncate capitalize text-muted-foreground">{key.replace(/([A-Z])/g, ' $1')}</dt>
                  <dd className="truncate text-right font-medium tabular">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
                </div>
              ))}
          </dl>
        </section>
      )}

      {/* QUICK TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && setIsTicketModalOpen(false)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2>Reportar falla · <span className="font-mono">{equipment.id}</span></h2>
              <button onClick={() => setIsTicketModalOpen(false)} className="modal-close" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickTicket} className="modal-body space-y-4">
              <div>
                <label className="label mb-1.5">Problema o síntoma detectado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. No enfría / pérdida de agua / alarma de presión"
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label className="label mb-1.5">Severidad / prioridad</label>
                <select
                  value={ticketPriority}
                  onChange={e => setTicketPriority(e.target.value)}
                  className="select"
                >
                  <option value="LOW">Baja (no urgente)</option>
                  <option value="MEDIUM">Media (falla parcial)</option>
                  <option value="HIGH">Alta (afecta operatividad)</option>
                  <option value="CRITICAL">Crítica (parada de planta / cadena de frío)</option>
                </select>
              </div>

              <div>
                <label className="label mb-1.5">Detalles adicionales (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Códigos de error o circunstancias de la falla…"
                  value={ticketDescription}
                  onChange={e => setTicketDescription(e.target.value)}
                  className="textarea"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="btn-primary"
                >
                  {submittingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Crear ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MEASUREMENTS MODAL */}
      {isMeasurementModalOpen && (
        <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && setIsMeasurementModalOpen(false)}>
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2>Registrar mediciones</h2>
              <button onClick={() => setIsMeasurementModalOpen(false)} className="modal-close" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMeasurements} className="modal-body space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label mb-1.5">Presión de succión (PSI)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 115"
                    value={measurementData.presionSuccionPsi || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, presionSuccionPsi: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label mb-1.5">Presión de alta (PSI)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 320"
                    value={measurementData.presionAltaPsi || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, presionAltaPsi: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label mb-1.5">Temperatura (°C)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. -18.0 o 12.5"
                    value={measurementData.temperaturaC || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, temperaturaC: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label mb-1.5">Consumo (A)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 8.2"
                    value={measurementData.corrienteA || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, corrienteA: e.target.value }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label mb-1.5">Notas de calibración</label>
                <input
                  type="text"
                  placeholder="Ej. Manómetro calibrado, carga de gas estable"
                  value={measurementData.notas || ''}
                  onChange={e => setMeasurementData(prev => ({ ...prev, notas: e.target.value }))}
                  className="input"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsMeasurementModalOpen(false)}
                  className="btn-outline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMeasurements}
                  className="btn-primary"
                >
                  {savingMeasurements ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Guardar lecturas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
