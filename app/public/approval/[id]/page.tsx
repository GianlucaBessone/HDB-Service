'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, Wrench, ShieldCheck, MapPin, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import SignatureCanvas from 'react-signature-canvas';

export default function PublicApprovalPage() {
  const params = useParams();
  const [approval, setApproval] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [customerName, setCustomerName] = useState('');
  const [customerIdentity, setCustomerIdentity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const sigCanvas = useRef<any>(null);

  useEffect(() => {
    fetch(`/api/public/approvals/${params.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setApproval(data);
        if (data.signatureData) {
          setIsSuccess(true);
        }
      })
      .catch(err => {
        toast.error(err.message || 'No se pudo cargar la información');
      })
      .finally(() => setIsLoading(false));
  }, [params.id]);

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      return toast.error('El nombre es obligatorio');
    }
    if (sigCanvas.current?.isEmpty()) {
      return toast.error('La firma es obligatoria');
    }

    setIsSubmitting(true);
    const signatureData = sigCanvas.current.getCanvas().toDataURL('image/png');

    try {
      const res = await fetch(`/api/public/approvals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerIdentity,
          signatureData
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al enviar');
      }

      toast.success('Aprobación guardada con éxito');
      setIsSuccess(true);
      setApproval((prev: any) => ({ ...prev, signatureData, customerName, customerIdentity }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-center p-6">
        <div>
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <h1 className="text-xl font-bold">Enlace no válido o expirado</h1>
          <p className="text-muted-foreground mt-2">No se encontró la aprobación solicitada.</p>
        </div>
      </div>
    );
  }

  const clientName = approval.schedules[0]?.dispenser?.location?.plant?.client?.nombre || 'Cliente';

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Validación de Mantenimiento</h1>
          <p className="text-muted-foreground mt-2">
            Por favor revise los servicios realizados y firme en conformidad.
          </p>
          <div className="mt-4 inline-block bg-muted px-4 py-2 rounded-lg text-sm font-medium">
            Técnico: {approval.technician.nombre}
          </div>
        </div>

        {/* List of Maintenances */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold px-1">Equipos Mantenidos ({approval.schedules.length})</h2>
          {approval.schedules.map((schedule: any) => (
            <div key={schedule.id} className="bg-card p-5 rounded-2xl shadow-sm border border-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg">{schedule.dispenser.id}</h3>
                  <p className="text-sm text-muted-foreground">{schedule.dispenser.marca} {schedule.dispenser.modelo}</p>
                </div>
                <span className="badge badge-success text-xs">Completado</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg mb-4">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{schedule.dispenser.location?.plant?.nombre}</span>
                  <br />
                  {schedule.dispenser.location?.sector?.nombre ? `${schedule.dispenser.location.sector.nombre} — ` : ''}
                  {schedule.dispenser.location?.nombre}
                </div>
              </div>

              {schedule.checklist && (
                <div className="text-sm space-y-2 border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Condición General:</span>
                    <span className="font-medium">
                      {{
                        GOOD: 'Buena',
                        FAIR: 'Regular',
                        POOR: 'Mala',
                        CRITICAL: 'Crítica'
                      }[schedule.checklist.condicionGeneral as string] || schedule.checklist.condicionGeneral}
                    </span>
                  </div>
                  {schedule.checklist.observaciones && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Observaciones:</span>
                      <span className="font-medium text-right max-w-[60%]">{schedule.checklist.observaciones}</span>
                    </div>
                  )}
                  {schedule.checklist.fallas && schedule.checklist.fallas.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Fallas Detectadas:</span>
                      <div className="flex flex-wrap gap-1">
                        {schedule.checklist.fallas.map((f: string, i: number) => (
                          <span key={i} className="bg-danger/10 text-danger px-2 py-0.5 rounded text-xs">
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

        {/* Signature Area */}
        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border">
          {isSuccess ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold">¡Aprobación Registrada!</h2>
              <p className="text-muted-foreground">Gracias por confirmar el servicio de mantenimiento.</p>
              
              <div className="mt-6 text-left border-t border-border pt-6 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-medium">Firmado por</label>
                  <p className="font-semibold text-lg">{approval.customerName}</p>
                  {approval.customerIdentity && <p className="text-sm text-muted-foreground">DNI/ID: {approval.customerIdentity}</p>}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-medium mb-2 block">Firma</label>
                  <img src={approval.signatureData} alt="Firma del cliente" className="border border-border rounded-xl max-h-32 object-contain bg-white" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-xl font-bold mb-4">Conformidad del Cliente</h2>
              
              <div>
                <label className="label">Nombre Completo *</label>
                <input 
                  type="text" 
                  className="input mt-1" 
                  placeholder="Ej. Juan Pérez"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">DNI / Identificación (Opcional)</label>
                <input 
                  type="text" 
                  className="input mt-1" 
                  placeholder="Nro de documento"
                  value={customerIdentity}
                  onChange={e => setCustomerIdentity(e.target.value)}
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="label">Firma Digital *</label>
                  <button onClick={handleClearSignature} type="button" className="text-xs text-primary hover:underline">
                    Borrar firma
                  </button>
                </div>
                <div className="border border-border rounded-xl bg-white overflow-hidden">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{ className: 'w-full h-40' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Al firmar, usted confirma que los trabajos detallados han sido realizados a su satisfacción.
                </p>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary w-full py-3 text-lg mt-6"
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Confirmar y Enviar'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
