'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldCheck, Calendar, FileSignature, MapPin, Search, Filter, X, Lock, ShieldAlert, LayoutGrid, List } from 'lucide-react';
import toast from 'react-hot-toast';

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
      .then(res => res.json())
      .then(setPlants)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSignature className="w-7 h-7 text-primary" />
            </div>
            Historial de Firmas
          </h1>
          <p className="text-muted-foreground mt-1">Registro de conformidades de mantenimiento firmadas por clientes</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por cliente o equipo..." 
              className="input pl-10"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select 
              className="select pl-10"
              value={filterPlant}
              onChange={e => setFilterPlant(e.target.value)}
            >
              <option value="">Todas las plantas</option>
              {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <input 
              type="date" 
              className="input w-full cursor-pointer" 
              value={filterStart}
              onChange={e => setFilterStart(e.target.value)}
              onClick={e => (e.target as HTMLInputElement).showPicker?.()}
            />
            <span className="text-muted-foreground">—</span>
            <input 
              type="date" 
              className="input w-full cursor-pointer" 
              value={filterEnd}
              onChange={e => setFilterEnd(e.target.value)}
              onClick={e => (e.target as HTMLInputElement).showPicker?.()}
            />
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3">
            <div className="flex items-center p-1 bg-muted/50 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Vista de Tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                title="Vista de Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {(filterPlant || filterStart || filterEnd || filterSearch) && (
              <button 
                onClick={() => {
                  setFilterPlant('');
                  setFilterStart('');
                  setFilterEnd('');
                  setFilterSearch('');
                }}
                className="btn-ghost btn-sm text-red-500 gap-2"
              >
                <X className="w-4 h-4" />
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
          <ShieldCheck className="w-16 h-16 text-muted-foreground/20 mb-4" />
          <p className="text-muted-foreground font-medium text-lg">No hay firmas registradas</p>
          <p className="text-sm mt-1">
            {filterPlant || filterStart || filterEnd || filterSearch 
              ? "No se encontraron firmas que coincidan con los filtros seleccionados." 
              : "Los registros aparecerán aquí cuando los clientes completen la validación QR."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
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
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground bg-background pr-4 z-10">{month}</h2>
                <div className="h-px bg-border flex-1"></div>
                <span className="text-xs font-medium text-muted-foreground bg-background pl-4 z-10">{monthApprovals.length} {monthApprovals.length === 1 ? 'firma' : 'firmas'}</span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {monthApprovals.map((approval: any) => (
                    <div key={approval.id} className="glass-card p-5 flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-border pb-3">
                        <div>
                          <h3 className="font-bold text-lg">{approval.customerName}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(approval.createdAt).toLocaleDateString('es-AR', {
                              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {approval.signatureHash ? (
                            <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                              <Lock className="w-3 h-3" />
                              Firma Verificada
                            </div>
                          ) : (
                            <div className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                              <ShieldAlert className="w-3 h-3" />
                              Firma Legacy
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Data */}
                      <div className="space-y-2 text-sm flex-1">
                        {approval.customerIdentity && (
                          <p><span className="text-muted-foreground">DNI / ID:</span> {approval.customerIdentity}</p>
                        )}
                        <p><span className="text-muted-foreground">Técnico:</span> {approval.technician.nombre}</p>
                        <p><span className="text-muted-foreground">Equipos Validados:</span> {approval.schedules.length}</p>

                        <div className="mt-3 bg-muted/30 p-2.5 rounded-lg space-y-1.5 max-h-32 overflow-y-auto">
                          {approval.schedules.map((s: any) => (
                            <div key={s.id} className="flex flex-col text-xs">
                              <span className="font-semibold">{s.dispenser.id}</span>
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
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">Firma Dibujada</span>
                            <div className="bg-white border border-border rounded-lg p-2 h-24 flex items-center justify-center overflow-hidden mb-3">
                              <img 
                                src={approval.signatureData} 
                                alt={`Firma de ${approval.customerName}`} 
                                className="max-w-full max-h-full object-contain mix-blend-multiply" 
                              />
                            </div>
                          </>
                        )}
                        
                        {approval.signatureHash && (
                          <details className="group border border-border rounded-lg overflow-hidden bg-muted/20">
                            <summary className="text-xs font-semibold p-2.5 cursor-pointer hover:bg-muted/50 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-primary">
                                <Lock className="w-3.5 h-3.5" />
                                Certificado Digital
                              </div>
                              <span className="text-[10px] text-muted-foreground group-open:hidden">Ver detalles</span>
                            </summary>
                            <div className="p-3 border-t border-border space-y-2 text-[10px]">
                              <div>
                                <span className="text-muted-foreground block font-medium">Hash SHA-512:</span>
                                <code className="bg-background px-1.5 py-0.5 rounded border border-border/50 block break-all mt-0.5">
                                  {approval.signatureHash}
                                </code>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-muted-foreground block font-medium">Fecha y Hora:</span>
                                  <span className="font-medium">{new Date(approval.signedAt || approval.createdAt).toLocaleString('es-AR')}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block font-medium">IP Origen:</span>
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
                                  className="btn-primary btn-sm text-[10px] gap-1.5"
                                >
                                  {verifyingId === approval.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldCheck className="w-3 h-3" />
                                  )}
                                  Comprobar Integridad
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
                <div className="space-y-3">
                  {monthApprovals.map((approval: any) => (
                    <div key={approval.id} className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-3 rounded-lg flex-shrink-0">
                          <FileSignature className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-base flex items-center gap-2">
                            {approval.customerName}
                            {approval.signatureHash ? (
                              <span title="Firma Verificada"><Lock className="w-3.5 h-3.5 text-primary" /></span>
                            ) : (
                              <span title="Firma Legacy"><ShieldAlert className="w-3.5 h-3.5 text-muted-foreground" /></span>
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

                      <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-border">
                        {approval.signatureHash && (
                           <button
                             onClick={() => verifySignature(approval.id)}
                             disabled={verifyingId === approval.id}
                             className="btn-outline btn-sm text-xs gap-1.5 whitespace-nowrap w-full sm:w-auto justify-center"
                           >
                             {verifyingId === approval.id ? (
                               <Loader2 className="w-3.5 h-3.5 animate-spin" />
                             ) : (
                               <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                             )}
                             Verificar Integridad
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
