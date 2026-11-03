'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Calendar, FileSignature, MapPin, Search, Filter, X, Lock, ShieldAlert, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Wrench, FileText } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';

export default function MaintenanceApprovalsPage() {
  const [plants, setPlants] = useState<any[]>([]);

  // Filters
  const [filterPlant, setFilterPlant] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  
  // View Toggle
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const verifySignature = async (id: string) => {
    setVerifyingId(id);
    try {
      const res = await fetch(`/api/maintenance/approvals/${id}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.valid) {
        toast.success('El certificado digital es auténtico y no ha sido modificado.');
      } else {
        toast.error('¡ATENCIÓN! La firma digital ha sido alterada o no es válida.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al verificar firma');
    } finally {
      setVerifyingId(null);
    }
  };

  const { data: approvals = [], isLoading } = useQuery<any[]>({
    queryKey: ['maintenance-approvals', filterPlant, filterStart, filterEnd, filterSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterPlant) params.set('plantId', filterPlant);
      if (filterStart) params.set('startDate', filterStart);
      if (filterEnd) params.set('endDate', filterEnd);
      if (filterSearch) params.set('search', filterSearch);

      const res = await fetch(`/api/maintenance/approvals?${params.toString()}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    }
  });

  useEffect(() => {
    fetch('/api/plants')
      .then(res => res.ok ? res.json() : [])
      .then(data => setPlants(Array.isArray(data) ? data : []))
      .catch(() => setPlants([]));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Firmas de conformidad"
        description="Conformidades de mantenimiento firmadas por los clientes."
      />

      <nav className="tabs" aria-label="Secciones de mantenimiento">
        <Link href="/maintenance" className="tab"><Wrench className="h-4 w-4" /> Planificación</Link>
        <span className="tab-active" aria-current="page"><FileSignature className="h-4 w-4" /> Firmas</span>
        <Link href="/maintenance/reports" className="tab"><FileText className="h-4 w-4" /> Reportes</Link>
      </nav>

      <div className="filter-bar">
        <div className="relative sm:col-span-2 lg:min-w-[220px] lg:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar por cliente o activo…"
            aria-label="Buscar firmas"
            className="input pl-9"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
          />
        </div>

        <div className="relative lg:w-52">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select className="select pl-9" aria-label="Planta" value={filterPlant} onChange={e => setFilterPlant(e.target.value)}>
            <option value="">Todas las plantas</option>
            {(Array.isArray(plants) ? plants : []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-1">
          <input
            type="date"
            aria-label="Desde"
            className="input min-w-0 cursor-pointer lg:w-40"
            value={filterStart}
            onChange={e => setFilterStart(e.target.value)}
            onClick={e => (e.target as HTMLInputElement).showPicker?.()}
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="date"
            aria-label="Hasta"
            className="input min-w-0 cursor-pointer lg:w-40"
            value={filterEnd}
            onChange={e => setFilterEnd(e.target.value)}
            onClick={e => (e.target as HTMLInputElement).showPicker?.()}
          />
        </div>

        <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:ml-auto lg:col-span-1">
          {(filterPlant || filterStart || filterEnd || filterSearch) && (
            <button
              onClick={() => { setFilterPlant(''); setFilterStart(''); setFilterEnd(''); setFilterSearch(''); }}
              className="btn-ghost btn-sm"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          )}
          <div className="segmented ml-auto" role="group" aria-label="Vista">
            <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'segmented-item-active' : 'segmented-item'} aria-pressed={viewMode === 'grid'} title="Vista de tarjetas">
              <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
            </button>
            <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'segmented-item-active' : 'segmented-item'} aria-pressed={viewMode === 'list'} title="Vista de lista">
              <List className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-64 rounded-lg" />)}
        </div>
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No hay firmas registradas"
          description={filterPlant || filterStart || filterEnd || filterSearch
            ? 'Ninguna firma coincide con los filtros aplicados.'
            : 'Las conformidades aparecerán aquí cuando los clientes completen la validación por QR.'}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(
            approvals.reduce((acc: any, approval) => {
              const date = new Date(approval.createdAt);
              const month = date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
              const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
              if (!acc[capitalizedMonth]) acc[capitalizedMonth] = [];
              acc[capitalizedMonth].push(approval);
              return acc;
            }, {})
          ).map(([month, monthApprovals]: [string, any]) => (
            <div key={month} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="eyebrow">{month}</h2>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground tabular">{monthApprovals.length} {monthApprovals.length === 1 ? 'firma' : 'firmas'}</span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {monthApprovals.map((approval: any) => (
                    <div key={approval.id} className="glass-card flex flex-col gap-4 p-4 sm:p-5">
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-border pb-3">
                        <div>
                          <h3 className="text-[15px] font-semibold">{approval.customerName}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(approval.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {approval.signatureHash ? (
                            <span className="badge-success"><Lock className="h-3 w-3" /> Firma con hash</span>
                          ) : (
                            <span className="badge-neutral"><ShieldAlert className="h-3 w-3" /> Firma sin hash</span>
                          )}
                        </div>
                      </div>

                      {/* Data */}
                      <div className="space-y-2 text-sm flex-1">
                        {approval.customerIdentity && (
                          <p><span className="text-muted-foreground">DNI / ID:</span> {approval.customerIdentity}</p>
                        )}
                        <p><span className="text-muted-foreground">Técnico:</span> {approval.technician.nombre}</p>
                        <p><span className="text-muted-foreground">Equipos validados:</span> {approval.schedules.length}</p>

                        <div className="mt-3 max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-border bg-muted/30 p-2.5">
                          {approval.schedules.map((s: any) => (
                            <div key={s.id} className="flex flex-col text-xs">
                              <span className="font-mono font-medium">{s.dispenser.id}</span>
                              <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {s.dispenser.location?.plant?.nombre} - {s.dispenser.location?.nombre}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Signature */}
                      <div className="pt-3 border-t border-border mt-auto">
                        {approval.signatureData && (
                          <>
                            <span className="eyebrow mb-2 block">Firma</span>
                            <div className="mb-3 flex h-24 items-center justify-center overflow-hidden rounded-md border border-border bg-white p-2">
                              <img 
                                src={approval.signatureData} 
                                alt={`Firma de ${approval.customerName}`} 
                                className="max-w-full max-h-full object-contain mix-blend-multiply" 
                              />
                            </div>
                          </>
                        )}
                        
                        {approval.signatureHash && (
                          <details className="group overflow-hidden rounded-md border border-border">
                            <summary className="text-xs font-semibold p-2.5 cursor-pointer hover:bg-muted/50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-foreground">
                                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                Certificado digital
                              </div>
                              <span className="text-2xs text-muted-foreground group-open:hidden">Ver detalles</span>
                            </summary>
                            <div className="p-3 border-t border-border space-y-2 text-2xs">
                              <div>
                                <span className="text-muted-foreground block font-medium">Hash SHA-512:</span>
                                <code className="bg-background px-1.5 py-0.5 rounded border border-border/50 block break-all mt-0.5">
                                  {approval.signatureHash}
                                </code>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground block font-medium">Fecha y hora:</span>
                                  <span className="font-medium">{new Date(approval.signedAt || approval.createdAt).toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block font-medium">IP origen:</span>
                                  <span className="font-medium">{approval.ipAddress || 'Registrada'}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-muted-foreground block font-medium">Dispositivo:</span>
                                  <span className="font-medium truncate block" title={approval.deviceInfo || 'Desconocido'}>
                                    {approval.deviceInfo || 'Desconocido'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => verifySignature(approval.id)}
                                  disabled={verifyingId === approval.id}
                                  className="btn-outline btn-sm"
                                >
                                  {verifyingId === approval.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3 h-3" />
                                  )}
                                  Verificar integridad
                                </button>
                              </div>
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card divide-y divide-border overflow-hidden">
                  {monthApprovals.map((approval: any) => (
                    <div key={approval.id} className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <FileSignature className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <h3 className="flex items-center gap-2 text-sm font-semibold">
                            {approval.customerName}
                            {approval.signatureHash ? (
                              <span title="Firma con hash"><Lock className="h-3.5 w-3.5 text-success" /></span>
                            ) : (
                              <span title="Firma sin hash"><ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" /></span>
                            )}
                          </h3>
                          <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(approval.createdAt).toLocaleDateString('es-AR', {
                                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                            {approval.customerIdentity && (
                              <span className="hidden sm:inline border-l border-border pl-3">DNI: {approval.customerIdentity}</span>
                            )}
                            <span className="hidden sm:inline border-l border-border pl-3">Técnico: {approval.technician.nombre}</span>
                            <span className="hidden sm:inline border-l border-border pl-3">Equipos: {approval.schedules.length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
                        {approval.signatureHash && (
                           <button
                             onClick={() => verifySignature(approval.id)}
                             disabled={verifyingId === approval.id}
                             className="btn-outline btn-sm w-full sm:w-auto"
                           >
                             {verifyingId === approval.id ? (
                               <Loader2 className="w-3.5 h-3.5 animate-spin" />
                             ) : (
                               <ShieldCheck className="h-3.5 w-3.5" />
                             )}
                             Verificar integridad
                           </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
