'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, QrCode, Ticket, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import ReasonCombobox from './ReasonCombobox';
import { extractDispenserId } from '@/lib/qr';

interface CreateTicketModalProps {
  initialDispenserId?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTicketModal({ initialDispenserId = '', onClose, onCreated }: CreateTicketModalProps) {
  const [form, setForm] = useState({ 
    dispenserId: initialDispenserId, 
    reason: '', 
    description: '', 
    priority: 'MEDIUM' 
  });
  const [saving, setSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" />
            Nuevo Ticket de Soporte
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Equipo (ID Dispenser) *</label>
              <div className="flex gap-2">
                <input
                  className="input uppercase flex-1 font-mono font-bold"
                  placeholder="DISP-XXXX"
                  value={form.dispenserId}
                  onChange={e => setForm(p => ({ ...p, dispenserId: e.target.value.toUpperCase() }))}
                  required
                />
                {!initialDispenserId && (
                  <button 
                    type="button" 
                    onClick={() => setIsScanning(!isScanning)}
                    className={clsx('p-2 h-10 w-10 rounded-lg border flex items-center justify-center transition-all', isScanning ? 'bg-primary/10 text-primary border-primary/50' : 'btn-outline')}
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                )}
              </div>
              {isScanning && (
                <div className="mt-3 border rounded-xl overflow-hidden bg-black aspect-square max-w-[250px] mx-auto">
                  <div id="reader" className="w-full"></div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Motivo *</label>
              <ReasonCombobox
                value={form.reason}
                onChange={(val: string) => setForm(p => ({ ...p, reason: val }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Descripción</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Detalles adicionales del problema..."
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Prioridad</label>
              <div className="grid grid-cols-2 gap-2">
                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={clsx(
                      'px-3 py-2 rounded-lg border text-xs font-bold transition-all',
                      form.priority === p 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {p === 'LOW' ? 'Baja' : p === 'MEDIUM' ? 'Media' : p === 'HIGH' ? 'Alta' : 'Crítica'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2 px-6">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              Crear Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
