'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, GlassWater, MapPin, Wrench, Package, Ticket,
  Clock, CheckCircle2, AlertTriangle, Archive, CalendarClock,
  ChevronRight, Loader2, X, RefreshCw, QrCode, Download, Pencil,
  PlusCircle, ShieldCheck, SlidersHorizontal, Wind, Snowflake, Fan, Cpu, Layers, Building2
} from 'lucide-react';
import clsx from 'clsx';
import PageHeader from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import MaterialCombobox from '@/components/MaterialCombobox';
import { exportDispenserToExcel } from '@/lib/exportExcel';
import { t, getStatusColor } from '@/lib/translations';
import ChecklistModal from '@/components/ChecklistModal';
import CreateTicketModal from '@/components/CreateTicketModal';
import { useAuthStore } from '@/lib/store/useAuthStore';
import DispenserQRModal from '@/components/DispenserQRModal';
import InitConsumablesModal from '@/components/InitConsumablesModal';
import {
  EquipmentType,
  AssetCriticality,
  EQUIPMENT_TYPE_LABELS,
  CRITICALITY_LABELS,
  CRITICALITY_COLORS,
  SPEC_FIELDS_BY_TYPE,
  getEquipmentTypeLabel,
  getCriticalityColor,
  getCriticalityLabel
} from '@/lib/equipment';
import { getEquipmentIcon } from '../page';

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

  const EquipmentIcon = getEquipmentIcon(dispenser.equipmentType);

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'info', label: 'Información', icon: EquipmentIcon },
    { key: 'location', label: 'Ubicaciones', icon: MapPin },
    { key: 'repairs', label: 'Reparaciones', icon: Wrench },
    { key: 'consumables', label: 'Consumibles', icon: Package },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        backHref="/dispensers"
        backLabel="Activos"
        eyebrow={getEquipmentTypeLabel(dispenser.equipmentType)}
        title={<span className="font-mono">{dispenser.id}</span>}
        meta={
          <>
            <span className={clsx('badge', getStatusColor(dispenser.status))}>{t(dispenser.status)}</span>
            <span className={clsx('badge', getCriticalityColor(dispenser.criticality))}>Criticidad {getCriticalityLabel(dispenser.criticality).toLowerCase()}</span>
            <span className="text-[13px] text-muted-foreground">{dispenser.marca} {dispenser.modelo}</span>
          </>
        }
        actions={
          <>
            <button onClick={() => setShowTicketModal(true)} className="btn-outline">
              <PlusCircle className="h-4 w-4" />
              Nuevo ticket
            </button>
            {currentSchedule ? (
              currentSchedule.status === 'PENDING' ? (
                <button onClick={() => setShowChecklistModal(true)} className="btn-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Realizar mantenimiento
                </button>
              ) : (
                <button onClick={() => setShowChecklistModal(true)} className="btn-outline text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Mantenimiento realizado
                </button>
              )
            ) : (
              <button disabled className="btn-outline" title="No hay mantenimiento programado para este mes">
                <CalendarClock className="h-4 w-4" />
                Sin mantenimiento este mes
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Resumen operativo */}
          <section className="glass-card">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="eyebrow">Ubicación actual</p>
                  {dispenser.location ? (
                    <p className="mt-1 text-sm text-foreground">
                      {dispenser.location.plant?.nombre} · {dispenser.location.sector?.nombre} · {dispenser.location.nombre}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-destructive">Sin ubicación asignada</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Planta dueña: {dispenser.plant?.nombre || 'sin definir'}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => setShowQRModal(true)} className="btn-icon btn-ghost" title="Ver / descargar QR" aria-label="Ver o descargar QR">
                  <QrCode className="h-4 w-4" />
                </button>
                <button onClick={() => exportDispenserToExcel(dispenser)} className="btn-icon btn-ghost" title="Descargar Excel" aria-label="Descargar Excel">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => setShowEditModal(true)} className="btn-icon btn-ghost" title="Editar activo" aria-label="Editar activo">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:px-5">
              <button onClick={() => setShowStatusModal(true)} className="btn-outline">
                <RefreshCw className="h-4 w-4" />
                Cambiar estado
              </button>
              <button onClick={() => setShowEditModal(true)} className="btn-ghost">
                <MapPin className="h-4 w-4" />
                Cambiar ubicación
              </button>
            </div>
          </section>

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
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="glass-card min-h-[300px] p-4 sm:p-5">
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
          <div className="glass-card p-4 sm:p-5">
            <h3 className="panel-title mb-4">Ciclo de vida</h3>
            {dispenser.lifecycleStartDate ? (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Vida útil: {dispenser.lifecycleMonths} meses</span>
                  <span className="font-medium text-foreground tabular">
                    {dispenser.lifecycleRemainingDays != null
                      ? `${dispenser.lifecycleRemainingDays} días restantes`
                      : '—'}
                  </span>
                </div>
                <div className="lifecycle-bar h-2">
                  <div
                    className={clsx('lifecycle-fill', {
                      'bg-success': (dispenser.lifecycleRemainingDays ?? 0) > 365,
                      'bg-warning': (dispenser.lifecycleRemainingDays ?? 0) <= 365 && (dispenser.lifecycleRemainingDays ?? 0) > 90,
                      'bg-destructive': (dispenser.lifecycleRemainingDays ?? 0) <= 90,
                    })}
                    style={{
                      width: `${Math.min(100, Math.max(5, ((dispenser.lifecycleMonths * 30 - (dispenser.lifecycleRemainingDays ?? 0)) / (dispenser.lifecycleMonths * 30)) * 100))}%`
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground tabular">
                  Inicio: {new Date(dispenser.lifecycleStartDate).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                </p>
              </div>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">Sin fecha de inicio de ciclo.</p>
            )}
          </div>

          {/* Consumables Status Widget */}
          <div className="glass-card p-4 sm:p-5">
            <h3 className="panel-title mb-3">Insumos vigentes</h3>
            <div className="divide-y divide-border">
              {dispenser.consumableHistory?.filter((c: any) => !c.removedAt).length > 0 ? (
                dispenser.consumableHistory
                  .filter((c: any) => !c.removedAt)
                  .map((c: any) => {
                    const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                    const daysLeft = c.expiresAt 
                      ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null;
                    
                    return (
                      <div key={c.id} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-medium">{c.nombre}</p>
                          {daysLeft !== null && (
                            <span className={clsx(
                              'badge tabular',
                              isExpired ? 'badge-danger' : daysLeft < 30 ? 'badge-warning' : 'badge-success'
                            )}>
                              {isExpired ? 'Vencido' : `${daysLeft} d`}
                            </span>
                          )}
                        </div>
                        {c.expiresAt && (
                          <div className="flex justify-between items-center text-2xs text-muted-foreground">
                            <span>Vence: {new Date(c.expiresAt).toLocaleDateString('es-AR')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <p className="py-2 text-sm text-muted-foreground">Sin insumos vigentes registrados.</p>
              )}
            </div>
          </div>

          {/* Recent Tickets Sidebar */}
          <div className="glass-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="panel-title">Tickets recientes</h3>
              <Link href={`/tickets?search=${dispenser.id}`} className="text-xs font-medium text-primary hover:underline">Ver todos</Link>
            </div>

            <div className="divide-y divide-border">
              {dispenser.tickets?.length > 0 ? (
                dispenser.tickets.slice(0, 5).map((ticketData: any) => (
                  <Link 
                    key={ticketData.id} 
                    href={`/tickets/${ticketData.id}`}
                    className="group block py-2.5 first:pt-0"
                  >
                    <p className="line-clamp-1 text-[13px] font-medium group-hover:text-primary">{ticketData.reason}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground tabular">
                        {new Date(ticketData.createdAt).toLocaleDateString('es-AR')}
                      </span>
                      <span className={clsx('badge', getStatusColor(ticketData.status))}>
                        {t(ticketData.status)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="py-2 text-sm text-muted-foreground">Sin tickets registrados.</p>
              )}
            </div>

            <button 
              onClick={() => setShowTicketModal(true)}
              className="btn-outline btn-sm mt-4 w-full"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Crear ticket
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
  const clientName = dispenser.client?.nombre || dispenser.plant?.client?.nombre || dispenser.location?.plant?.client?.nombre || '—';

  const fields = [
    { label: 'ID del activo', value: dispenser.id, mono: true },
    { label: 'Tipo de activo', value: getEquipmentTypeLabel(dispenser.equipmentType) },
    { label: 'Criticidad operativa', value: getCriticalityLabel(dispenser.criticality) },
    { label: 'Empresa / cliente', value: clientName },
    { label: 'Marca', value: dispenser.marca },
    { label: 'Modelo', value: dispenser.modelo },
    { label: 'Planta dueña', value: dispenser.plant?.nombre || '—' },
    { label: 'N.º de serie', value: dispenser.numeroSerie || '—', mono: true },
    { label: 'Vida útil', value: `${dispenser.lifecycleMonths} meses` },
    { label: 'Inicio de ciclo', value: dispenser.lifecycleStartDate ? new Date(dispenser.lifecycleStartDate).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—' },
    { label: 'Fecha de compra', value: dispenser.fechaCompra ? new Date(dispenser.fechaCompra).toLocaleDateString('es-AR', { timeZone: 'UTC' }) : '—' },
    { label: 'Alta en sistema', value: new Date(dispenser.createdAt).toLocaleDateString('es-AR') },
  ];

  const specFields = SPEC_FIELDS_BY_TYPE[dispenser.equipmentType as EquipmentType] || [];
  const technicalSpecs = dispenser.technicalSpecs || {};
  const hasSpecs = Object.keys(technicalSpecs).length > 0;

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {fields.map(f => (
          <div key={f.label} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
            <dt className="shrink-0 text-[13px] text-muted-foreground">{f.label}</dt>
            <dd className={clsx('min-w-0 truncate text-right text-sm font-medium', f.mono && 'font-mono')}>{f.value}</dd>
          </div>
        ))}
      </dl>

      {hasSpecs && (
        <section className="rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
            <h4 className="eyebrow">Ficha técnica</h4>
            <span className="text-xs text-muted-foreground">{getEquipmentTypeLabel(dispenser.equipmentType)}</span>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 px-4 py-1 sm:grid-cols-2">
            {Object.entries(technicalSpecs).map(([key, val]) => {
              if (val === null || val === undefined || val === '') return null;
              const def = specFields.find(f => f.key === key);
              const label = def ? def.label : key;
              const unit = def?.unit ? ` ${def.unit}` : '';
              return (
                <div key={key} className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-[13px] last:border-0 sm:[&:nth-last-child(2)]:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right font-medium tabular">{String(val)}{unit}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      )}

      {currentConsumables.length > 0 && (
        <section>
          <h4 className="eyebrow mb-2">Consumibles vigentes</h4>
          <ul className="divide-y divide-border rounded-md border border-border">
            {currentConsumables.map((c: any) => {
              const daysLeft = c.expiresAt
                ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]">
                  <span className="font-medium">{c.nombre}</span>
                  <span className={clsx('shrink-0 text-xs tabular', daysLeft != null && daysLeft < 0 ? 'font-medium text-destructive' : 'text-muted-foreground')}>
                    {daysLeft != null ? (daysLeft < 0 ? 'Vencido' : `${daysLeft} días`) : 'Sin vencimiento'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {dispenser.notas && (
        <section>
          <h4 className="eyebrow mb-2">Notas internas</h4>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm">{dispenser.notas}</p>
        </section>
      )}
    </div>
  );
}

function LocationTab({ history }: { history: any[] }) {
  if (history.length === 0) return <EmptyState text="Sin historial de ubicaciones" />;
  return (
    <ol className="space-y-0">
      {history.map((h, i) => {
        const isCurrent = i === 0 && !h.removedAt;
        return (
          <li key={h.id} className="relative pb-5 pl-6 last:pb-0">
            {i !== history.length - 1 && <span className="absolute bottom-0 left-[5px] top-4 w-px bg-border" aria-hidden="true" />}
            <span className={clsx('absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2', isCurrent ? 'border-success bg-success' : 'border-border bg-card')} aria-hidden="true" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{h.location?.plant?.nombre} · {h.location?.nombre || h.locationId}</p>
              {isCurrent && <span className="badge-success">Actual</span>}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground tabular">
              {new Date(h.assignedAt).toLocaleDateString('es-AR')}
              {h.assignedBy && ` · por ${h.assignedBy.nombre}`}
              {h.removedAt && ` · retirado el ${new Date(h.removedAt).toLocaleDateString('es-AR')}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function RepairsTab({ repairs }: { repairs: any[] }) {
  if (repairs.length === 0) return <EmptyState text="Sin historial de reparaciones" />;
  return (
    <ul className="divide-y divide-border">
      {repairs.map(r => (
        <li key={r.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug">{r.descripcion}</p>
            {r.diagnostico && <p className="mt-0.5 text-[13px] text-muted-foreground">{r.diagnostico}</p>}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular"><Clock className="h-3 w-3" /> {new Date(r.startDate).toLocaleDateString('es-AR')}</span>
              {r.technician && <span>Técnico: {r.technician.nombre}</span>}
              {r.costo != null && <span className="font-medium text-foreground tabular">${r.costo}</span>}
            </div>
          </div>
          <span className={clsx('badge shrink-0', r.endDate ? 'badge-success' : 'badge-warning')}>
            {r.endDate ? 'Completada' : 'En curso'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ConsumablesTab({ consumables, onInitConsumables }: { consumables: any[]; onInitConsumables: () => void }) {
  const currentlyInstalled = consumables?.filter(c => !c.removedAt) || [];
  const history = consumables?.filter(c => c.removedAt) || [];

  if (currentlyInstalled.length === 0 && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border px-6 py-12 text-center">
        <Package className="mb-3 h-6 w-6 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Sin consumibles registrados</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Cargá los insumos instalados para hacer seguimiento de su vencimiento.</p>
        <button onClick={onInitConsumables} className="btn-primary mt-4">
          Registrar consumibles
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentlyInstalled.length > 0 && (
        <section>
          <h4 className="eyebrow mb-2">Instalados</h4>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th className="hidden sm:table-cell">Código</th>
                  <th>Instalado</th>
                  <th>Vencimiento</th>
                  <th className="text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {currentlyInstalled.map(c => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
                  const daysLeft = c.expiresAt
                    ? Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <tr key={c.id}>
                      <td className="font-medium">{c.nombre}</td>
                      <td className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{c.materialCode}</td>
                      <td className="text-[13px] tabular">{new Date(c.installedAt).toLocaleDateString('es-AR')}</td>
                      <td className={clsx('text-[13px] tabular', isExpired && 'font-medium text-destructive')}>
                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('es-AR') : '—'}
                      </td>
                      <td className="text-right">
                        {daysLeft === null ? (
                          <span className="badge-neutral">Sin vencimiento</span>
                        ) : (
                          <span className={clsx('badge tabular', isExpired ? 'badge-danger' : daysLeft < 30 ? 'badge-warning' : 'badge-success')}>
                            {isExpired ? `Vencido hace ${Math.abs(daysLeft)} d` : `${daysLeft} d restantes`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h4 className="eyebrow mb-2">Historial de cambios</h4>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th className="hidden sm:table-cell">Código</th>
                  <th>Período</th>
                </tr>
              </thead>
              <tbody>
                {history.map(c => (
                  <tr key={c.id} className="text-muted-foreground">
                    <td className="font-medium text-foreground">{c.nombre}</td>
                    <td className="hidden font-mono text-xs sm:table-cell">{c.materialCode}</td>
                    <td className="text-[13px] tabular">
                      {new Date(c.installedAt).toLocaleDateString('es-AR')} – {new Date(c.removedAt).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <Archive className="mb-3 h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
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
    <div className="modal-overlay">
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cambiar estado del activo</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="Nuevo estado">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                role="radio"
                aria-checked={newStatus === s}
                onClick={() => setNewStatus(s)}
                className={clsx(
                  'flex min-h-[44px] items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                  newStatus === s ? 'border-primary bg-primary/[0.06]' : 'border-border hover:bg-accent'
                )}
              >
                <span className={clsx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', newStatus === s ? 'border-primary' : 'border-input')}>
                  {newStatus === s && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="flex-1 text-sm font-medium">{t(s)}</span>
                {s === currentStatus && <span className="badge-neutral">Actual</span>}
              </button>
            ))}
          </div>
          
          {(newStatus === 'BLOCKED' || newStatus === 'OUT_OF_SERVICE' || newStatus === 'BLOCKED_WAITING_OC') && (
            <div className="animate-in slide-in-from-top-2">
              <label className="label mb-1.5">Motivo del cambio</label>
              <textarea
                className="textarea"
                rows={2}
                placeholder="Motivo del cambio de estado…"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving || newStatus === currentStatus} 
            className="btn-primary"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar cambio
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
    equipmentType: (dispenser.equipmentType || 'DISPENSER') as EquipmentType,
    criticality: (dispenser.criticality || 'MEDIUM') as AssetCriticality,
    technicalSpecs: (dispenser.technicalSpecs || {}) as Record<string, any>,
    numeroSerie: dispenser.numeroSerie || '',
    fechaCompra: dispenser.fechaCompra ? new Date(dispenser.fechaCompra).toISOString().split('T')[0] : '',
    lifecycleMonths: dispenser.lifecycleMonths || 60,
    lifecycleStartDate: dispenser.lifecycleStartDate ? new Date(dispenser.lifecycleStartDate).toISOString().split('T')[0] : '',
    notas: dispenser.notas || '',
    locationId: dispenser.locationId || '',
    clientId: dispenser.clientId || dispenser.plant?.clientId || '',
    plantId: dispenser.plantId || '',
  });
  
  const { role } = useAuthStore();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => setLocations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    fetch('/api/clients')
      .then(res => res.ok ? res.json() : [])
      .then(data => setClients(Array.isArray(data) ? data : (data.clients || [])))
      .catch(err => console.error(err));

    fetch('/api/plants')
      .then(res => res.json())
      .then(data => setPlants(data || []))
      .catch(err => console.error(err));
  }, []);

  const handleSpecChange = (key: string, value: any) => {
    setForm(p => ({
      ...p,
      technicalSpecs: { ...p.technicalSpecs, [key]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dispensers/${dispenser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marca: form.marca,
          modelo: form.modelo,
          equipmentType: form.equipmentType,
          criticality: form.criticality,
          technicalSpecs: form.technicalSpecs,
          numeroSerie: form.numeroSerie,
          fechaCompra: form.fechaCompra ? new Date(form.fechaCompra).toISOString() : null,
          lifecycleMonths: Number(form.lifecycleMonths),
          lifecycleStartDate: form.lifecycleStartDate ? new Date(form.lifecycleStartDate).toISOString() : undefined,
          notas: form.notas,
          clientId: form.clientId || null,
          plantId: form.plantId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al actualizar equipo');
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

  const activeSpecFields = SPEC_FIELDS_BY_TYPE[form.equipmentType] || [];

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="modal-header shrink-0">
          <h2>Editar información del activo</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body space-y-4 overflow-y-auto flex-1">
          {/* Categoría y Criticidad */}
          <div className="grid grid-cols-1 gap-4 rounded-md border border-border bg-muted/30 p-3 sm:grid-cols-2">
            <div>
              <label className="label mb-1.5">Tipo de activo</label>
              <select
                className="select"
                value={form.equipmentType}
                onChange={e => setForm({ ...form, equipmentType: e.target.value as EquipmentType })}
              >
                {Object.entries(EQUIPMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label mb-1.5">Criticidad</label>
              <select
                className="select"
                value={form.criticality}
                onChange={e => setForm({ ...form, criticality: e.target.value as AssetCriticality })}
              >
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as AssetCriticality[]).map(crit => (
                  <option key={crit} value={crit}>{CRITICALITY_LABELS[crit]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5">Marca</label>
              <input 
                className="input" 
                value={form.marca} 
                onChange={e => setForm({ ...form, marca: e.target.value })} 
              />
            </div>
            <div>
              <label className="label mb-1.5">Modelo</label>
              <input 
                className="input" 
                value={form.modelo} 
                onChange={e => setForm({ ...form, modelo: e.target.value })} 
              />
            </div>
            <div>
              <label className="label mb-1.5">Fecha de compra</label>
              <input
                type="date"
                className="input"
                value={form.fechaCompra}
                onChange={e => setForm({ ...form, fechaCompra: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1.5">N° serie de fábrica</label>
              <input
                className="input font-mono"
                value={form.numeroSerie}
                onChange={e => setForm({ ...form, numeroSerie: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1.5">Empresa / cliente *
              </label>
              <select
                className="select"
                value={form.clientId}
                onChange={e => {
                  const newClientId = e.target.value;
                  setForm(p => ({
                    ...p,
                    clientId: newClientId,
                    plantId: plants.some(pl => pl.id === p.plantId && pl.clientId === newClientId) ? p.plantId : ''
                  }));
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
              <label className="label mb-1.5">Planta dueña (propiedad) *</label>
              <select
                className="select"
                value={form.plantId}
                onChange={e => {
                  const selectedPlant = plants.find(p => p.id === e.target.value);
                  setForm(p => ({ 
                    ...p, 
                    plantId: e.target.value,
                    clientId: selectedPlant?.clientId || p.clientId 
                  }));
                }}
                required
              >
                <option value="">
                  {form.clientId ? 'Seleccionar planta del cliente…' : 'Seleccionar planta…'}
                </option>
                {plants
                  .filter(p => !form.clientId || p.clientId === form.clientId)
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label mb-1.5">Vida útil (meses)</label>
              <input 
                type="number" 
                className="input" 
                value={form.lifecycleMonths} 
                onChange={e => setForm({ ...form, lifecycleMonths: Number(e.target.value) })} 
              />
            </div>
            {role === 'ADMIN' && (
              <div className="sm:col-span-2">
                <label className="label mb-1.5">Inicio ciclo (admin)</label>
                <input 
                  type="date" 
                  className="input" 
                  value={form.lifecycleStartDate} 
                  onChange={e => setForm({ ...form, lifecycleStartDate: e.target.value })} 
                />
              </div>
            )}
          </div>

          {/* Dynamic Technical Specs in Edit */}
          {activeSpecFields.length > 0 && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <h4 className="eyebrow">
                Ficha técnica ({getEquipmentTypeLabel(form.equipmentType)})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeSpecFields.map(field => {
                  const value = form.technicalSpecs[field.key] || '';
                  if (field.type === 'select') {
                    return (
                      <div key={field.key}>
                        <label className="label mb-1.5">{field.label}</label>
                        <select
                          className="select"
                          value={value}
                          onChange={e => handleSpecChange(field.key, e.target.value)}
                        >
                          <option value="">Seleccionar…</option>
                          {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={field.key}>
                      <label className="label mb-1.5">
                        {field.label} {field.unit && <span className="text-muted-foreground font-normal">({field.unit})</span>}
                      </label>
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        className="input"
                        placeholder={field.placeholder || ''}
                        value={value}
                        onChange={e => handleSpecChange(field.key, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-md border border-border bg-muted/30 p-4">
            <label className="label mb-1.5">
              Ubicación de instalación
            </label>
            <select
              className="select"
              value={form.locationId}
              onChange={e => setForm({ ...form, locationId: e.target.value })}
            >
              <option value="">-- Sin asignar / retirado --</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.plant.nombre} — {loc.nombre}
                </option>
              ))}
            </select>
            <p className="field-hint mt-2">
              Al asignar una nueva ubicación, el equipo se marcará como instalado en dicha planta/sector.
            </p>
          </div>

          <div>
            <label className="label mb-1.5">Notas internas</label>
            <textarea
              className="textarea"
              rows={3}
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-footer shrink-0">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8 gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

