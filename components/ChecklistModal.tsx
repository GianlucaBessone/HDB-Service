'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle, Package, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const COMMON_FAILURES = [
  'Pérdida de agua', 'Filtro saturado', 'Canilla rota/goteando', 
  'No enfría', 'No calienta', 'Ruido excesivo del motor', 'Cable dañado'
];

interface ChecklistModalProps {
  schedule: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChecklistModal({ schedule, onClose, onSuccess }: ChecklistModalProps) {
  const isReadOnly = schedule.status === 'COMPLETED' || schedule.status === 'SIGNED';
  const existing = schedule.checklist || {};

  const [condicionGeneral, setCondicionGeneral] = useState(existing.condicionGeneral || 'GOOD');
  const [fallas, setFallas] = useState<string[]>(existing.fallas || []);
  const [customFalla, setCustomFalla] = useState('');
  const [observaciones, setObservaciones] = useState(existing.observaciones || '');
  const [saving, setSaving] = useState(false);

  const [consumablesOptions, setConsumablesOptions] = useState<any[]>([]);
  const [consumablesUsed, setConsumablesUsed] = useState<any[]>([]);
  const [selectedConsumableJson, setSelectedConsumableJson] = useState('');

  useEffect(() => {
    if (isReadOnly || !schedule.dispenser?.location?.plantId) return;
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/stock/available?plantId=${schedule.dispenser.location.plantId}`);
        if (res.ok) {
          const data = await res.json();
          setConsumablesOptions(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStock();
  }, [schedule, isReadOnly]);

  const toggleFalla = (falla: string) => {
    if (isReadOnly) return;
    setFallas(prev => prev.includes(falla) ? prev.filter(f => f !== falla) : [...prev, falla]);
  };

  const addCustomFalla = () => {
    if (!customFalla.trim() || fallas.includes(customFalla.trim())) return;
    setFallas(prev => [...prev, customFalla.trim()]);
    setCustomFalla('');
  };

  const handleAddConsumable = () => {
    if (!selectedConsumableJson) return;
    const item = JSON.parse(selectedConsumableJson);
    const exists = item.type === 'SERIALIZED' 
      ? consumablesUsed.find(u => u.id === item.id)
      : consumablesUsed.find(u => u.materialCode === item.materialCode && u.type === 'BULK');

    if (exists) {
      toast.error('Este consumible ya está en la lista');
      return;
    }

    setConsumablesUsed(prev => [...prev, { ...item, cantidad: 1 }]);
    setSelectedConsumableJson('');
  };

  const removeConsumable = (index: number) => {
    setConsumablesUsed(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/maintenance/${schedule.id}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condicionGeneral, fallas, problemasEstructurales: [], observaciones, consumablesUsed }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }
      toast.success('Mantenimiento completado');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar reporte');
    } finally {
      setSaving(false);
    }
  };

  const allFailures = Array.from(new Set([...COMMON_FAILURES, ...fallas]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              {isReadOnly ? 'Reporte de Mantenimiento' : 'Checklist Preventivo'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Equipo: <span className="font-bold text-foreground">{schedule.dispenserId}</span> · {schedule.dispenser?.marca} {schedule.dispenser?.modelo}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Condición */}
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Condición General del Equipo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { val: 'GOOD', label: 'Buena', color: 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20' },
                { val: 'FAIR', label: 'Regular', color: 'border-sky-500 text-sky-700 bg-sky-50 dark:bg-sky-950/20' },
                { val: 'POOR', label: 'Mala', color: 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/20' },
                { val: 'CRITICAL', label: 'Crítica', color: 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/20' },
              ].map(c => (
                <button
                  key={c.val}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setCondicionGeneral(c.val)}
                  className={clsx(
                    'p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-1',
                    condicionGeneral === c.val ? c.color : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Consumibles Utilizados */}
          {!isReadOnly && consumablesOptions.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Package className="w-4 h-4 text-primary" />
                Consumibles e Insumos Utilizados
              </label>
              
              <div className="flex gap-2">
                <select 
                  className="select flex-1" 
                  value={selectedConsumableJson} 
                  onChange={e => setSelectedConsumableJson(e.target.value)}
                >
                  <option value="">-- Seleccionar de stock --</option>
                  {consumablesOptions.map((opt, i) => {
                    const isUsed = opt.type === 'SERIALIZED' 
                      ? consumablesUsed.some(u => u.id === opt.id)
                      : consumablesUsed.some(u => u.materialCode === opt.materialCode && u.type === 'BULK' && u.cantidad >= opt.maxQuantity);
                    return (
                      <option key={i} value={JSON.stringify(opt)} disabled={isUsed}>
                        {opt.label}
                      </option>
                    );
                  })}
                </select>
                <button type="button" onClick={handleAddConsumable} className="btn-outline px-4 shrink-0">Agregar</button>
              </div>

              {consumablesUsed.length > 0 && (
                <div className="space-y-2">
                  {consumablesUsed.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                      <div className="flex-1">
                        <p className="text-sm font-bold">{item.nombre}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {item.type === 'SERIALIZED' ? `S/N: ${item.uniqueId}` : `Código: ${item.materialCode}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {item.type === 'BULK' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-medium">Cantidad:</span>
                            <input 
                              type="number" 
                              min="1" 
                              max={item.maxQuantity} 
                              className="input p-1 h-8 w-16 text-center text-sm font-bold" 
                              value={item.cantidad}
                              onChange={(e) => {
                                const val = Math.min(item.maxQuantity, Math.max(1, parseInt(e.target.value) || 1));
                                setConsumablesUsed(prev => prev.map((u, i) => i === index ? { ...u, cantidad: val } : u));
                              }}
                            />
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded-md border border-primary/20 uppercase">Serializado</span>
                        )}
                        <button type="button" onClick={() => removeConsumable(index)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fallas estructuradas */}
          <div>
            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Checklist de Anomalías / Reparaciones
            </label>
            <div className="flex flex-wrap gap-2">
              {allFailures.map(f => (
                <button
                  key={f}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => toggleFalla(f)}
                  className={clsx(
                    'px-4 py-2 rounded-xl border text-sm transition-all',
                    fallas.includes(f) 
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                      : 'bg-muted/30 border-border hover:border-primary/30 text-muted-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {!isReadOnly && (
              <div className="flex items-center gap-2 mt-4">
                <input 
                  className="input flex-1" 
                  placeholder="Otra anomalía detectada..." 
                  value={customFalla}
                  onChange={e => setCustomFalla(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomFalla(); }}
                />
                <button type="button" onClick={addCustomFalla} className="btn-outline px-6">Agregar</button>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label className="text-sm font-semibold mb-2 block">Observaciones del Técnico</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Detalles adicionales, recomendaciones, etc..."
              value={observaciones}
              disabled={isReadOnly}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>
        </div>
        
        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-outline min-w-[120px]">{isReadOnly ? 'Cerrar' : 'Cancelar'}</button>
          {!isReadOnly && (
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="btn-primary min-w-[160px] gap-2 shadow-lg shadow-primary/20"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Finalizar Reporte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
