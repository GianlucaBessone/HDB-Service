'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, Plus, CheckCircle2, Clock, DollarSign, 
  Building2, Wrench, Search, X, Loader2, AlertCircle, FileCheck, Trash2 
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { getEquipmentTypeLabel, getEquipmentTypeIcon } from '@/lib/equipment';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import FilterBar, { FieldIcon } from '@/components/ui/FilterBar';
import EmptyState from '@/components/ui/EmptyState';

export default function QuotationsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState<any>(null);
  const [viewingQuote, setViewingQuote] = useState<any>(null);

  // Fetch session
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return { user: null };
      return res.json();
    }
  });
  const user = session?.user;
  const canWrite = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'TECHNICIAN';
  const canApprove = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'CLIENT_RESPONSIBLE';

  // Fetch clients
  const { data: clients = [] } = useQuery<any[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const res = await fetch('/api/clients');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.clients || []);
    }
  });

  // Fetch quotations
  const { data: quotations = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ['quotations', statusFilter, clientFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (clientFilter) params.set('clientId', clientFilter);
      const res = await fetch(`/api/quotations?${params}`);
      if (!res.ok) throw new Error('Error al cargar cotizaciones');
      return res.json();
    }
  });

  const filteredQuotes = quotations.filter((q: any) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      q.titulo.toLowerCase().includes(term) ||
      q.client?.nombre?.toLowerCase().includes(term) ||
      q.dispenserId?.toLowerCase().includes(term) ||
      q.orderNumber?.toLowerCase().includes(term)
    );
  });

  const kpis = {
    total: quotations.length,
    approved: quotations.filter(q => q.status === 'APPROVED').length,
    pending: quotations.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length,
    approvedTotal: quotations
      .filter(q => q.status === 'APPROVED')
      .reduce((acc, q) => acc + (q.total || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="badge-success">Aprobado (OC)</span>;
      case 'SENT':
        return <span className="badge-info">Enviado al cliente</span>;
      case 'REJECTED':
        return <span className="badge-danger">Rechazado</span>;
      case 'CANCELLED':
        return <span className="badge-neutral">Cancelado</span>;
      default:
        return <span className="badge-neutral">Borrador</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Presupuestos y órdenes de compra"
        description="Cotizaciones de reparaciones y mano de obra, y su aprobación mediante OC del cliente."
        actions={
          canWrite && (
            <button onClick={() => setIsCreateOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" />
              Nuevo presupuesto
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Presupuestos" value={kpis.total} icon={FileText} />
        <StatCard label="Aprobados con OC" value={kpis.approved} icon={CheckCircle2} tone="success" />
        <StatCard label="Pendientes de OC" value={kpis.pending} icon={Clock} tone="warning" />
        <StatCard label="Monto aprobado" value={<span className="text-xl sm:text-2xl">$ {kpis.approvedTotal.toLocaleString('es-AR')}</span>} icon={DollarSign} tone="primary" />
      </div>

      <FilterBar>
        <FieldIcon icon={Search} className="sm:col-span-2 lg:min-w-[240px] lg:flex-1">
          <input
            type="search"
            placeholder="Buscar por título, cliente, activo o N.º de OC…"
            aria-label="Buscar presupuestos"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </FieldIcon>
        <FieldIcon icon={Building2} className="lg:w-52">
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="select pl-9" aria-label="Empresa">
            <option value="">Todas las empresas</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </FieldIcon>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select lg:w-48" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="SENT">Enviado</option>
          <option value="APPROVED">Aprobado (OC)</option>
          <option value="REJECTED">Rechazado</option>
        </select>
      </FilterBar>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-lg" />
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <EmptyState icon={FileText} title="No se encontraron presupuestos" description="Creá un presupuesto para reparaciones o repuestos mayores." />
      ) : (
        <div className="glass-card divide-y divide-border overflow-hidden">
          {filteredQuotes.map((q: any) => {
            const AssetIcon = getEquipmentTypeIcon(q.dispenser?.equipmentType || 'OTHER');
            return (
              <div key={q.id} className="flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/30 md:flex-row md:items-center sm:p-5">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-foreground">{q.titulo}</h3>
                    {getStatusBadge(q.status)}
                    {q.orderNumber && (
                      <span className="badge-neutral font-mono">OC {q.orderNumber}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      {q.client?.nombre || 'Cliente general'}
                    </span>

                    {q.dispenser && (
                      <span className="flex items-center gap-1">
                        <AssetIcon className="h-3.5 w-3.5" />
                        <span className="font-mono font-medium text-foreground">{q.dispenser.id}</span>
                        <span>({getEquipmentTypeLabel(q.dispenser.equipmentType)})</span>
                      </span>
                    )}

                    {q.ticket && (
                      <span className="flex items-center gap-1">
                        <Wrench className="h-3.5 w-3.5" />
                        Ticket: <span className="font-mono">{q.ticket.id.slice(-6)}</span> ({q.ticket.reason})
                      </span>
                    )}

                    <span>Emitido por: {q.createdByUser?.nombre}</span>
                  </div>

                  {q.descripcion && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{q.descripcion}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-row items-end justify-between gap-3 border-t border-border pt-3 md:flex-col md:items-end md:justify-center md:border-t-0 md:pt-0">
                  <div className="md:text-right">
                    <p className="eyebrow">Total</p>
                    <p className="text-lg font-semibold tabular text-foreground">
                      {q.moneda} $ {q.total.toLocaleString('es-AR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setViewingQuote(q)}
                      className="btn-outline btn-sm"
                    >
                      Ver detalle
                    </button>
                    {canApprove && q.status !== 'APPROVED' && (
                      <button 
                        onClick={() => setApprovingQuote(q)}
                        className="btn-primary btn-sm"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        Cargar OC
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Cotización */}
      {isCreateOpen && (
        <CreateQuotationModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => { setIsCreateOpen(false); refetch(); }}
        />
      )}

      {/* Modal: Cargar y Aprobar con Orden de Compra */}
      {approvingQuote && (
        <ApproveOcModal
          quote={approvingQuote}
          onClose={() => setApprovingQuote(null)}
          onSuccess={() => { setApprovingQuote(null); refetch(); }}
        />
      )}

      {/* Modal: Ver Detalle */}
      {viewingQuote && (
        <ViewQuoteModal
          quote={viewingQuote}
          onClose={() => setViewingQuote(null)}
        />
      )}
    </div>
  );
}

// Sub-component: Create Quotation Modal
function CreateQuotationModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [clientId, setClientId] = useState('');
  const [dispenserId, setDispenserId] = useState('');
  const [moneda, setMoneda] = useState('ARS');
  const [items, setItems] = useState<any[]>([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);
  const [clients, setClients] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.ok ? res.json() : [])
      .then(d => setClients(Array.isArray(d) ? d : (d.clients || [])))
      .catch(() => setClients([]));

    fetch('/api/dispensers')
      .then(res => res.ok ? res.json() : null)
      .then((d: any) => setAssets(d?.dispensers || []))
      .catch(() => setAssets([]));
  }, []);

  const addItemRow = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, val: any) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  };

  const totalCalculated = items.reduce(
    (acc, it) => acc + (Number(it.quantity || 0) * Number(it.unitPrice || 0)), 
    0
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return toast.error('El título es requerido');
    if (!clientId) return toast.error('Debe seleccionar la Empresa / Cliente');
    if (items.length === 0 || !items.some(i => i.description.trim())) {
      return toast.error('Debe agregar al menos un concepto a la cotización');
    }

    setSaving(true);
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo,
          descripcion,
          clientId,
          dispenserId: dispenserId.trim() ? dispenserId.trim().toUpperCase() : null,
          moneda,
          items: items.filter(i => i.description.trim()),
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar');
      }

      toast.success('Presupuesto creado con éxito');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl flex flex-col overflow-hidden">
        <div className="modal-header">
          <h2>Nuevo presupuesto técnico</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden text-sm">
          <div className="modal-body flex-1 space-y-4 overflow-y-auto">
          <div>
            <label className="label mb-1.5">Título del trabajo / presupuesto *</label>
            <input
              className="input w-full"
              placeholder="Ej. Cambio de compresor 4500 fg y presurización R410A"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Empresa / cliente *
              </label>
              <select
                className="select w-full"
                value={clientId}
                onChange={e => {
                  const newCId = e.target.value;
                  setClientId(newCId);
                  setDispenserId('');
                }}
                required
              >
                <option value="">Seleccionar empresa…</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-1.5">Equipo / activo asociado (opcional)</label>
              <select
                className="select w-full text-xs"
                value={dispenserId}
                onChange={e => {
                  const selectedId = e.target.value;
                  setDispenserId(selectedId);
                  if (selectedId && !clientId) {
                    const match = assets.find(a => a.id === selectedId);
                    const matchClient = match?.clientId || match?.location?.plant?.clientId || match?.plant?.clientId;
                    if (matchClient) setClientId(matchClient);
                  }
                }}
              >
                <option value="">Ninguno / intervención general</option>
                {assets
                  .filter(a => {
                    if (!clientId) return true;
                    const cId = a.clientId || a.location?.plant?.clientId || a.plant?.clientId;
                    return cId === clientId;
                  })
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.marca} {a.modelo} ({getEquipmentTypeLabel(a.equipmentType)})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label mb-1.5">Moneda</label>
            <select className="select w-full" value={moneda} onChange={e => setMoneda(e.target.value)}>
              <option value="ARS">Pesos argentinos (ARS)</option>
              <option value="USD">Dólares estadounidenses (USD)</option>
            </select>
          </div>

          <div>
            <label className="label mb-1.5">Descripción y justificación técnica</label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Detalles de la falla diagnosticada, necesidad de intervención..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          {/* Items breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="eyebrow">
                Desglose de mano de obra, repuestos e insumos
              </label>
              <button 
                type="button" 
                onClick={addItemRow}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Ítem
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2">
                  <input
                    className="input flex-1 text-xs"
                    placeholder="Descripción del ítem / repuesto / mano de obra"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    min="1"
                    className="input w-16 text-center text-xs font-bold"
                    placeholder="Cant."
                    value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input w-28 text-right text-xs font-mono font-bold"
                    placeholder="Unitario"
                    value={item.unitPrice}
                    onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                  <span className="w-24 text-right font-mono font-bold text-xs">
                    $ {(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                  {items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3 text-sm">
              <span className="font-medium">Total estimado</span>
              <span className="text-lg font-semibold tabular">
                {moneda} $ {totalCalculated.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Guardar borrador
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Approve with Purchase Order (OC) Modal
function ApproveOcModal({ quote, onClose, onSuccess }: { quote: any; onClose: () => void; onSuccess: () => void }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return toast.error('El número de Orden de Compra (OC) es obligatorio');

    setSaving(true);
    try {
      const res = await fetch(`/api/quotations/${quote.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          approvedBy,
          notes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al registrar aprobación');
      }

      toast.success('Orden de Compra vinculada y aprobada');
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <div className="modal-header">
          <h2>Vincular orden de compra</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleApprove} className="text-sm">
          <div className="modal-body space-y-4">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="font-semibold text-foreground">{quote.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Total: {quote.moneda} $ {quote.total.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="label mb-1.5">N° de orden de compra (OC del cliente) *</label>
            <input
              className="input font-mono uppercase"
              placeholder="Ej. OC-2026-9844 / PO-450123"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label mb-1.5">Contacto que autoriza / aprueba</label>
            <input
              className="input w-full"
              placeholder="Nombre y cargo de quien aprobó"
              value={approvedBy}
              onChange={e => setApprovedBy(e.target.value)}
            />
          </div>

          <div>
            <label className="label mb-1.5">Notas de la OC (opcional)</label>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Condiciones de pago, plazo de entrega acordado..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar aprobación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: View Quote Modal
function ViewQuoteModal({ quote, onClose }: { quote: any; onClose: () => void }) {
  const items = Array.isArray(quote.items) ? quote.items : [];
  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-lg">
        <div className="modal-header">
          <div>
            <h2>{quote.titulo}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cliente: {quote.client?.nombre}</p>
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="modal-body space-y-4 text-sm">
          {quote.orderNumber && (
            <div className="flex items-center justify-between rounded-md border border-success/25 bg-success/10 p-3 text-xs text-success">
              <div>
                <p className="font-semibold">Orden de compra {quote.orderNumber}</p>
                <p className="text-2xs opacity-80">Aprobado por: {quote.approvedBy || 'Cliente'}</p>
              </div>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          {quote.descripcion && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Descripción:</span>
              <p className="rounded-md border border-border bg-muted/40 p-3 text-[13px] text-foreground">{quote.descripcion}</p>
            </div>
          )}

          <div>
            <span className="eyebrow block mb-2">
              Ítems ({items.length})
            </span>
            <div className="space-y-2">
              {items.map((it: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5 text-[13px]">
                  <div>
                    <p className="font-semibold text-foreground">{it.description}</p>
                    <p className="text-muted-foreground text-2xs">Cantidad: {it.quantity} × $ {Number(it.unitPrice).toLocaleString()}</p>
                  </div>
                  <span className="shrink-0 font-medium tabular">
                    $ {(Number(it.quantity) * Number(it.unitPrice)).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-3 text-sm">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold tabular">
              {quote.moneda} $ {quote.total.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-outline">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
