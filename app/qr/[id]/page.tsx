'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Cargando ficha rápida del activo...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 glass-card text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">Activo no encontrado</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <button
          onClick={() => router.push('/qr/scan')}
          className="btn-primary w-full py-2.5 text-sm"
        >
          Volver a Escanear
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
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> En Servicio</span>;
      case 'EN_REPARACION':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20"><span className="w-2 h-2 rounded-full bg-amber-500"></span> En Taller / Reparación</span>;
      case 'BLOQUEADO':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20"><span className="w-2 h-2 rounded-full bg-red-500"></span> Fuera de Servicio / Bloqueado</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground">{status}</span>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in px-4">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={() => router.push('/qr/scan')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-medium p-1"
        >
          <ArrowLeft className="w-4 h-4" /> Escáner QR
        </button>
        <span className="text-xs uppercase font-bold tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          Ficha Rápida en Planta
        </span>
      </div>

      {/* Main Asset Header Card */}
      <div className="glass-card p-5 md:p-6 space-y-4 relative overflow-hidden border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <AssetIcon className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">{equipment.id}</h1>
              </div>
              <p className="text-sm font-semibold text-foreground/90">
                {equipment.marca} {equipment.modelo}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {typeLabel}
              </p>
            </div>
          </div>
          <div>
            {getStatusBadge(equipment.status)}
          </div>
        </div>

        {/* Location pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs border-t border-border/60">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">
              {equipment.location?.plant?.client?.nombre || 'Cliente General'} &bull; {equipment.location?.plant?.nombre || 'Planta'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate font-medium text-foreground">
              {equipment.location?.nombre || 'Sin ubicación específica'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Action Buttons (Touch-friendly 1-Tap) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Acciones Operativas Inmediatas
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Action 1: Iniciar Mantenimiento */}
          <Link
            href={`/maintenance?equipmentId=${equipment.id}`}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-primary hover:shadow-lg transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                Mantenimiento Técnico
              </h3>
              <p className="text-xs text-muted-foreground">
                Completar checklist y protocolo de servicio
              </p>
            </div>
          </Link>

          {/* Action 2: Reportar Falla */}
          <button
            onClick={() => setIsTicketModalOpen(true)}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-amber-500 hover:shadow-lg transition-all flex items-center gap-4 group text-left w-full"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-amber-500 transition-colors">
                Reportar Falla / Ticket
              </h3>
              <p className="text-xs text-muted-foreground">
                Avería, pérdida, alarma o sonido anormal
              </p>
            </div>
          </button>

          {/* Action 3: Registrar Mediciones */}
          <button
            onClick={() => setIsMeasurementModalOpen(true)}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-emerald-500 hover:shadow-lg transition-all flex items-center gap-4 group text-left w-full"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-500 transition-colors">
                Asentar Mediciones
              </h3>
              <p className="text-xs text-muted-foreground">
                Presiones, temperaturas y amperajes
              </p>
            </div>
          </button>

          {/* Action 4: Ficha Completa Desktop */}
          <Link
            href={`/dispensers/${equipment.id}`}
            className="p-4 rounded-2xl bg-card border border-border/80 hover:border-purple-500 hover:shadow-lg transition-all flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground group-hover:text-purple-500 transition-colors flex items-center gap-1.5">
                Ficha Completa <ExternalLink className="w-3.5 h-3.5" />
              </h3>
              <p className="text-xs text-muted-foreground">
                Historial de sanitizaciones, repuestos y QR PDF
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Technical Specifications Glance */}
      {equipment.technicalSpecs && Object.keys(equipment.technicalSpecs).length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Especificaciones Técnicas del Equipo
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(equipment.technicalSpecs)
              .filter(([k]) => k !== 'lastFieldReadings')
              .map(([key, value]: [string, any]) => (
                <div key={key} className="p-2.5 rounded-xl bg-muted/40 border border-border/50">
                  <span className="text-[11px] text-muted-foreground capitalize block truncate">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="font-bold text-foreground truncate block">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* QUICK TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-lg text-foreground">Reportar Falla en {equipment.id}</h3>
              </div>
              <button onClick={() => setIsTicketModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickTicket} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Problema o Síntoma Detectado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. No enfría / Pérdida de agua / Alarma de presión"
                  value={ticketTitle}
                  onChange={e => setTicketTitle(e.target.value)}
                  className="input w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Severidad / Prioridad
                </label>
                <select
                  value={ticketPriority}
                  onChange={e => setTicketPriority(e.target.value)}
                  className="select w-full text-sm"
                >
                  <option value="LOW">Baja (No urgente)</option>
                  <option value="MEDIUM">Media (Falla parcial)</option>
                  <option value="HIGH">Alta (Afecta operatividad)</option>
                  <option value="CRITICAL">Crítica (Parada de planta / Cadena de frío)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Detalles Adicionales (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Indica códigos de error o circunstancias de la falla..."
                  value={ticketDescription}
                  onChange={e => setTicketDescription(e.target.value)}
                  className="textarea w-full text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(false)}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  {submittingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Crear Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MEASUREMENTS MODAL */}
      {isMeasurementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-500">
                <Gauge className="w-5 h-5" />
                <h3 className="font-bold text-lg text-foreground">Mediciones Operativas</h3>
              </div>
              <button onClick={() => setIsMeasurementModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeasurements} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Presión Succión (PSI)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 115"
                    value={measurementData.presionSuccionPsi || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, presionSuccionPsi: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Presión Alta (PSI)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 320"
                    value={measurementData.presionAltaPsi || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, presionAltaPsi: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Temperatura (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. -18.0 o 12.5"
                    value={measurementData.temperaturaC || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, temperaturaC: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">
                    Consumo (Amperes)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej. 8.2"
                    value={measurementData.corrienteA || ''}
                    onChange={e => setMeasurementData(prev => ({ ...prev, corrienteA: e.target.value }))}
                    className="input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Notas de Calibración
                </label>
                <input
                  type="text"
                  placeholder="Ej. Manómetro calibrado, carga de gas estable"
                  value={measurementData.notas || ''}
                  onChange={e => setMeasurementData(prev => ({ ...prev, notas: e.target.value }))}
                  className="input w-full text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMeasurementModalOpen(false)}
                  className="btn-secondary flex-1 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMeasurements}
                  className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2"
                >
                  {savingMeasurements ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Guardar Lecturas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
