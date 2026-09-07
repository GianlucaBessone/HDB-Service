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
        return <span className="badge bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">Aprobado (OC)</span>;
      case 'SENT':
        return <span className="badge bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold">Enviado al Cliente</span>;
      case 'REJECTED':
        return <span className="badge bg-red-500/10 text-red-600 border border-red-500/20 font-bold">Rechazado</span>;
      case 'CANCELLED':
        return <span className="badge bg-muted text-muted-foreground font-bold">Cancelado</span>;
      default:
        return <span className="badge bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">Borrador</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl text-primary">
              <FileText className="w-7 h-7" />
            </div>
            Presupuestos & Órdenes de Compra
          </h1>
          <p className="text-muted-foreground mt-1">
            Cotizaciones de reparaciones mayores, mano de obra y aprobación de OC de clientes
          </p>
        </div>
        {canWrite && (
          <button onClick={() => setIsCreateOpen(true)} className="btn-primary gap-2 shrink-0">
            <Plus className="w-5 h-5" />
            Nueva Cotización
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Presupuestos</p>
            <p className="text-2xl font-bold mt-0.5">{kpis.total}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Aprobados con OC</p>
            <p className="text-2xl font-bold mt-0.5">{kpis.approved}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pendientes de OC</p>
            <p className="text-2xl font-bold mt-0.5">{kpis.pending}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Monto Facturable OC</p>
            <p className="text-xl font-bold mt-0.5 font-mono">
              $ {kpis.approvedTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, cliente, ID de activo o N° de OC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="select pl-10 min-w-[180px]"
          >
            <option value="">Todas las Empresas</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="select min-w-[170px]"
        >
          <option value="">Todos los estados</option>
          <option value="DRAFT">Borrador</option>
          <option value="SENT">Enviado</option>
          <option value="APPROVED">Aprobado (OC)</option>
          <option value="REJECTED">Rechazado</option>
        </select>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
          <FileText className="w-16 h-16 text-muted-foreground/20 mb-3" />
          <p className="text-lg font-semibold text-muted-foreground">No se encontraron cotizaciones</p>
          <p className="text-xs text-muted-foreground mt-1">Crea un nuevo presupuesto para reparaciones o repuestos mayores.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredQuotes.map((q: any) => {
            const AssetIcon = getEquipmentTypeIcon(q.dispenser?.equipmentType || 'OTHER');
            return (
              <div key={q.id} className="glass-card p-5 hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{q.titulo}</h3>
                    {getStatusBadge(q.status)}
                    {q.orderNumber && (
                      <span className="badge bg-primary/10 text-primary border border-primary/20 font-mono font-bold text-xs">
                        OC: {q.orderNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      {q.client?.nombre || 'Cliente General'}
                    </span>

                    {q.dispenser && (
                      <span className="flex items-center gap-1">
                        <AssetIcon className="w-3.5 h-3.5 text-primary" />
                        <span className="font-mono font-bold text-foreground">{q.dispenser.id}</span>
                        <span>({getEquipmentTypeLabel(q.dispenser.equipmentType)})</span>
                      </span>
                    )}

                    {q.ticket && (
                      <span className="flex items-center gap-1">
                        <Wrench className="w-3.5 h-3.5 text-amber-500" />
                        Ticket: <span className="font-mono">{q.ticket.id.slice(-6)}</span> ({q.ticket.reason})
                      </span>
                    )}

                    <span>Emitido por: {q.createdByUser?.nombre}</span>
                  </div>

                  {q.descripcion && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{q.descripcion}</p>
                  )}
                </div>

                <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Presupuestado</p>
                    <p className="text-xl font-bold font-mono text-foreground">
                      {q.moneda} $ {q.total.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setViewingQuote(q)}
                      className="btn-outline btn-sm text-xs"
                    >
                      Ver Detalle
                    </button>
                    {canApprove && q.status !== 'APPROVED' && (
                      <button 
                        onClick={() => setApprovingQuote(q)}
                        className="btn-primary btn-sm text-xs gap-1.5 shadow-sm"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nuevo Presupuesto Técnico
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          <div>
            <label className="text-xs font-semibold block mb-1">Título del Trabajo / Presupuesto *</label>
            <input
              className="input w-full"
              placeholder="Ej. Cambio de compresor 4500 Fg y presurización R410A"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Empresa / Cliente *
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
                <option value="">Seleccionar Empresa...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Equipo / Activo Asociado (Opcional)</label>
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
                <option value="">Ninguno / Intervención General</option>
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
            <label className="text-xs font-semibold block mb-1">Moneda</label>
            <select className="select w-full" value={moneda} onChange={e => setMoneda(e.target.value)}>
              <option value="ARS">Pesos Argentinos (ARS)</option>
              <option value="USD">Dólares Estadounidenses (USD)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Descripción y Justificación Técnica</label>
            <textarea
              className="textarea w-full text-xs"
              rows={2}
              placeholder="Detalles de la falla diagnosticada, necesidad de intervención..."
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </div>

          {/* Items breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Desglose de Mano de Obra, Repuestos e Insumos
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
                <div key={idx} className="flex items-center gap-2 p-2 bg-muted/20 border border-border rounded-xl">
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
                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex justify-between items-center text-sm">
              <span className="font-bold">Total Cotizado Estimado:</span>
              <span className="text-lg font-bold font-mono text-primary">
                {moneda} $ {totalCalculated.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-4 border-t border-border flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2 min-w-[130px]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Guardar Borrador
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            Vincular Orden de Compra (OC)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApprove} className="p-6 space-y-4 text-sm">
          <div className="p-3 bg-muted/20 rounded-xl border border-border">
            <p className="font-bold text-foreground">{quote.titulo}</p>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              Total: {quote.moneda} $ {quote.total.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">N° de Orden de Compra (OC del Cliente) *</label>
            <input
              className="input w-full uppercase font-mono font-bold"
              placeholder="Ej. OC-2026-9844 / PO-450123"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Contacto que Autoriza / Aprueba</label>
            <input
              className="input w-full"
              placeholder="Nombre y cargo de quien aprobó"
              value={approvedBy}
              onChange={e => setApprovedBy(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Notas de la OC (Opcional)</label>
            <textarea
              className="textarea w-full text-xs"
              rows={2}
              placeholder="Condiciones de pago, plazo de entrega acordado..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Aprobación
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{quote.titulo}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cliente: {quote.client?.nombre}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm max-h-[70vh] overflow-y-auto">
          {quote.orderNumber && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold">Orden de Compra: {quote.orderNumber}</p>
                <p className="text-[11px] opacity-80">Aprobado por: {quote.approvedBy || 'Cliente'}</p>
              </div>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          )}

          {quote.descripcion && (
            <div>
              <span className="text-xs font-semibold text-muted-foreground block mb-1">Descripción:</span>
              <p className="text-xs text-foreground bg-muted/20 p-3 rounded-lg border border-border">{quote.descripcion}</p>
            </div>
          )}

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
              Ítems Presupuestados ({items.length})
            </span>
            <div className="space-y-2">
              {items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{it.description}</p>
                    <p className="text-muted-foreground text-[11px]">Cantidad: {it.quantity} × $ {Number(it.unitPrice).toLocaleString()}</p>
                  </div>
                  <span className="font-mono font-bold">
                    $ {(Number(it.quantity) * Number(it.unitPrice)).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-muted/30 rounded-xl border border-border flex justify-between items-center text-sm font-bold">
            <span>Total:</span>
            <span className="text-lg font-mono text-primary">
              {quote.moneda} $ {quote.total.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn-outline">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
