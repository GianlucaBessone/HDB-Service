'use client';

import React, { useState, useEffect } from 'react';
import { Package, X, Loader2, PlusCircle } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import MaterialCombobox from '@/components/MaterialCombobox';

export default function InitConsumablesModal({
  dispenser, onClose, onInitialized
}: {
  dispenser: any; onClose: () => void; onInitialized: () => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Sub-form state
  const [mode, setMode] = useState<'SELECT' | 'CREATE'>('SELECT');
  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState('');
  
  const [form, setForm] = useState({
    materialCode: '',
    nombre: '',
    uniqueId: '',
    cantidad: '1',
  });

  useEffect(() => {
    if (dispenser.plantId) {
      setIsLoadingStock(true);
      fetch(`/api/stock?plantId=${dispenser.plantId}&itemType=CONSUMABLE`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableStock(data);
        })
        .finally(() => setIsLoadingStock(false));
        
      const resolvedClientId = dispenser.plant?.client?.id || dispenser.plant?.clientId;
      if (resolvedClientId) {
        fetch(`/api/catalog?clientId=${resolvedClientId}`)
          .then(res => res.json())
          .then(data => setCatalogItems(Array.isArray(data) ? data : []));
      }
    } else {
      setMode('CREATE');
      fetch('/api/clients')
        .then(res => res.json())
        .then(data => setClients(Array.isArray(data) ? data : []));
    }
  }, [dispenser.plantId, dispenser.plant]);

  useEffect(() => {
    if (!dispenser.plantId && selectedClientId) {
      fetch(`/api/catalog?clientId=${selectedClientId}`)
        .then(res => res.json())
        .then(data => setCatalogItems(Array.isArray(data) ? data : []));
    } else if (!dispenser.plantId) {
      setCatalogItems([]);
    }
  }, [selectedClientId, dispenser.plantId]);

  const handleCatalogSelect = (code: string) => {
    const item = catalogItems.find(c => c.code === code);
    if (item) {
      setForm(p => ({ ...p, materialCode: item.code, nombre: item.nombre }));
    } else {
      setForm(p => ({ ...p, materialCode: '', nombre: '' }));
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'SELECT') {
      const stockItem = availableStock.find(s => s.id === selectedStockId);
      if (!stockItem) return;
      
      const qty = parseInt(form.cantidad) || 1;
      if (qty > stockItem.cantidad) {
        toast.error(`Sólo hay ${stockItem.cantidad} disponibles de ${stockItem.nombre}`);
        return;
      }
      
      setItems([...items, {
        isNew: false,
        materialCode: stockItem.materialCode,
        nombre: stockItem.nombre,
        uniqueId: form.uniqueId.trim() || undefined,
        cantidad: qty,
      }]);
      setSelectedStockId('');
      setForm({ ...form, uniqueId: '', cantidad: '1' });
    } else {
      if (!form.materialCode.trim() || !form.nombre.trim()) {
        toast.error('Código y Nombre son requeridos');
        return;
      }
      setItems([...items, {
        isNew: true,
        materialCode: form.materialCode.trim(),
        nombre: form.nombre.trim(),
        uniqueId: form.uniqueId.trim() || undefined,
        cantidad: parseInt(form.cantidad) || 1,
      }]);
      setForm({ materialCode: '', nombre: '', uniqueId: '', cantidad: '1' });
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Agregue al menos un consumible');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dispensers/${dispenser.id}/consumables/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al inicializar');
      }
      toast.success('Consumibles inicializados');
      onInitialized();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 shrink-0">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Inicializar Consumibles
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {dispenser.plantId && (
            <div className="flex bg-muted p-1 rounded-lg">
              <button 
                className={clsx("flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors", mode === 'SELECT' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setMode('SELECT')}
              >
                Desde Inventario
              </button>
              <button 
                className={clsx("flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors", mode === 'CREATE' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setMode('CREATE')}
              >
                Crear Nuevo
              </button>
            </div>
          )}

          <form onSubmit={handleAddItem} className="bg-muted/30 p-4 rounded-xl border border-border">
            <h3 className="text-sm font-bold mb-3">Agregar Consumible</h3>
            
            {mode === 'SELECT' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold mb-1 block">Seleccionar del Inventario de la Planta</label>
                  <select 
                    className="select" 
                    value={selectedStockId} 
                    onChange={e => setSelectedStockId(e.target.value)}
                    required
                  >
                    <option value="">Seleccionar ítem...</option>
                    {availableStock.filter(s => s.cantidad > 0).map(s => (
                      <option key={s.id} value={s.id}>{s.materialCode} - {s.nombre} (Stock: {s.cantidad})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">N° Serie (Si aplica)</label>
                    <input className="input" placeholder="Opcional" value={form.uniqueId} onChange={e => setForm({...form, uniqueId: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Cantidad</label>
                    <input type="number" className="input" min="1" value={form.uniqueId ? 1 : form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} disabled={!!form.uniqueId} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {!dispenser.plantId && (
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Cliente (Para filtrar catálogo) *</label>
                    <select 
                      className="select"
                      value={selectedClientId}
                      onChange={e => {
                        setSelectedClientId(e.target.value);
                        setForm(p => ({ ...p, materialCode: '', nombre: '' }));
                      }}
                      required
                    >
                      <option value="">Seleccionar cliente...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold mb-1 block">Repuesto / Consumible *</label>
                  <MaterialCombobox 
                    items={catalogItems}
                    value={form.materialCode}
                    onChange={handleCatalogSelect}
                    disabled={(!dispenser.plantId && !selectedClientId) || catalogItems.length === 0}
                    autoFocus={!!dispenser.plantId || !!selectedClientId}
                  />
                  {((dispenser.plantId || selectedClientId) && catalogItems.length === 0) && (
                    <p className="text-xs text-amber-600 mt-1">Este cliente no tiene consumibles en su catálogo.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">N° Serie (Opcional)</label>
                    <input className="input" placeholder="Ej: SN-123" value={form.uniqueId} onChange={e => setForm({...form, uniqueId: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Cantidad</label>
                    <input type="number" className="input" min="1" value={form.uniqueId ? 1 : form.cantidad} onChange={e => setForm({...form, cantidad: e.target.value})} disabled={!!form.uniqueId} />
                  </div>
                </div>
                {dispenser.plantId && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 p-2 rounded italic">
                    Al crear un ítem nuevo, se registrará en el inventario de la planta e inmediatamente se consumirá.
                  </p>
                )}
              </div>
            )}
            
            <div className="mt-3 flex justify-end">
              <button type="submit" className="btn-outline btn-sm gap-1">
                <PlusCircle className="w-4 h-4" />
                Agregar a la lista
              </button>
            </div>
          </form>

          {/* List to Add */}
          {items.length > 0 && (
            <div>
              <h3 className="text-sm font-bold mb-2">Ítems a Inicializar</h3>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-bold">{item.nombre} <span className="text-xs font-normal text-muted-foreground ml-1">({item.materialCode})</span></p>
                      <div className="flex gap-2 mt-1">
                        {item.uniqueId && <span className="badge text-[10px]">S/N: {item.uniqueId}</span>}
                        {item.isNew && <span className="badge text-[10px] badge-warning">NUEVO</span>}
                        <span className="badge text-[10px]">Cant: {item.cantidad}</span>
                      </div>
                    </div>
                    <button onClick={() => handleRemoveItem(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={items.length === 0 || saving} className="btn-primary gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar e Inicializar
          </button>
        </div>
      </div>
    </div>
  );
}
