'use client';

import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, Calendar, FileSignature, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MaintenanceApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/maintenance/approvals')
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setApprovals(data);
      })
      .catch(err => toast.error(err.message || 'Error al cargar historial'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileSignature className="w-7 h-7 text-primary" />
          </div>
          Historial de Firmas
        </h1>
        <p className="text-muted-foreground mt-1">Registro de conformidades de mantenimiento firmadas por clientes</p>
      </div>

      {approvals.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <ShieldCheck className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">No hay firmas registradas</p>
          <p className="text-sm mt-1">Los registros aparecerán aquí cuando los clientes completen la validación QR.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {approvals.map((approval) => (
            <div key={approval.id} className="glass-card p-5 flex flex-col gap-4">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-lg">{approval.customerName}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(approval.createdAt).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="bg-success/10 text-success p-1.5 rounded-full">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Data */}
              <div className="space-y-2 text-sm flex-1">
                {approval.customerIdentity && (
                  <p><span className="text-muted-foreground">DNI / ID:</span> {approval.customerIdentity}</p>
                )}
                <p><span className="text-muted-foreground">Técnico:</span> {approval.technician.nombre}</p>
                <p><span className="text-muted-foreground">Equipos Validados:</span> {approval.schedules.length}</p>

                <div className="mt-3 bg-muted/30 p-2.5 rounded-lg space-y-1.5 max-h-32 overflow-y-auto">
                  {approval.schedules.map((s: any) => (
                    <div key={s.id} className="flex flex-col text-xs">
                      <span className="font-semibold">{s.dispenser.id}</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {s.dispenser.location?.plant?.nombre} - {s.dispenser.location?.nombre}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature */}
              <div className="pt-3 border-t border-border mt-auto">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">Firma</span>
                <div className="bg-white border border-border rounded-lg p-2 h-24 flex items-center justify-center overflow-hidden">
                  <img 
                    src={approval.signatureData} 
                    alt={`Firma de ${approval.customerName}`} 
                    className="max-w-full max-h-full object-contain mix-blend-multiply" 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
