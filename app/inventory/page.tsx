'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Package, Search, Plus, Filter, AlertTriangle, ArrowRightLeft,
  CreditCard, X, Loader2, CheckCircle2,
  Settings2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';

type Tab = 'stock' | 'transfers' | 'debts';

type StockEntry = {
  id: string;
  clientId: string;
  plantId: string;
  itemType: string;
  materialCode: string;
  nombre: string;
  cantidad: number;
  minLevel: number;
  maxLevel: number;
  unidad: string;
  client: { nombre: string };
  plant: { nombre: string };
};

type Transfer = {
  id: string;
  fromPlant: { nombre: string };
  toPlant: { nombre: string };
  materialCode: string;
  nombre: string;
  cantidad: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  transferredBy: { nombre: string } | null;
};

type Debt = {
  id: string;
  creditorPlant: { nombre: string };
  debtorPlant: { nombre: string };
  materialCode: string;
  nombre: string;
  cantidad: number;
  status: string;
  dispenserBlocked: { id: string } | null;
  createdAt: string;
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stock');
  const [selectedPlant, setSelectedPlant] = useState('');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const role = session?.user?.role;

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const res = await fetch('/api/plants');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: stock = [], isLoading, refetch: fetchStock } = useQuery({
    queryKey: ['stock', selectedPlant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPlant) params.set('plantId', selectedPlant);
      const res = await fetch(`/api/stock?${params}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'stock', label: 'Stock Actual', icon: Package },
    { key: 'transfers', label: 'Transferencias', icon: ArrowRightLeft },
    { key: 'debts', label: 'Deudas Inter-Plantas', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="w-7 h-7 text-primary" />
            </div>
            Inventario
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de stock, transferencias y deudas entre plantas</p>
        </div>
        <button onClick={() => fetchStock()} className="btn-outline btn-sm gap-2 shrink-0">
          <Loader2 className={clsx('w-4 h-4', isLoading && 'animate-spin')} />
          Actualizar
        </button>
      </div>

      {/* Plant Filter */}
      {activeTab !== 'debts' && (
        <div className="glass-card p-4 flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={selectedPlant}
            onChange={e => setSelectedPlant(e.target.value)}
            className="select max-w-xs"
          >
            <option value="">Todas las plantas (Global)</option>
            {plants.map((p: any) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'tab-active' : 'tab'}
            >
              <TabIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'stock' && (
          <StockTab 
            plantId={selectedPlant} 
            plants={plants} 
            entries={stock} 
            isLoading={isLoading} 
            onRefresh={fetchStock}
            role={role}
          />
        )}
        {activeTab === 'transfers' && <TransfersTab plantId={selectedPlant} plants={plants} role={role} />}
        {activeTab === 'debts' && <DebtsTab role={role} />}
      </div>
    </div>
  );
}

// ─── Stock Tab ──────────────────────────────────────
function StockTab({ 
  plantId, plants, entries, isLoading, onRefresh, role 
}: { 
  plantId: string; plants: any[]; entries: StockEntry[]; isLoading: boolean; onRefresh: () => void; role?: string;
}) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustEntry, setAdjustEntry] = useState<StockEntry | null>(null);

  const filtered = entries.filter(e =>
    !search ||
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.materialCode.toLowerCase().includes(search.toLowerCase())
  );

  // Group by plant for global view
  const grouped = !plantId
    ? filtered.reduce((acc, e) => {
        const key = e.plant.nombre;
        if (!acc[key]) acc[key] = [];
        acc[key].push(e);
        return acc;
      }, {} as Record<string, StockEntry[]>)
    : { [plants.find(p => p.id === plantId)?.nombre || 'Planta']: filtered };

  const lowStockCount = entries.filter(e => e.minLevel > 0 && e.cantidad < e.minLevel).length;

  return (
    <div className="space-y-4">
      {/* KPIs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-700 dark:text-red-400">
              {lowStockCount} ítems bajo mínimo
            </span>
          </div>
        )}
        {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Agregar Stock
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <Package className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Sin registros de stock</p>
        </div>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([plantName, items]) => (
          <div key={plantName} className="glass-card overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {plantName}
                <span className="text-xs text-muted-foreground font-normal">({items.length} ítems)</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="text-center w-[12%]">Código</th>
                    <th className="text-center w-[28%]">Material</th>
                    <th className="text-center w-[15%]">N° Serie</th>
                    <th className="text-center w-[12%]">Cantidad</th>
                    <th className="text-center w-[8%]">Mínimo</th>
                    <th className="text-center w-[8%]">Máximo</th>
                    <th className="text-center w-[8%]">Estado</th>
                    <th className="text-center w-[9%]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(e => {
                    const isLow = e.minLevel > 0 && e.cantidad < e.minLevel;
                    const serials = (e as any).serialNumbers as string[] | undefined;
                    return (
                      <tr key={e.id} className={isLow ? 'bg-red-50/50 dark:bg-red-950/10' : ''}>
                        <td className="text-center">
                          <div className="flex justify-center font-mono text-xs">{e.materialCode}</div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center font-medium">{e.nombre}</div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center">
                            {serials && serials.length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center">
                                {serials.map(sn => (
                                  <span key={sn} className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-mono rounded">
                                    {sn}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">S/N</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center font-semibold whitespace-nowrap">
                            {e.cantidad} {e.unidad}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center text-muted-foreground">{e.minLevel}</div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center text-muted-foreground">{e.maxLevel}</div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center">
                            {isLow ? (
                              <span className="badge-danger">
                                <AlertTriangle className="w-3 h-3" /> Bajo
                              </span>
                            ) : (
                              <span className="badge-success">OK</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex justify-center">
                            {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') ? (
                              <button
                                onClick={() => setAdjustEntry(e)}
                                className="btn-ghost btn-sm text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                title="Ajuste de inventario"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                                Ajustar
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {showAddModal && (
        <AddStockModal
          plants={plants}
          defaultPlantId={plantId}
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setShowAddModal(false); onRefresh(); }}
        />
      )}

      {adjustEntry && (
        <AdjustStockModal
          entry={adjustEntry}
          onClose={() => setAdjustEntry(null)}
          onAdjusted={() => { setAdjustEntry(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Transfers Tab ──────────────────────────────────
function TransfersTab({ plantId, plants, role }: { plantId: string; plants: any[]; role?: string }) {
  const [showModal, setShowModal] = useState(false);

  const { data: transfers = [], isLoading, refetch: fetchTransfers } = useQuery({
    queryKey: ['transfers', plantId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (plantId) params.set('plantId', plantId);
      const res = await fetch(`/api/stock/transfer?${params}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  return (
    <div className="space-y-4">
      {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
        <div className="flex justify-end">
          <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Nueva Transferencia
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
        </div>
      ) : transfers.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <ArrowRightLeft className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Sin transferencias registradas</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table w-full">
            <thead>
              <tr>
                <th className="text-center w-[30%]">Material</th>
                <th className="text-center w-[20%]">Desde</th>
                <th className="text-center w-[20%]">Hacia</th>
                <th className="text-center w-[10%]">Cantidad</th>
                <th className="text-center w-[10%]">Estado</th>
                <th className="text-center w-[10%]">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(tData => (
                <tr key={tData.id}>
                  <td className="text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="font-medium">{tData.nombre}</div>
                      <div className="text-xs text-muted-foreground">{tData.materialCode}</div>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center">{tData.fromPlant?.nombre}</div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center">{tData.toPlant?.nombre}</div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center font-semibold">{tData.cantidad}</div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center">
                      <span className={clsx('badge', getStatusColor(tData.status))}>{t(tData.status)}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center text-sm text-muted-foreground">
                      {new Date(tData.createdAt).toLocaleDateString('es-AR')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TransferModal
          plants={plants}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); fetchTransfers(); }}
        />
      )}
    </div>
  );
}

// ─── Debts Tab ──────────────────────────────────────
function DebtsTab({ role }: { role?: string }) {
  const { data: debts = [], isLoading, refetch: fetchDebts } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const res = await fetch('/api/stock/debts');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const handleResolve = async (debtId: string) => {
    try {
      const res = await fetch(`/api/stock/debts/${debtId}/resolve`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      toast.success('Deuda resuelta');
      fetchDebts();
    } catch {
      toast.error('Error al resolver deuda');
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
        </div>
      ) : debts.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500/30 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Sin deudas pendientes</p>
          <p className="text-muted-foreground text-sm mt-1">Todas las deudas inter-plantas están al día</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map(d => (
            <div key={d.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{d.nombre}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Código: {d.materialCode} · Cantidad: {d.cantidad}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="font-medium text-red-600 dark:text-red-400">{d.debtorPlant?.nombre}</span>
                    <span className="text-muted-foreground">debe a</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{d.creditorPlant?.nombre}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={clsx('badge', getStatusColor(d.status))}>
                    {t(d.status)}
                  </span>
                  {d.status === 'PENDING' && (role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
                    <button onClick={() => handleResolve(d.id)} className="btn-outline btn-sm gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ... (Other modals simplified for brevity, assume they stay the same logic-wise but use t() if needed)
// ... (AddStockModal, TransferModal, AdjustStockModal)

// ─── Add Stock Modal ────────────────────────────────
function AddStockModal({
  plants, defaultPlantId, onClose, onAdded
}: {
  plants: any[]; defaultPlantId: string; onClose: () => void; onAdded: () => void;
}) {
  const [form, setForm] = useState({
    plantId: defaultPlantId || '',
    materialCode: '',
    nombre: '',
    cantidad: '',
    minLevel: '',
    maxLevel: '',
    unidad: 'unidad',
    itemType: 'CONSUMABLE',
    uniqueId: '',
    expirationMonths: '',
  });
  const [saving, setSaving] = useState(false);

  // Lock quantity to 1 if serial number is provided
  const isSerialized = !!form.uniqueId.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.plantId || !form.materialCode.trim() || !form.nombre.trim()) {
      toast.error('Planta, código y nombre son obligatorios');
      return;
    }

    const plant = plants.find(p => p.id === form.plantId);
    if (!plant) { 
      toast.error('Planta no válida'); 
      return; 
    }

    const resolvedClientId = plant.client?.id || plant.clientId;
    if (!resolvedClientId) {
      toast.error('Error: no se pudo determinar el cliente de la planta');
      return;
    }

    const min = parseFloat(form.minLevel) || 0;
    const max = parseFloat(form.maxLevel) || 0;

    if (max > 0 && max < min) {
      toast.error('El nivel máximo no puede ser menor al mínimo');
      return;
    }

    const payload = {
      clientId: resolvedClientId,
      plantId: form.plantId,
      itemType: form.itemType,
      materialCode: form.materialCode.trim(),
      nombre: form.nombre.trim(),
      cantidad: isSerialized ? 1 : (parseFloat(form.cantidad) || 0),
      minLevel: min,
      maxLevel: max,
      unidad: form.unidad,
      uniqueId: form.uniqueId.trim() || undefined,
      expirationMonths: parseInt(form.expirationMonths) || undefined,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const responseData = await res.json();
        toast.error(responseData.error || 'Error al agregar stock');
        return;
      }
      toast.success('Stock actualizado correctamente');
      onAdded();
    } catch (err: any) {
      console.error('[AddStock] Error:', err);
      toast.error('Error de conexión: ' + (err?.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Agregar / Actualizar Stock</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Planta *</label>
              <select className="select mt-1" value={form.plantId} onChange={e => setForm(p => ({ ...p, plantId: e.target.value }))} required>
                <option value="">Seleccionar...</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Código Material *</label>
                <input className="input mt-1" placeholder="FIL-CARB-01" value={form.materialCode} onChange={e => setForm(p => ({ ...p, materialCode: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="select mt-1" value={form.itemType} onChange={e => setForm(p => ({ ...p, itemType: e.target.value }))}>
                  <option value="CONSUMABLE">Consumible</option>
                  <option value="SPARE_PART">Repuesto</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Nombre *</label>
              <input className="input mt-1" placeholder="Filtro Carbón Activado" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
            </div>

            {form.itemType === 'CONSUMABLE' && (
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                <div>
                  <label className="label">N° Serie (Opcional)</label>
                  <input className="input mt-1" placeholder="Ej: SN-12345" value={form.uniqueId} onChange={e => setForm(p => ({ ...p, uniqueId: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Si se ingresa, la cantidad será 1.</p>
                </div>
                <div>
                  <label className="label">Vencimiento (Meses)</label>
                  <input type="number" className="input mt-1" placeholder="Ej: 6" value={form.expirationMonths} onChange={e => setForm(p => ({ ...p, expirationMonths: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Calculado al instalar.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Cantidad</label>
                <input type="number" className="input mt-1" disabled={isSerialized} value={isSerialized ? 1 : form.cantidad} onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} />
              </div>
              <div>
                <label className="label">Mínimo</label>
                <input type="number" className="input mt-1" value={form.minLevel} onChange={e => setForm(p => ({ ...p, minLevel: e.target.value }))} />
              </div>
              <div>
                <label className="label">Máximo</label>
                <input type="number" className="input mt-1" value={form.maxLevel} onChange={e => setForm(p => ({ ...p, maxLevel: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Transfer Modal ─────────────────────────────────
function TransferModal({
  plants, onClose, onCreated
}: {
  plants: any[]; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    fromPlantId: '', toPlantId: '', itemType: 'CONSUMABLE',
    materialCode: '', nombre: '', cantidad: '1',
  });
  const [saving, setSaving] = useState(false);
  const [availableItems, setAvailableItems] = useState<StockEntry[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAvailableStock = useCallback(async (plantId: string) => {
    if (!plantId) {
      setAvailableItems([]);
      return;
    }
    setIsLoadingStock(true);
    try {
      const res = await fetch(`/api/stock?plantId=${plantId}`);
      const data = await res.json();
      setAvailableItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Error al cargar stock de la planta');
    } finally {
      setIsLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    if (form.fromPlantId) {
      fetchAvailableStock(form.fromPlantId);
    }
  }, [form.fromPlantId, fetchAvailableStock]);

  const filteredItems = availableItems.filter(item => 
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItem = availableItems.find(i => i.materialCode === form.materialCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fromPlantId || !form.toPlantId || !form.materialCode.trim() || !form.nombre.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    if (form.fromPlantId === form.toPlantId) {
      toast.error('Las plantas de origen y destino deben ser diferentes');
      return;
    }

    const qty = parseFloat(form.cantidad);
    if (selectedItem && qty > selectedItem.cantidad) {
      toast.error(`Stock insuficiente en origen (Disponible: ${selectedItem.cantidad})`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/stock/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPlantId: form.fromPlantId,
          toPlantId: form.toPlantId,
          itemType: form.itemType,
          materialCode: form.materialCode.trim(),
          nombre: form.nombre.trim(),
          cantidad: qty || 1,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al crear transferencia');
        return;
      }
      toast.success('Transferencia creada');
      onCreated();
    } catch {
      toast.error('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">Nueva Transferencia</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Planta Origen *</label>
                <select 
                  className="select mt-1" 
                  value={form.fromPlantId} 
                  onChange={e => {
                    setForm(p => ({ ...p, fromPlantId: e.target.value, materialCode: '', nombre: '' }));
                    setSearchTerm('');
                  }} 
                  required
                >
                  <option value="">Seleccionar...</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Planta Destino *</label>
                <select className="select mt-1" value={form.toPlantId} onChange={e => setForm(p => ({ ...p, toPlantId: e.target.value }))} required>
                  <option value="">Seleccionar...</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            {form.fromPlantId && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                <div className="relative">
                  <label className="label">Buscar Material en Origen</label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      className="input pl-10"
                      placeholder="Nombre o código..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                {isLoadingStock ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                    {filteredItems.length === 0 ? (
                      <p className="text-xs text-center py-4 text-muted-foreground">No hay stock disponible en esta planta</p>
                    ) : (
                      filteredItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setForm(p => ({ ...p, materialCode: item.materialCode, nombre: item.nombre, itemType: item.itemType }));
                            setSearchTerm(item.nombre);
                          }}
                          className={clsx(
                            "w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center",
                            form.materialCode === item.materialCode ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                          )}
                        >
                          <div>
                            <div className="font-medium">{item.nombre}</div>
                            <div className="text-[10px] opacity-70">{item.materialCode}</div>
                          </div>
                          <div className="text-xs font-semibold">
                            {item.cantidad} {item.unidad}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {form.materialCode && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="label">Código Material</label>
                  <input className="input mt-1 bg-muted" value={form.materialCode} readOnly />
                </div>
                <div>
                  <label className="label">Cantidad a Transferir *</label>
                  <input 
                    type="number" 
                    className="input mt-1" 
                    value={form.cantidad} 
                    onChange={e => setForm(p => ({ ...p, cantidad: e.target.value }))} 
                    max={selectedItem?.cantidad}
                    min="1"
                    step="any"
                    required 
                  />
                  {selectedItem && (
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                      Max: {selectedItem.cantidad} {selectedItem.unidad}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving || !form.materialCode} className="btn-primary gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Crear Transferencia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Adjust Stock Modal ─────────────────────────────
function AdjustStockModal({
  entry, onClose, onAdjusted
}: {
  entry: StockEntry; onClose: () => void; onAdjusted: () => void;
}) {
  const [action, setAction] = useState<'ADJUST_QTY' | 'DELETE'>('ADJUST_QTY');
  const [newCantidad, setNewCantidad] = useState(String(entry.cantidad));
  const [justificacion, setJustificacion] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = async () => {
    if (!justificacion.trim()) {
      toast.error('La justificación es obligatoria');
      return;
    }

    if (action === 'DELETE' && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/stock/${entry.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          cantidad: action === 'ADJUST_QTY' ? parseFloat(newCantidad) : 0,
          justificacion: justificacion.trim()
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Inventario ajustado');
      onAdjusted();
    } catch {
      toast.error('Error al ajustar inventario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-amber-600">Ajuste de Inventario</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <div className="modal-body space-y-4">
          <p className="text-sm font-medium">{entry.nombre} ({entry.materialCode})</p>
          
          <div className="flex gap-4 p-1 bg-muted rounded-lg">
            <button 
              className={clsx('flex-1 py-1.5 text-xs rounded-md transition-all', action === 'ADJUST_QTY' ? 'bg-white shadow-sm font-semibold' : 'text-muted-foreground')}
              onClick={() => setAction('ADJUST_QTY')}
            >
              Ajustar Cantidad
            </button>
            <button 
              className={clsx('flex-1 py-1.5 text-xs rounded-md transition-all', action === 'DELETE' ? 'bg-red-500 text-white font-semibold' : 'text-muted-foreground')}
              onClick={() => setAction('DELETE')}
            >
              Eliminar Registro
            </button>
          </div>

          {action === 'ADJUST_QTY' ? (
            <div>
              <label className="label">Nueva Cantidad ({entry.unidad})</label>
              <input type="number" className="input mt-1" value={newCantidad} onChange={e => setNewCantidad(e.target.value)} />
            </div>
          ) : (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Esta acción eliminará el registro de stock para esta planta permanentemente.
            </div>
          )}

          <div>
            <label className="label">Justificación / Motivo *</label>
            <textarea className="textarea mt-1" rows={3} placeholder="Ej: Error de carga inicial, merma, rotura..." value={justificacion} onChange={e => setJustificacion(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button 
            onClick={handleSubmit} 
            disabled={saving} 
            className={clsx('gap-2', action === 'DELETE' ? 'btn-danger' : 'btn-primary')}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {action === 'DELETE' ? (confirmDelete ? 'Confirmar Eliminación' : 'Eliminar') : 'Guardar Ajuste'}
          </button>
        </div>
      </div>
    </div>
  );
}
