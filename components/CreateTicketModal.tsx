'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, QrCode, Ticket, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Switch from '@/components/ui/Switch';
import { enablePush } from '@/lib/pushClient';
import ReasonCombobox from './ReasonCombobox';
import { extractDispenserId } from '@/lib/qr';

interface CreateTicketModalProps {
  initialDispenserId?: string;
  onClose: () => void;
  onCreated: () => void;
}

import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';
import { EquipmentType } from '@prisma/client';

export default function CreateTicketModal({ initialDispenserId = '', onClose, onCreated }: CreateTicketModalProps) {
  const [form, setForm] = useState({ 
    dispenserId: initialDispenserId, 
    reason: '', 
    description: '', 
    priority: 'MEDIUM',
    wantsPushNotifications: false,
    wantsEmailNotifications: false
  });
  const [saving, setSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedAsset, setDetectedAsset] = useState<any>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  useEffect(() => {
    if (!form.dispenserId || form.dispenserId.length < 3) {
      setDetectedAsset(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingAsset(true);
      try {
        const res = await fetch(`/api/dispensers/${encodeURIComponent(form.dispenserId)}`);
        if (res.ok) {
          const data = await res.json();
          setDetectedAsset(data);
          if (data.criticality === 'CRITICAL') {
            setForm(f => ({ ...f, priority: 'CRITICAL' }));
          } else if (data.criticality === 'HIGH') {
            setForm(f => f.priority === 'MEDIUM' ? { ...f, priority: 'HIGH' } : f);
          }
        } else {
          setDetectedAsset(null);
        }
      } catch {
        setDetectedAsset(null);
      } finally {
        setLoadingAsset(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [form.dispenserId]);

  useEffect(() => {
    if (!isScanning) return;
    
    let html5QrCode: any = null;
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          const scannedId = extractDispenserId(decodedText);
          if (scannedId) {
            setForm(p => ({ ...p, dispenserId: scannedId }));
          } else {
            setForm(p => ({ ...p, dispenserId: decodedText.toUpperCase() }));
          }
          setIsScanning(false);
          html5QrCode.stop().catch(console.error);
        },
        () => {}
      ).catch((err: any) => {
        console.error(err);
        toast.error('Error al acceder a la cámara. Revisa los permisos.');
        setIsScanning(false);
      });
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al crear ticket');
        return;
      }
      toast.success('Ticket creado exitosamente');
      onCreated();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo ticket</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label mb-1.5">ID del activo <span className="text-destructive">*</span></label>
              <div className="flex gap-2">
                <input
                  className="input uppercase flex-1 font-mono font-bold"
                  placeholder="Ej: AA-01, CF-002, DISP-01..."
                  value={form.dispenserId}
                  onChange={e => setForm(p => ({ ...p, dispenserId: e.target.value.toUpperCase() }))}
                  required
                />
                {!initialDispenserId && (
                  <button 
                    type="button" 
                    onClick={() => setIsScanning(!isScanning)}
                    className={clsx('btn-icon border', isScanning ? 'bg-primary/10 text-primary border-primary/40' : 'btn-outline')}
                    aria-label="Escanear QR"
                    title="Escanear QR"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                )}
              </div>
              {isScanning && (
                <div className="mx-auto mt-3 aspect-square max-w-[260px] overflow-hidden rounded-lg border border-border bg-black">
                  <div id="reader" className="w-full"></div>
                </div>
              )}
              {detectedAsset && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/50 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getEquipmentTypeIcon(detectedAsset.equipmentType);
                      return <Icon className="w-4 h-4 text-primary shrink-0" />;
                    })()}
                    <div>
                      <span className="font-bold text-foreground">
                        {getEquipmentTypeLabel(detectedAsset.equipmentType)}
                      </span>
                      <span className="text-muted-foreground ml-1.5">
                        {detectedAsset.marca} {detectedAsset.modelo}
                      </span>
                      {detectedAsset.location?.nombre && (
                        <p className="text-2xs text-muted-foreground">
                          {detectedAsset.location.plant?.nombre} — {detectedAsset.location.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                  {detectedAsset.criticality && (
                    <span className={clsx(
                      'badge',
                      detectedAsset.criticality === 'CRITICAL' ? 'bg-destructive/10 text-destructive' :
                      detectedAsset.criticality === 'HIGH' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {detectedAsset.criticality}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="label mb-1.5">Motivo <span className="text-destructive">*</span></label>
              <ReasonCombobox
                value={form.reason}
                onChange={(val: string) => setForm(p => ({ ...p, reason: val }))}
                equipmentType={detectedAsset?.equipmentType}
              />
            </div>
            <div>
              <label className="label mb-1.5">Descripción</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Detalle del problema, síntomas, horario…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="label mb-1.5">Prioridad</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                    aria-pressed={form.priority === p}
                    className={clsx(
                      'min-h-[40px] rounded-md border px-3 text-sm font-medium transition-colors sm:min-h-[36px]',
                      form.priority === p
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {p === 'LOW' ? 'Baja' : p === 'MEDIUM' ? 'Media' : p === 'HIGH' ? 'Alta' : 'Crítica'}
                  </button>
                ))}
              </div>
            </div>

            {/* Preferencias de notificación */}
            <div className="space-y-3 border-t border-border pt-4">
              <Switch
                id="toggle-push"
                label="Recibir notificaciones de este ticket"
                checked={form.wantsPushNotifications}
                onChange={(checked) => {
                  setForm(p => ({ ...p, wantsPushNotifications: checked }));
                  if (checked) {
                    enablePush().then(state => {
                      if (state === 'denied') toast.error('El navegador bloqueó las notificaciones; vas a recibir los avisos dentro de la app.');
                      else if (state === 'unsupported') toast('Este dispositivo no admite notificaciones push; vas a ver los avisos dentro de la app.');
                    });
                  }
                }}
              />

              {form.wantsPushNotifications && (
                <div className="space-y-3 border-l-2 border-border pl-4">
                  <Switch
                    id="toggle-email"
                    label="También por correo electrónico"
                    checked={form.wantsEmailNotifications}
                    onChange={(checked) => setForm(p => ({ ...p, wantsEmailNotifications: checked }))}
                  />
                  <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-2.5 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <p>
                      Verificá que el navegador tenga permitidas las notificaciones.{' '}
                      <button type="button" onClick={() => enablePush()} className="font-medium text-primary underline-offset-2 hover:underline">
                        Activar permisos
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2 px-6">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              Crear ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
