'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Wrench, Package, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface RepairModalProps {
  ticket: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RepairModal({ ticket, onClose, onSuccess }: RepairModalProps) {
  const [descripcion, setDescripcion] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingStock, setLoadingStock] = useState(true);

  const [consumablesOptions, setConsumablesOptions] = useState<any[]>([]);
  const [consumablesUsed, setConsumablesUsed] = useState<any[]>([]);
  const [selectedConsumableJson, setSelectedConsumableJson] = useState('');

  const plantId = ticket.location?.plantId || ticket.dispenser?.location?.plantId;

  useEffect(() => {
    if (!plantId) {
      setLoadingStock(false);
      return;
    }
    const fetchStock = async () => {
      try {
        const res = await fetch(`/api/stock/available?plantId=${plantId}`);
        if (res.ok) {
          const data = await res.json();
          setConsumablesOptions(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStock(false);
      }
    };
    fetchStock();
  }, [plantId]);

  const handleAddConsumable = () => {
    if (!selectedConsumableJson) return;
    const item = JSON.parse(selectedConsumableJson);
    const exists = item.type === 'SERIALIZED' 
      ? consumablesUsed.find(u => u.id === item.id)
      : consumablesUsed.find(u => u.materialCode === item.materialCode && u.type === 'BULK');

    if (exists) {
      toast.error('Este insumo ya está en la lista');
      return;
    }

    setConsumablesUsed(prev => [...prev, { ...item, cantidad: 1 }]);
    setSelectedConsumableJson('');
  };

  const removeConsumable = (index: number) => {
    setConsumablesUsed(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!descripcion.trim()) return toast.error('La descripción es obligatoria');
    
    setSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          descripcion, 
          diagnostico, 
          consumablesUsed 
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al registrar reparación');
      }

      toast.success('Reparación registrada correctamente');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wrench className="w-6 h-6 text-primary" />
              Registrar Reparación
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Ticket: <span className="font-mono text-foreground font-bold">{ticket.id}</span> · Equipo: {ticket.dispenserId}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Detalles de la reparación */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Descripción del Problema (Síntomas)</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Ej: El equipo no enfría y hace ruido..."
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Solución Aplicada (Diagnóstico/Acción)</label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="Ej: Se reemplazó el compresor y se cargó gas..."
                value={diagnostico}
                onChange={e => setDiagnostico(e.target.value)}
              />
            </div>
          </div>

          {/* Consumibles / Repuestos */}
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Package className="w-4 h-4 text-primary" />
              Repuestos e Insumos Utilizados
            </label>
            
            {loadingStock ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando stock disponible...
              </div>
            ) : !plantId ? (
              <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                El dispenser no tiene una ubicación asignada. No se puede descontar stock automáticamente.
              </div>
            ) : consumablesOptions.length > 0 ? (
              <>
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
                              <span className="text-xs text-muted-foreground font-medium">Cant:</span>
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
              </>
            ) : (
              <div className="text-xs text-muted-foreground italic">No hay stock disponible en esta planta.</div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-outline min-w-[120px]">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="btn-primary min-w-[160px] gap-2 shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Finalizar Reparación
          </button>
        </div>
      </div>
    </div>
  );
}
