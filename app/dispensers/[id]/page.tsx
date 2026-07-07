'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GlassWater, MapPin, Wrench, Package, Ticket,
  Clock, CheckCircle2, AlertTriangle, Archive, CalendarClock,
  ChevronRight, Loader2, X, RefreshCw, QrCode, Download, Pencil,
  PlusCircle, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import MaterialCombobox from '@/components/MaterialCombobox';
import { exportDispenserToExcel } from '@/lib/exportExcel';
import { t, getStatusColor } from '@/lib/translations';
import ChecklistModal from '@/components/ChecklistModal';
import CreateTicketModal from '@/components/CreateTicketModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import DispenserQRModal from '@/components/DispenserQRModal';

const ALL_STATUSES = ['IN_SERVICE', 'UNDER_REPAIR', 'IN_TECHNICAL_SERVICE', 'BLOCKED', 'BLOCKED_WAITING_OC', 'OUT_OF_SERVICE', 'BACKUP'];

type Tab = 'info' | 'location' | 'repairs' | 'consumables';

export default function DispenserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispenserId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showInitConsumablesModal, setShowInitConsumablesModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const { data: dispenserData, isLoading, refetch: fetchDispenser } = useQuery({
    queryKey: ['dispenser', dispenserId],
    queryFn: async () => {
      const res = await fetch(`/api/dispensers/${dispenserId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      // Fetch current month maintenance schedule
      const month = new Date().toISOString().slice(0, 7);
      const maintRes = await fetch(`/api/maintenance?dispenserId=${dispenserId}&month=${month}`);
      let currentSchedule = null;
      if (maintRes.ok) {
        const schedules = await maintRes.json();
        if (schedules.length > 0) currentSchedule = schedules[0];
      }
      return { dispenser: data, currentSchedule };
    }
  });

  const dispenser = dispenserData?.dispenser;
  const currentSchedule = dispenserData?.currentSchedule;

  if (isLoading || !dispenser) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-64 skeleton rounded-lg" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Información', icon: GlassWater },
    { key: 'location', label: 'Ubicaciones', icon: MapPin },
    { key: 'repairs', label: 'Reparaciones', icon: Wrench },
    { key: 'consumables', label: 'Consumibles', icon: Package },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Breadcrumb + Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dispensers" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Dispensers
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{dispenser.id}</span>
      </div>

      {/* Main Actions Bar (Sticky on Mobile) */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <GlassWater className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none mb-1">{dispenser.id}</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{dispenser.marca} {dispenser.modelo}</p>
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {dispenser.plant?.nombre || 'Sin Planta Dueña'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentSchedule ? (
            <button
              onClick={() => setShowChecklistModal(true)}
              className={clsx(
                "btn-sm gap-2 rounded-full px-4",
                currentSchedule.status === 'PENDING' ? "btn-primary shadow-lg shadow-primary/20" : "btn-outline text-emerald-600 border-emerald-200 bg-emerald-50"
              )}
            >
              {currentSchedule.status === 'PENDING' ? (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Hacer Mtto Mensual
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mtto Realizado
                </>
              )}
            </button>
          ) : (
            <button
              disabled
              className="btn-outline btn-sm gap-2 rounded-full opacity-50 cursor-not-allowed"
              title="No hay mantenimiento programado para este mes"
            >
              <CalendarClock className="w-4 h-4" />
              Sin Mtto Planif.
            </button>
          )}

          <button
            onClick={() => setShowTicketModal(true)}
            className="btn-outline btn-sm gap-2 rounded-full px-4 hover:border-primary/50"
          >
            <PlusCircle className="w-4 h-4 text-primary" />
            Nuevo Ticket
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Header Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <span className={clsx('badge text-sm gap-1.5 border py-1.5 px-4', getStatusColor(dispenser.status))}>
                <RefreshCw className="w-4 h-4" />
                {t(dispenser.status)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="btn-ghost btn-sm text-muted-foreground flex items-center justify-center"
                  title="Ver/Descargar QR"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  onClick={() => exportDispenserToExcel(dispenser)}
                  className="btn-ghost btn-sm text-muted-foreground"
                  title="Descargar Excel"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="btn-ghost btn-sm text-muted-foreground"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Location Detail */}
            <div className="p-4 bg-muted/30 rounded-xl border border-border/50 mb-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-background rounded-lg border">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Ubicación Actual</h3>
                  {dispenser.location ? (
                    <p className="text-sm text-muted-foreground">
                      {dispenser.location.plant?.nombre} · {dispenser.location.sector?.nombre} · {dispenser.location.nombre}
                    </p>
                  ) : (
                    <p className="text-sm text-red-500 font-medium italic">Sin ubicación asignada</p>
                  )}
                </div>
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="ml-auto text-xs text-primary font-medium hover:underline"
                >
                  Cambiar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowStatusModal(true)}
                className="btn-primary btn-sm gap-2 rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Cambiar Estado del Equipo
              </button>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="space-y-4">
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

            <div className="glass-card p-6 min-h-[300px]">
              {activeTab === 'info' && <InfoTab dispenser={dispenser} />}
              {activeTab === 'location' && <LocationTab history={dispenser.locationHistory || []} />}
              {activeTab === 'repairs' && <RepairsTab repairs={dispenser.repairHistory || []} />}
              {activeTab === 'consumables' && <ConsumablesTab consumables={dispenser.consumableHistory || []} onInitConsumables={() => setShowInitConsumablesModal(true)} />}
            </div>
          </div>
        </div>

        {/* Sidebar: Tickets & Lifecycle */}
        <div className="space-y-6">
          {/* Lifecycle Bar Card */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <CalendarClock className="w-4 h-4 text-primary" />
              Ciclo de Vida del Equipo
            </h3>
            {dispenser.lifecycleStartDate ? (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Vida Útil: {dispenser.lifecycleMonths} meses</span>
                  <span className="font-bold text-foreground">
                    {dispenser.lifecycleRemainingDays != null
                      ? `${dispenser.lifecycleRemainingDays} días restantes`
                      : 'N/A'}
                  </span>
                </div>
                <div className="lifecycle-bar h-3">
                  <div
                    className={clsx('lifecycle-fill', {
                      'bg-emerald-500': (dispenser.lifecycleRemainingDays ?? 0) > 365,
                      'bg-amber-500': (dispenser.lifecycleRemainingDays ?? 0) <= 365 && (dispenser.lifecycleRemainingDays ?? 0) > 90,
                      'bg-red-500': (dispenser.lifecycleRemainingDays ?? 0) <= 90,
                    })}
                    style={{
                      width: `${Math.min(100, Math.max(5, ((dispenser.lifecycleMonths * 30 - (dispenser.lifecycleRemainingDays ?? 0)) / (dispenser.lifecycleMonths * 30)) * 100))}%`
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center italic">
                  Inicio: {new Date(dispenser.lifecycleStartDate).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-4">No se ha registrado el inicio del ciclo.</p>
            )}
          </div>

          {/* Consumables Status Widget */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Estado de Insumos
            </h3>
            <div className="space-y-3">
              {dispenser.consumableHistory?.filter((c: any) => !c.removedAt).length > 0 ? (
                dispenser.consumableHistory
                  .filter((c: any) => !c.removedAt)
                  .map((c: any) => {
                    const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const daysLeft = c.expiresAt 
                      ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <div key={c.id} className="p-3 rounded-xl bg-muted/30 border border-transparent flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] font-bold truncate">{c.nombre}</p>
                          {daysLeft !== null && (
                            <span className={clsx(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                              isExpired ? "bg-red-100 text-red-700" : daysLeft < 30 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                            )}>
                              {isExpired ? 'VENCIDO' : `${daysLeft}d`}
                            </span>
                          )}
                        </div>
                        {c.expiresAt && (
                          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>Vence: {new Date(c.expiresAt).toLocaleDateString('es-AR')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="py-6 text-center">
                  <Package className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground italic">No hay insumos vigentes registrados</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Tickets Sidebar */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                Tickets Recientes
              </h3>
              <Link href={`/tickets?search=${dispenser.id}`} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Ver todos</Link>
            </div>
            
            <div className="space-y-3">
              {dispenser.tickets?.length > 0 ? (
                dispenser.tickets.slice(0, 5).map((ticketData: any) => (
                  <Link 
                    key={ticketData.id} 
                    href={`/tickets/${ticketData.id}`}
                    className="block p-3 rounded-xl bg-muted/30 border border-transparent hover:border-primary/20 transition-all group"
                  >
                    <p className="text-xs font-bold line-clamp-1 group-hover:text-primary transition-colors">{ticketData.reason}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ticketData.createdAt).toLocaleDateString('es-AR')}
                      </span>
                      <span className={clsx('badge text-[8px] px-1.5 py-0 border leading-tight', getStatusColor(ticketData.status))}>
                        {t(ticketData.status)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Ticket className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground italic">Sin tickets activos</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowTicketModal(true)}
              className="w-full mt-4 btn-outline btn-sm gap-2 border-dashed"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Crear Nuevo Ticket
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showStatusModal && (
        <StatusChangeModal
          currentStatus={dispenser.status}
          dispenserId={dispenser.id}
          onClose={() => setShowStatusModal(false)}
          onChanged={() => { setShowStatusModal(false); fetchDispenser(); }}
        />
      )}

      {showEditModal && (
        <EditDispenserModal
          dispenser={dispenser}
          onClose={() => setShowEditModal(false)}
          onChanged={() => { setShowEditModal(false); fetchDispenser(); }}
        />
      )}

      {showChecklistModal && currentSchedule && (
        <ChecklistModal 
          schedule={currentSchedule}
          onClose={() => setShowChecklistModal(false)}
          onSuccess={() => { setShowChecklistModal(false); fetchDispenser(); }}
        />
      )}

      {showTicketModal && (
        <CreateTicketModal 
          initialDispenserId={dispenser.id}
          onClose={() => setShowTicketModal(false)}
          onCreated={() => { setShowTicketModal(false); fetchDispenser(); }}
        />
      )}

      {showInitConsumablesModal && (
        <InitConsumablesModal
          dispenser={dispenser}
          onClose={() => setShowInitConsumablesModal(false)}
          onInitialized={() => { setShowInitConsumablesModal(false); fetchDispenser(); }}
        />
      )}

      {showQRModal && (
        <DispenserQRModal 
          dispenserId={dispenser.id}
          onClose={() => setShowQRModal(false)}
        />
      )}
    </div>
  );
}

// ─── Tabs Components (Reuse existing logic but stylized) ──────────

function InfoTab({ dispenser }: { dispenser: any }) {
  const currentConsumables = dispenser.consumableHistory?.filter((c: any) => !c.removedAt) || [];
  
  const fields = [
    { label: 'ID Dispenser', value: dispenser.id, mono: true },
    { label: 'Marca', value: dispenser.marca },
    { label: 'Modelo', value: dispenser.modelo },
    { label: 'Planta Dueña', value: dispenser.plant?.nombre || '—', mono: true },
    { label: 'N° Serie', value: dispenser.numeroSerie || '—', mono: true },
    { label: 'Vida Útil', value: `${dispenser.lifecycleMonths} meses` },
    { label: 'Inicio Ciclo', value: dispenser.lifecycleStartDate ? new Date(dispenser.lifecycleStartDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—' },
    { label: 'Fecha Compra', value: dispenser.fechaCompra ? new Date(dispenser.fechaCompra).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—' },
    { label: 'Creado el', value: new Date(dispenser.createdAt).toLocaleDateString('es-AR') },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
        {fields.map(f => (
          <div key={f.label} className="flex justify-between items-center py-2 border-b border-border/50">
            <span className="text-xs text-muted-foreground font-medium">{f.label}</span>
            <span className={clsx("text-sm font-bold", f.mono && "font-mono text-primary")}>{f.value}</span>
          </div>
        ))}
      </div>

      {currentConsumables.length > 0 && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Consumibles Vigentes</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentConsumables.map((c: any) => {
              const daysLeft = c.expiresAt 
                ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">{c.nombre}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {daysLeft != null ? (daysLeft < 0 ? 'Vencido' : `Quedan ${daysLeft} días`) : 'Sin VTO'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dispenser.notas && (
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1 text-center">Notas internas</p>
          <div className="p-3 bg-muted/30 rounded-lg text-sm text-foreground italic text-center">
            "{dispenser.notas}"
          </div>
        </div>
      )}
    </div>
  );
}

function LocationTab({ history }: { history: any[] }) {
  if (history.length === 0) return <EmptyState text="Sin historial de ubicaciones" />;
  return (
    <div className="space-y-4">
      {history.map((h, i) => (
        <div key={h.id} className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 border border-border/50 relative overflow-hidden group">
          {i === 0 && !h.removedAt && <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500"></div>}
          <div className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-110',
            i === 0 && !h.removedAt ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-background border-border text-muted-foreground'
          )}>
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-bold">
                {h.location?.plant?.nombre} — {h.location?.nombre || h.locationId}
              </p>
              {i === 0 && !h.removedAt && <span className="badge-success text-[8px] px-1.5 py-0">ACTUAL</span>}
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
              {new Date(h.assignedAt).toLocaleDateString('es-AR')}
              {h.assignedBy && ` · POR ${h.assignedBy.nombre}`}
              {h.removedAt && ` · RETIRADO: ${new Date(h.removedAt).toLocaleDateString('es-AR')}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RepairsTab({ repairs }: { repairs: any[] }) {
  if (repairs.length === 0) return <EmptyState text="Sin historial de reparaciones" />;
  return (
    <div className="space-y-4">
      {repairs.map(r => (
        <div key={r.id} className="p-4 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight mb-1">{r.descripcion}</p>
              {r.diagnostico && <p className="text-xs text-muted-foreground italic mb-2">"{r.diagnostico}"</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(r.startDate).toLocaleDateString('es-AR')}</span>
                {r.technician && <span>TÉC: {r.technician.nombre}</span>}
                {r.costo != null && <span className="text-primary">${r.costo}</span>}
              </div>
            </div>
            <span className={clsx('badge text-[10px] uppercase font-bold px-2 py-0.5', r.endDate ? 'badge-success' : 'badge-warning')}>
              {r.endDate ? 'Completada' : 'En curso'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsumablesTab({ consumables, onInitConsumables }: { consumables: any[]; onInitConsumables: () => void }) {
  const currentlyInstalled = consumables?.filter(c => !c.removedAt) || [];
  const history = consumables?.filter(c => c.removedAt) || [];

  if (currentlyInstalled.length === 0 && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl">
        <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-bold mb-2">Sin historial de consumibles</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Este dispenser no tiene consumibles inicializados. Por favor, ingresá los consumibles actuales para comenzar a trackearlos.</p>
        <button onClick={onInitConsumables} className="btn-primary">
          Ingresar Consumibles Iniciales
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentlyInstalled.length > 0 && (
        <section>
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Instalados Actualmente
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentlyInstalled.map(c => {
              const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
              const daysLeft = c.expiresAt 
                ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div key={c.id} className="flex flex-col p-4 rounded-xl bg-primary/5 border border-primary/20 shadow-sm relative overflow-hidden">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold truncate pr-2">{c.nombre}</p>
                    {c.expiresAt && (
                      <span className={clsx(
                        'text-[8px] font-bold px-2 py-0.5 rounded uppercase border',
                        isExpired ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      )}>
                        {isExpired ? 'Vencido' : 'Vigente'}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cód: {c.materialCode}</p>
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-muted-foreground uppercase">Instalado:</span>
                      <span>{new Date(c.installedAt).toLocaleDateString('es-AR')}</span>
                    </div>
                    {c.expiresAt && (
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-muted-foreground uppercase">Vencimiento:</span>
                        <span className={isExpired ? 'text-red-600' : 'text-foreground'}>{new Date(c.expiresAt).toLocaleDateString('es-AR')}</span>
                      </div>
                    )}
                    {daysLeft !== null && (
                      <div className="mt-2 pt-2 border-t border-primary/10">
                        <p className={clsx(
                          "text-[10px] font-bold uppercase tracking-tighter",
                          isExpired ? "text-red-500" : daysLeft < 30 ? "text-amber-600" : "text-primary"
                        )}>
                          {isExpired ? 'Expiró hace ' + Math.abs(daysLeft) : daysLeft + ' días restantes'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Historial de Cambios</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70">
            {history.map(c => (
              <div key={c.id} className="flex flex-col p-3 rounded-xl bg-muted/20 border border-border/50">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold truncate pr-2">{c.nombre}</p>
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-500 border border-slate-200">Retirado</span>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Cód: {c.materialCode}</p>
                  <div className="flex justify-between text-[9px] font-bold">
                    <span className="text-muted-foreground uppercase">Periodo:</span>
                    <span className="text-center">
                      {new Date(c.installedAt).toLocaleDateString('es-AR')} - {new Date(c.removedAt).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-20 flex flex-col items-center text-center opacity-40">
      <Archive className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

// ─── Status Change Modal (Styled version) ────────────────────────────
function StatusChangeModal({
  currentStatus, dispenserId, onClose, onChanged
}: {
  currentStatus: string; dispenserId: string; onClose: () => void; onChanged: () => void;
}) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newStatus === currentStatus) { onClose(); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/dispensers/${dispenserId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Error al cambiar estado');
        return;
      }
      toast.success('Estado actualizado');
      onChanged();
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
            <RefreshCw className="w-5 h-5 text-primary" />
            Cambiar Estado del Equipo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => setNewStatus(s)}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all text-left group',
                  newStatus === s
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/30 hover:bg-muted/30'
                )}
              >
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border", newStatus === s ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border")}>
                  <RefreshCw className={clsx("w-4 h-4", newStatus === s && "animate-spin-slow")} />
                </div>
                <div className="flex-1">
                  <span className={clsx("text-sm font-bold block", newStatus === s ? "text-primary" : "text-foreground")}>{t(s)}</span>
                  {s === currentStatus && <span className="text-[10px] font-bold text-muted-foreground uppercase">Estado Actual</span>}
                </div>
                {newStatus === s && <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>}
              </button>
            ))}
          </div>
          
          {(newStatus === 'BLOCKED' || newStatus === 'OUT_OF_SERVICE' || newStatus === 'BLOCKED_WAITING_OC') && (
            <div className="animate-in slide-in-from-top-2">
              <label className="text-sm font-semibold mb-1 block">Motivo del Cambio</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Explique brevemente por qué cambia el estado..."
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving || newStatus === currentStatus} 
            className="btn-primary px-8 gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar Cambio
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Dispenser Modal (Styled version) ────────────────────────────
function EditDispenserModal({
  dispenser, onClose, onChanged
}: {
  dispenser: any; onClose: () => void; onChanged: () => void;
}) {
  const [form, setForm] = useState({
    marca: dispenser.marca || '',
    modelo: dispenser.modelo || '',
    numeroSerie: dispenser.numeroSerie || '',
    fechaCompra: dispenser.fechaCompra ? new Date(dispenser.fechaCompra).toISOString().split('T')[0] : '',
    lifecycleMonths: dispenser.lifecycleMonths || 60,
    lifecycleStartDate: dispenser.lifecycleStartDate ? new Date(dispenser.lifecycleStartDate).toISOString().split('T')[0] : '',
    notas: dispenser.notas || '',
    locationId: dispenser.locationId || '',
    plantId: dispenser.plantId || '',
  });
  
  const { role } = useAuthStore();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/plants')
      .then(res => res.json())
      .then(data => setPlants(data || []))
      .catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dispensers/${dispenser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marca: form.marca,
          modelo: form.modelo,
          numeroSerie: form.numeroSerie,
          fechaCompra: form.fechaCompra ? new Date(form.fechaCompra).toISOString() : null,
          lifecycleMonths: Number(form.lifecycleMonths),
          lifecycleStartDate: form.lifecycleStartDate ? new Date(form.lifecycleStartDate).toISOString() : undefined,
          notas: form.notas,
          plantId: form.plantId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar dispenser');
      }

      if (form.locationId && form.locationId !== dispenser.locationId) {
        const assignRes = await fetch(`/api/dispensers/${dispenser.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationId: form.locationId, force: true }),
        });
        if (!assignRes.ok) {
          const err = await assignRes.json();
          throw new Error(err.error || 'Error al asignar ubicación');
        }
      }

      toast.success('Información actualizada');
      onChanged();
    } catch (error: any) {
      toast.error(error.message || 'Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Información del Equipo
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Marca</label>
              <input 
                className="input" 
                value={form.marca} 
                onChange={e => setForm({ ...form, marca: e.target.value })} 
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Modelo</label>
              <input 
                className="input" 
                value={form.modelo} 
                onChange={e => setForm({ ...form, modelo: e.target.value })} 
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Fecha de Compra</label>
              <input
                type="date"
                className="input"
                value={form.fechaCompra}
                onChange={e => setForm({ ...form, fechaCompra: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">N° Serie de Fábrica</label>
              <input
                className="input font-mono"
                value={form.numeroSerie}
                onChange={e => setForm({ ...form, numeroSerie: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block text-primary font-bold">Planta Dueña (Propiedad) *</label>
              <select
                className="select font-bold text-primary"
                value={form.plantId}
                onChange={e => setForm({ ...form, plantId: e.target.value })}
                required
              >
                <option value="">Seleccionar Planta...</option>
                {plants.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Vida Útil (meses)</label>
              <input 
                type="number" 
                className="input" 
                value={form.lifecycleMonths} 
                onChange={e => setForm({ ...form, lifecycleMonths: Number(e.target.value) })} 
              />
            </div>
            {role === 'ADMIN' && (
              <div>
                <label className="text-sm font-semibold mb-1 block">Inicio Ciclo (Admin)</label>
                <input 
                  type="date" 
                  className="input" 
                  value={form.lifecycleStartDate} 
                  onChange={e => setForm({ ...form, lifecycleStartDate: e.target.value })} 
                />
              </div>
            )}
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <label className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Ubicación de Instalación
            </label>
            <select
              className="select"
              value={form.locationId}
              onChange={e => setForm({ ...form, locationId: e.target.value })}
            >
              <option value="">-- Sin asignar / Retirado --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.plant.nombre} — {loc.nombre}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Al asignar una nueva ubicación, el equipo se marcará como instalado en dicha planta/sector.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold mb-1 block">Notas Internas</label>
            <textarea
              className="textarea"
              rows={3}
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Init Consumables Modal ─────────────────────────
function InitConsumablesModal({
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
    expirationMonths: '',
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
        expirationMonths: parseInt(form.expirationMonths) || undefined,
        cantidad: parseInt(form.cantidad) || 1,
      }]);
      setForm({ materialCode: '', nombre: '', uniqueId: '', expirationMonths: '', cantidad: '1' });
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold mb-1 block">N° Serie (Opcional)</label>
                    <input className="input" placeholder="Ej: SN-123" value={form.uniqueId} onChange={e => setForm({...form, uniqueId: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold mb-1 block">Meses Vto.</label>
                    <input type="number" className="input" placeholder="Opcional" value={form.expirationMonths} onChange={e => setForm({...form, expirationMonths: e.target.value})} />
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
