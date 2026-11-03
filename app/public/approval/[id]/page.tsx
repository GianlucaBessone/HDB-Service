'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, MapPin, AlertTriangle, ShieldCheck, Lock, Gauge, ClipboardCheck } from 'lucide-react';
import PublicShell from '@/components/PublicShell';
import toast from 'react-hot-toast';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';

export default function PublicApprovalPage() {
  const params = useParams();
  const [approval, setApproval] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [customerName, setCustomerName] = useState('');
  const [customerIdentity, setCustomerIdentity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  useEffect(() => {
    fetch(`/api/public/approvals/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setApproval(data);
        if (data.signatureHash || data.signatureData) {
          setIsSuccess(true);
        }
      })
      .catch(err => {
        toast.error(err.message || 'No se pudo cargar la información');
      })
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      return toast.error('El nombre es obligatorio');
    }
    if (!customerIdentity.trim()) {
      return toast.error('El DNI/Identificación es obligatorio');
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/public/approvals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerIdentity,
          signatureData: null,
          deviceInfo: navigator.userAgent
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al enviar');
      }

      const responseData = await res.clone().json();
      const signatureHash = responseData.signatureHash;

      toast.success('Aprobación guardada con éxito');
      setIsSuccess(true);
      setShowSecurityModal(true);
      setApproval((prev: any) => ({ 
        ...prev, 
        customerName, 
        customerIdentity, 
        signatureHash 
      }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando…
      </div>
    );
  }

  if (!approval) {
    return (
      <PublicShell>
        <div className="glass-card mx-auto max-w-md p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-destructive" />
          <h1 className="text-base font-semibold">Enlace no válido o vencido</h1>
          <p className="mt-1 text-sm text-muted-foreground">No se encontró la aprobación solicitada.</p>
        </div>
      </PublicShell>
    );
  }

  const clientName = approval.schedules[0]?.dispenser?.location?.plant?.client?.nombre || 'Cliente';

  return (
    <PublicShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="eyebrow">{clientName}</p>
          <h1 className="text-xl font-semibold sm:text-2xl">Conformidad de mantenimiento</h1>
          <p className="text-sm text-muted-foreground">Revisá los servicios realizados y firmá en conformidad.</p>
          <p className="pt-1 text-[13px]"><span className="text-muted-foreground">Técnico:</span> <span className="font-medium">{approval.technician.nombre}</span></p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Activos intervenidos <span className="font-normal text-muted-foreground tabular">({approval.schedules.length})</span></h2>
          {approval.schedules.map((schedule: any) => (
            <div key={schedule.id} className="glass-card p-4 sm:p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const eqType = schedule.dispenser.equipmentType || 'DISPENSER';
                    const Icon = getEquipmentTypeIcon(eqType);
                    return <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />;
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-[15px] font-semibold">{schedule.dispenser.id}</h3>
                      <span className="badge-neutral">
                        {getEquipmentTypeLabel(schedule.dispenser.equipmentType || 'DISPENSER')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{schedule.dispenser.marca} {schedule.dispenser.modelo}</p>
                  </div>
                </div>
                <span className="badge-success">Completado</span>
              </div>
              <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{schedule.dispenser.location?.plant?.nombre}</span>
                  <br />
                  {schedule.dispenser.location?.sector?.nombre ? `${schedule.dispenser.location.sector.nombre} · ` : ''}
                  {schedule.dispenser.location?.nombre}
                </div>
              </div>

              {schedule.checklist && (
                <div className="text-sm space-y-3 border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condición general:</span>
                    <span className="font-medium">
                      {{
                        GOOD: 'Buena',
                        FAIR: 'Regular',
                        POOR: 'Mala',
                        CRITICAL: 'Crítica'
                      }[schedule.checklist.condicionGeneral as string] || schedule.checklist.condicionGeneral}
                    </span>
                  </div>

                  {/* Mediciones Técnicas */}
                  {schedule.checklist.measurements && Object.keys(schedule.checklist.measurements).length > 0 && (
                    <div className="space-y-2 rounded-md border border-border p-3">
                      <p className="eyebrow">Mediciones</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(schedule.checklist.measurements).map(([k, val]: [string, any]) => {
                          if (val === undefined || val === null || val === '') return null;
                          const labels: Record<string, string> = {
                            presionBajaPsi: 'Presión Succión: ' + val + ' PSI',
                            presionAltaPsi: 'Presión Descarga: ' + val + ' PSI',
                            corrienteCompresorA: 'Corriente Compresor: ' + val + ' A',
                            tempAmbienteC: 'Temp. Ambiente: ' + val + ' °C',
                            tempInyeccionC: 'Temp. Inyección: ' + val + ' °C',
                            saltoTermicoC: 'Salto Térmico: ' + val + ' °C',
                            tempCamaraC: 'Temp. Cámara: ' + val + ' °C',
                            tempEvaporadorC: 'Temp. Evaporador: ' + val + ' °C',
                            tempAguaFriaC: 'Temp. Frío: ' + val + ' °C',
                            tempAguaCalienteC: 'Temp. Calor: ' + val + ' °C',
                            presionEntradaBar: 'Presión Agua: ' + val + ' bar',
                            tdsSalidaPpm: 'TDS Filtrada: ' + val + ' ppm',
                            caudalM3h: 'Caudal: ' + val + ' m³/h',
                          };
                          return (
                            <span key={k} className="rounded border border-border bg-muted/40 p-1.5 text-2xs tabular">
                              {labels[k] || `${k}: ${val}`}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Puntos de control verificados */}
                  {schedule.checklist.checklistItems && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ClipboardCheck className="w-4 h-4 text-success" />
                      <span>
                        Protocolo verificado: {Object.values(schedule.checklist.checklistItems).filter(Boolean).length} puntos conformes
                      </span>
                    </div>
                  )}

                  {schedule.checklist.observaciones && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Observaciones:</span>
                      <span className="font-medium text-right max-w-[60%]">{schedule.checklist.observaciones}</span>
                    </div>
                  )}
                  {schedule.checklist.fallas && schedule.checklist.fallas.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Fallas detectadas:</span>
                      <div className="flex flex-wrap gap-1">
                        {schedule.checklist.fallas.map((f: string, i: number) => (
                          <span key={i} className="badge-danger">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Firma */}
        <div className="glass-card p-4 sm:p-6">
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="mx-auto h-8 w-8 text-success" />
              <h2 className="text-lg font-semibold">Conformidad registrada</h2>
              <p className="text-muted-foreground">Gracias por confirmar el servicio de mantenimiento.</p>
              
              <div className="mt-6 text-left border-t border-border pt-6 space-y-4">
                <div>
                  <p className="eyebrow">Firmado por</p>
                  <p className="text-base font-semibold">{approval.customerName}</p>
                  {approval.customerIdentity && <p className="text-sm text-muted-foreground">DNI/ID: {approval.customerIdentity}</p>}
                </div>
                {approval.signatureData && (
                  <div>
                    <p className="eyebrow mb-2">Firma</p>
                    <img src={approval.signatureData} alt="Firma del cliente" className="max-h-32 rounded-md border border-border bg-white object-contain" />
                  </div>
                )}
                {approval.signatureHash && (
                  <div className="mt-4 rounded-md border border-border bg-muted/40 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      <h3 className="text-sm font-semibold">Certificado digital SHA-512</h3>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-muted-foreground font-medium block">Hash:</span>
                        <code className="mt-1 block break-all rounded border border-border bg-card px-2 py-1">{approval.signatureHash}</code>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                         <div>
                           <span className="text-muted-foreground font-medium block">Fecha:</span>
                           <span className="font-medium">{new Date(approval.signedAt || new Date()).toLocaleString('es-AR')}</span>
                         </div>
                         <div>
                           <span className="text-muted-foreground font-medium block">IP:</span>
                           <span className="font-medium">{approval.ipAddress || 'Registrada'}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-base font-semibold">Firma de conformidad</h2>
              
              <div>
                <label className="label">Nombre completo *</label>
                <input 
                  type="text" 
                  className="input mt-1" 
                  placeholder="Ej. Juan Pérez"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">DNI / identificación *</label>
                <input 
                  type="text" 
                  className="input mt-1" 
                  placeholder="N.º de documento"
                  value={customerIdentity}
                  onChange={e => setCustomerIdentity(e.target.value)}
                />
              </div>

              <div>
                <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                  Al confirmar se genera un certificado digital y se deja constancia de que los trabajos detallados fueron realizados a satisfacción.
                </p>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary btn-lg w-full"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Confirmar y firmar digitalmente
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Modal de seguridad */}
      {showSecurityModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2>Firma digital aplicada</h2>
            </div>
            <div className="modal-body space-y-3 text-sm text-muted-foreground">
              <p>Tu conformidad quedó registrada con firma digital.</p>
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="mb-1 font-medium text-foreground">Huella del documento (SHA-512)</p>
                Se generó un hash único del documento. Cualquier modificación posterior de la información produciría un hash distinto y quedaría en evidencia.
              </div>
              <div className="rounded-md border border-border bg-muted/40 p-3">
                <p className="mb-1 font-medium text-foreground">Cifrado AES-256-GCM</p>
                La huella se protege con cifrado AES-256-GCM, un estándar ampliamente utilizado para proteger información sensible.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSecurityModal(false)} className="btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      )}
    </PublicShell>
  );
}
