'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  X, Loader2, CheckCircle2, AlertTriangle, Package, ShieldCheck, 
  Gauge, ClipboardCheck, CheckSquare, Square 
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { EquipmentType } from '@prisma/client';
import { 
  INSPECTION_POINTS_BY_TYPE, 
  MEASUREMENT_FIELDS_BY_TYPE, 
  COMMON_FAILURES_BY_TYPE 
} from '@/lib/maintenanceProtocols';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';

interface ChecklistModalProps {
  schedule: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ChecklistModal({ schedule, onClose, onSuccess }: ChecklistModalProps) {
  const isReadOnly = schedule.status === 'COMPLETED' || schedule.status === 'SIGNED';
  const existing = schedule.checklist || {};

  const equipmentType: EquipmentType = (schedule.dispenser?.equipmentType || 'DISPENSER') as EquipmentType;
  const AssetIcon = getEquipmentTypeIcon(equipmentType);
  const assetTypeLabel = getEquipmentTypeLabel(equipmentType);

  const inspectionPoints = useMemo(() => INSPECTION_POINTS_BY_TYPE[equipmentType] || [], [equipmentType]);
  const measurementFields = useMemo(() => MEASUREMENT_FIELDS_BY_TYPE[equipmentType] || [], [equipmentType]);
  const commonFailures = useMemo(() => COMMON_FAILURES_BY_TYPE[equipmentType] || [], [equipmentType]);

  const [condicionGeneral, setCondicionGeneral] = useState(existing.condicionGeneral || 'GOOD');
  const [fallas, setFallas] = useState<string[]>(existing.fallas || []);
  const [customFalla, setCustomFalla] = useState('');
  const [observaciones, setObservaciones] = useState(existing.observaciones || '');
  const [measurements, setMeasurements] = useState<Record<string, any>>(existing.measurements || {});
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>(() => {
    if (existing.checklistItems) return existing.checklistItems;
    // Default initial state: empty object (user checks them)
    return {};
  });
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

  const toggleChecklistItem = (id: string) => {
    if (isReadOnly) return;
    setChecklistItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const markAllChecklistItems = () => {
    if (isReadOnly) return;
    const allChecked: Record<string, boolean> = {};
    inspectionPoints.forEach(pt => {
      allChecked[pt.id] = true;
    });
    setChecklistItems(allChecked);
  };

  const handleMeasurementChange = (key: string, val: any) => {
    if (isReadOnly) return;
    setMeasurements(prev => {
      const next = { ...prev, [key]: val };
      
      // Auto-calculate thermal jump for air conditioners if ambient & injection temps are present
      if (equipmentType === 'AIR_CONDITIONER' && (key === 'tempAmbienteC' || key === 'tempInyeccionC')) {
        const amb = parseFloat(key === 'tempAmbienteC' ? val : next.tempAmbienteC);
        const iny = parseFloat(key === 'tempInyeccionC' ? val : next.tempInyeccionC);
        if (!isNaN(amb) && !isNaN(iny)) {
          next.saltoTermicoC = (Math.round((amb - iny) * 10) / 10).toString();
        }
      }
      
      return next;
    });
  };

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
        body: JSON.stringify({ 
          condicionGeneral, 
          fallas, 
          problemasEstructurales: [], 
          observaciones, 
          consumablesUsed,
          measurements,
          checklistItems,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }
      toast.success('Mantenimiento completado exitosamente');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar reporte');
    } finally {
      setSaving(false);
    }
  };

  const allFailures = Array.from(new Set([...commonFailures, ...fallas]));

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="modal-header">
          <div className="flex min-w-0 items-start gap-3">
            <AssetIcon className="mt-0.5 hidden h-5 w-5 shrink-0 text-muted-foreground sm:block" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2>{isReadOnly ? 'Reporte técnico de servicio' : 'Checklist de mantenimiento preventivo'}</h2>
                <span className="badge-neutral">{assetTypeLabel}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{schedule.dispenserId}</span> · {schedule.dispenser?.marca} {schedule.dispenser?.modelo}
                {schedule.dispenser?.location?.plant?.nombre && <> · {schedule.dispenser.location.plant.nombre}</>}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="modal-body flex-1 space-y-6 overflow-y-auto text-sm">
          {/* 1. Condición General */}
          <div>
            <label className="mb-2.5 block text-sm font-semibold">Condición general del activo
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { val: 'GOOD', label: 'Buena', desc: 'Operativo normal', color: 'border-success text-success bg-success/10' },
                { val: 'FAIR', label: 'Regular', desc: 'Detalles leves', color: 'border-info text-info bg-info/10' },
                { val: 'POOR', label: 'Mala', desc: 'Riesgo inminente', color: 'border-warning text-warning bg-warning/10' },
                { val: 'CRITICAL', label: 'Crítica', desc: 'Fuera de servicio', color: 'border-destructive text-destructive bg-destructive/10' },
              ].map(c => (
                <button
                  key={c.val}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setCondicionGeneral(c.val)}
                  className={clsx(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-md border p-2.5 text-sm font-medium transition-colors',
                    condicionGeneral === c.val ? c.color : 'border-border bg-card text-muted-foreground hover:bg-accent'
                  )}
                >
                  <span>{c.label}</span>
                  <span className="text-2xs font-normal opacity-80">{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Mediciones Técnicas e Instrumentales */}
          {measurementFields.length > 0 && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Mediciones técnicas</label>
                <span className="text-2xs text-muted-foreground">
                  {isReadOnly ? 'Registrado por instrumental' : 'Lecturas de manómetros, pinza y termómetro'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {measurementFields.map(field => {
                  const val = measurements[field.key] ?? '';
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                        <span>{field.label}</span>
                        {field.unit && <span className="font-mono text-2xs text-muted-foreground">{field.unit}</span>}
                      </label>

                      {field.type === 'select' ? (
                        <select
                          disabled={isReadOnly}
                          value={val}
                          onChange={e => handleMeasurementChange(field.key, e.target.value)}
                          className="select w-full text-xs h-9"
                        >
                          <option value="">-- Seleccionar --</option>
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="relative">
                          <input
                            type="number"
                            step={field.step || 'any'}
                            placeholder={field.placeholder}
                            disabled={isReadOnly}
                            value={val}
                            onChange={e => handleMeasurementChange(field.key, e.target.value)}
                            className="input w-full text-xs font-mono h-9 pr-10"
                          />
                          {field.unit && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none font-bold">
                              {field.unit}
                            </span>
                          )}
                        </div>
                      )}
                      {field.helper && (
                        <p className="text-2xs text-muted-foreground italic">{field.helper}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Protocolo de Inspección Preventiva (Checklist interactivo) */}
          {inspectionPoints.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  Puntos de control <span className="font-normal text-muted-foreground tabular">({inspectionPoints.length})</span>
                </label>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={markAllChecklistItems}
                    className="btn-ghost btn-sm text-primary"
                  >
                    Marcar todos
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inspectionPoints.map(item => {
                  const isChecked = !!checklistItems[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isReadOnly}
                      onClick={() => toggleChecklistItem(item.id)}
                      className={clsx(
                        'flex min-h-[44px] items-start gap-2.5 rounded-md border p-2.5 text-left transition-colors',
                        isChecked 
                          ? 'bg-primary/5 border-primary/30 text-foreground' 
                          : 'bg-muted/10 border-border text-muted-foreground hover:bg-muted/30'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs leading-relaxed font-medium">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Consumibles Utilizados */}
          {!isReadOnly && consumablesOptions.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Consumibles e insumos utilizados
              </label>
              
              <div className="flex gap-2">
                <select 
                  className="select flex-1" 
                  value={selectedConsumableJson} 
                  onChange={e => setSelectedConsumableJson(e.target.value)}
                >
                  <option value="">-- Seleccionar de stock de planta --</option>
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
                    <div key={index} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.nombre}</p>
                        <p className="text-2xs text-muted-foreground uppercase tracking-wider">
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
                          <span className="badge-neutral">Serializado</span>
                        )}
                        <button type="button" onClick={() => removeConsumable(index)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Fallas y Anomalías Detectadas */}
          <div>
            <label className="mb-2.5 block text-sm font-semibold">Checklist de anomalías / reparaciones requeridas
            </label>
            <div className="flex flex-wrap gap-2">
              {allFailures.map(f => (
                <button
                  key={f}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => toggleFalla(f)}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl border text-xs transition-all',
                    fallas.includes(f) 
                      ? 'bg-destructive/10 border-destructive/40 text-destructive font-bold shadow-sm' 
                      : 'bg-muted/30 border-border hover:border-primary/30 text-muted-foreground'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            
            {!isReadOnly && (
              <div className="flex items-center gap-2 mt-3">
                <input 
                  className="input flex-1 text-xs" 
                  placeholder="Otra anomalía observada..." 
                  value={customFalla}
                  onChange={e => setCustomFalla(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomFalla(); }}
                />
                <button type="button" onClick={addCustomFalla} className="btn-outline px-4 text-xs">Agregar</button>
              </div>
            )}
          </div>

          {/* 6. Observaciones del Técnico */}
          <div>
            <label className="label mb-1.5">Observaciones y recomendaciones</label>
            <textarea
              className="textarea text-xs"
              rows={3}
              placeholder="Detalles técnicos adicionales, estado general, piezas a presupuestar..."
              value={observaciones}
              disabled={isReadOnly}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-outline">{isReadOnly ? 'Cerrar' : 'Cancelar'}</button>
          {!isReadOnly && (
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="btn-primary"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Completar mantenimiento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
