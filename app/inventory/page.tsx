'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useIsFetching } from '@tanstack/react-query';
import {
  Package, Search, Plus, Filter, AlertTriangle, ArrowRightLeft,
  CreditCard, X, Loader2, CheckCircle2,
  Settings2, Building2, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { t, getStatusColor } from '@/lib/translations';
import { useConfigStore } from '@/lib/store/useConfigStore';
import MaterialCombobox from '@/components/MaterialCombobox';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';

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
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const queryClient = useQueryClient();

  // Check if the current tab's queries are fetching
  const isFetching = useIsFetching({ queryKey: [activeTab] }) > 0;

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [activeTab] });
  }, [queryClient, activeTab]);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });

  const role = session?.user?.role;

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.clients || []);
    }
  });

  const { data: plants = [] } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const res = await fetch('/api/plants');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: stock = [], isLoading } = useQuery({
    queryKey: ['stock', selectedClient, selectedPlant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClient) params.set('clientId', selectedClient);
      if (selectedPlant) params.set('plantId', selectedPlant);
      const res = await fetch(`/api/stock?${params}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'stock', label: 'Stock actual', icon: Package },
    { key: 'transfers', label: 'Transferencias', icon: ArrowRightLeft },
    { key: 'debts', label: 'Deudas entre plantas', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Inventario"
        description="Stock de insumos y repuestos, transferencias y deudas entre plantas."
        actions={
          <button onClick={handleRefresh} className="btn-outline">
            <RefreshCw className={clsx('h-4 w-4', isFetching && 'animate-spin')} />
            Actualizar
          </button>
        }
      />

      {/* Pestañas */}
      <div className="tabs" role="tablist">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? 'tab-active' : 'tab'}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Empresa y planta */}
      {activeTab !== 'debts' && (
        <FilterBar>
          <div className="relative lg:w-64">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedClient}
              onChange={e => {
                const newClient = e.target.value;
                setSelectedClient(newClient);
                if (newClient && selectedPlant) {
                  const match = plants.find((p: any) => p.id === selectedPlant);
                  if (match && (match.clientId !== newClient && match.client?.id !== newClient)) {
                    setSelectedPlant('');
                  }
                }
              }}
              className="select pl-9"
              aria-label="Empresa"
            >
              <option value="">Todas las empresas</option>
              {clients.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div className="relative lg:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedPlant}
              onChange={e => {
                const newPlantId = e.target.value;
                setSelectedPlant(newPlantId);
                if (newPlantId && !selectedClient) {
                  const match = plants.find((p: any) => p.id === newPlantId);
                  const cId = match?.client?.id || match?.clientId;
                  if (cId) setSelectedClient(cId);
                }
              }}
              className="select pl-9"
              aria-label="Planta"
            >
              <option value="">
                {selectedClient ? 'Todas las plantas del cliente' : 'Todas las plantas'}
              </option>
              {selectedClient ? (
                plants
                  .filter((p: any) => p.clientId === selectedClient || p.client?.id === selectedClient)
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))
              ) : (
                clients.map((c: any) => {
                  const clientPlants = plants.filter((p: any) => p.clientId === c.id || p.client?.id === c.id);
                  if (clientPlants.length === 0) return null;
                  return (
                    <optgroup key={c.id} label={c.nombre}>
                      {clientPlants.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </optgroup>
                  );
                })
              )}
            </select>
          </div>
        </FilterBar>
      )}

      <div>
        {activeTab === 'stock' && (
          <StockTab 
            plantId={selectedPlant} 
            plants={plants} 
            entries={stock} 
            isLoading={isLoading} 
            onRefresh={handleRefresh}
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por nombre o código…"
            aria-label="Buscar material"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        {lowStockCount > 0 && (
          <span className="badge-danger h-9 justify-center gap-1.5 px-3 text-xs sm:h-auto sm:py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {lowStockCount} bajo mínimo
          </span>
        )}
        {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Agregar stock
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState icon={Package} title="Sin registros de stock" description="No hay materiales cargados para la selección actual." />
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([plantName, items]) => (
          <div key={plantName} className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h3 className="text-sm font-semibold">{plantName}</h3>
              <span className="text-xs text-muted-foreground tabular">{items.length} ítems</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="hidden sm:table-cell">Código</th>
                    <th>Material</th>
                    <th className="hidden lg:table-cell">N.º serie</th>
                    <th className="text-right">Cantidad</th>
                    <th className="hidden text-right md:table-cell">Mín.</th>
                    <th className="hidden text-right md:table-cell">Máx.</th>
                    <th>Estado</th>
                    <th className="text-right"><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(e => {
                    const isLow = e.minLevel > 0 && e.cantidad < e.minLevel;
                    const serials = (e as any).serialNumbers as string[] | undefined;
                    return (
                      <tr key={e.id} className={isLow ? 'bg-destructive/[0.04]' : ''}>
                        <td className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{e.materialCode}</td>
                        <td>
                          <div className="font-medium">{e.nombre}</div>
                          <div className="font-mono text-2xs text-muted-foreground sm:hidden">{e.materialCode}</div>
                        </td>
                        <td className="hidden lg:table-cell">
                          {serials && serials.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {serials.map(sn => (
                                <span key={sn} className="badge-neutral font-mono">{sn}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-right font-semibold tabular">{e.cantidad} <span className="font-normal text-muted-foreground">{e.unidad}</span></td>
                        <td className="hidden text-right text-muted-foreground tabular md:table-cell">{e.minLevel}</td>
                        <td className="hidden text-right text-muted-foreground tabular md:table-cell">{e.maxLevel}</td>
                        <td>
                          {isLow ? (
                            <span className="badge-danger"><AlertTriangle className="h-3 w-3" /> Bajo mínimo</span>
                          ) : (
                            <span className="badge-success">OK</span>
                          )}
                        </td>
                        <td className="text-right">
                          {(role === 'ADMIN' || role === 'SUPERVISOR' || role === 'TECHNICIAN') ? (
                            <button onClick={() => setAdjustEntry(e)} className="btn-ghost btn-sm" title="Ajuste de inventario">
                              <Settings2 className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Ajustar</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
            Nueva transferencia
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
        </div>
      ) : transfers.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title="Sin transferencias registradas" />
      ) : (
        <div className="table-container">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Material</th>
                <th className="hidden sm:table-cell">Desde</th>
                <th className="hidden sm:table-cell">Hacia</th>
                <th className="text-right">Cantidad</th>
                <th>Estado</th>
                <th className="hidden md:table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(tData => (
                <tr key={tData.id}>
                  <td>
                    <div className="font-medium">{tData.nombre}</div>
                    <div className="font-mono text-xs text-muted-foreground">{tData.materialCode}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground sm:hidden">{tData.fromPlant?.nombre} → {tData.toPlant?.nombre}</div>
                  </td>
                  <td className="hidden sm:table-cell">{tData.fromPlant?.nombre}</td>
                  <td className="hidden sm:table-cell">{tData.toPlant?.nombre}</td>
                  <td className="text-right font-semibold tabular">{tData.cantidad}</td>
                  <td><span className={clsx('badge', getStatusColor(tData.status))}>{t(tData.status)}</span></td>
                  <td className="hidden text-[13px] text-muted-foreground tabular md:table-cell">{new Date(tData.createdAt).toLocaleDateString('es-AR')}</td>
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
  const queryClient = useQueryClient();

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const res = await fetch('/api/stock/debts');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (debtId: string) => {
      const res = await fetch(`/api/stock/debts/${debtId}/resolve`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Error al resolver la deuda');
      return res.json();
    },
    onMutate: async (debtId: string) => {
      await queryClient.cancelQueries({ queryKey: ['debts'] });
      const previousDebts = queryClient.getQueryData<Debt[]>(['debts']);

      if (previousDebts) {
        queryClient.setQueryData<Debt[]>(
          ['debts'],
          previousDebts.filter(d => d.id !== debtId)
        );
      }

      return { previousDebts };
    },
    onError: (err, debtId, context) => {
      if (context?.previousDebts) {
        queryClient.setQueryData(['debts'], context.previousDebts);
      }
      toast.error('Error al resolver deuda');
    },
    onSuccess: () => {
      toast.success('Deuda resuelta');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
    }
  });

  const handleResolve = (debtId: string) => {
    resolveMutation.mutate(debtId);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 skeleton rounded-lg" />)}
        </div>
      ) : debts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Sin deudas pendientes" description="Todas las deudas entre plantas están saldadas." />
      ) : (
        <ul className="glass-card divide-y divide-border overflow-hidden">
          {debts.map(d => (
            <li key={d.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{d.nombre}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground tabular">
                    <span className="font-mono">{d.materialCode}</span> · Cantidad: {d.cantidad}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-medium text-foreground">{d.debtorPlant?.nombre}</span>
                    <span className="text-muted-foreground">debe a</span>
                    <span className="font-medium text-foreground">{d.creditorPlant?.nombre}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
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
            </li>
          ))}
        </ul>
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
  const [catalogItems, setCatalogItems] = useState<any[]>([]);

  // Fetch catalog when plant changes
  useEffect(() => {
    if (form.plantId) {
      const plant = plants.find(p => p.id === form.plantId);
      const clientId = plant?.client?.id || plant?.clientId;
      if (clientId) {
        fetch(`/api/catalog?clientId=${clientId}`)
          .then(res => res.json())
          .then(data => setCatalogItems(Array.isArray(data) ? data : []));
      } else {
        setCatalogItems([]);
      }
    } else {
      setCatalogItems([]);
    }
  }, [form.plantId, plants]);

  // Lock quantity to 1 if serial number is provided
  const isSerialized = !!form.uniqueId.trim();

  const handleCatalogSelect = (code: string) => {
    const item = catalogItems.find(c => c.code === code);
    if (item) {
      setForm(p => ({
        ...p,
        materialCode: item.code,
        nombre: item.nombre,
        itemType: item.type,
      }));
    } else {
      setForm(p => ({ ...p, materialCode: '', nombre: '' }));
    }
  };

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
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Agregar / actualizar stock</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Planta *</label>
              <select className="select mt-1" value={form.plantId} onChange={e => setForm(p => ({ ...p, plantId: e.target.value }))} required>
                <option value="">Seleccionar planta…</option>
                {plants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.client?.nombre ? `${p.client.nombre} — ` : ''}{p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Repuesto / consumible *</label>
              <MaterialCombobox 
                items={catalogItems}
                value={form.materialCode}
                onChange={handleCatalogSelect}
                disabled={!form.plantId || catalogItems.length === 0}
                autoFocus
              />
              {form.plantId && catalogItems.length === 0 && (
                <p className="text-xs text-warning mt-1">El cliente de esta planta no tiene repuestos en su catálogo.</p>
              )}
            </div>

            {form.itemType === 'CONSUMABLE' && (
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border border-border">
                <div>
                  <label className="label">N° serie (opcional)</label>
                  <input className="input mt-1" placeholder="Ej: SN-12345" value={form.uniqueId} onChange={e => setForm(p => ({ ...p, uniqueId: e.target.value }))} />
                  <p className="text-xs text-muted-foreground mt-1">Si se ingresa, la cantidad será 1.</p>
                </div>
                <div>
                  <label className="label">Vencimiento (meses)</label>
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
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva transferencia</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Planta origen *</label>
                <select 
                  className="select mt-1" 
                  value={form.fromPlantId} 
                  onChange={e => {
                    setForm(p => ({ ...p, fromPlantId: e.target.value, materialCode: '', nombre: '' }));
                    setSearchTerm('');
                  }} 
                  required
                >
                  <option value="">Seleccionar…</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Planta destino *</label>
                <select className="select mt-1" value={form.toPlantId} onChange={e => setForm(p => ({ ...p, toPlantId: e.target.value }))} required>
                  <option value="">Seleccionar…</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>

            {form.fromPlantId && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
                <div className="relative">
                  <label className="label">Buscar material en origen</label>
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
                            <div className="text-2xs opacity-70">{item.materialCode}</div>
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
                  <label className="label">Código material</label>
                  <input className="input mt-1 bg-muted" value={form.materialCode} readOnly />
                </div>
                <div>
                  <label className="label">Cantidad a transferir *</label>
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
                    <p className="text-2xs text-muted-foreground mt-1 text-right">
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
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Ajuste de inventario</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar"><X className="h-4 w-4" /></button>
        </div>
        <div className="modal-body space-y-4">
          <p className="text-sm font-medium">{entry.nombre} ({entry.materialCode})</p>
          
          <div className="flex gap-4 p-1 bg-muted rounded-lg">
            <button 
              className={clsx('flex-1 py-1.5 text-xs rounded-md transition-all', action === 'ADJUST_QTY' ? 'bg-white shadow-sm font-semibold' : 'text-muted-foreground')}
              onClick={() => setAction('ADJUST_QTY')}
            >
              Ajustar cantidad
            </button>
            <button 
              className={clsx('flex-1 py-1.5 text-xs rounded-md transition-all', action === 'DELETE' ? 'bg-destructive text-white font-semibold' : 'text-muted-foreground')}
              onClick={() => setAction('DELETE')}
            >
              Eliminar registro
            </button>
          </div>

          {action === 'ADJUST_QTY' ? (
            <div>
              <label className="label">Nueva Cantidad ({entry.unidad})</label>
              <input type="number" className="input mt-1" value={newCantidad} onChange={e => setNewCantidad(e.target.value)} />
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-lg text-destructive text-sm">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Esta acción eliminará el registro de stock para esta planta permanentemente.
            </div>
          )}

          <div>
            <label className="label">Justificación / motivo *</label>
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
