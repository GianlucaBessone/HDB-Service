'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Settings, Building2, MapPin, Layers, Plus, ChevronRight,
  ChevronDown, X, Loader2, Edit2, Trash2, GlassWater,
  Download, FileSpreadsheet
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { useConfigStore } from '@/lib/store/useConfigStore';
import ConfirmModal from '@/components/ConfirmModal';

type Client = { id: string; nombre: string; email: string | null; telefono: string | null; active: boolean };
type Plant = { id: string; nombre: string; direccion: string | null; clientId: string; _count: { locations: number } };
type Sector = { id: string; nombre: string; _count?: { locations: number; plants: number } };
type Location = {
  id: string; nombre: string; piso: string | null;
  plant: { id: string; nombre: string; client: { nombre: string } };
  sector: { id: string; nombre: string } | null;
  dispensers: { id: string; marca: string; modelo: string; status: string }[];
};

type ActiveSection = 'clients' | 'plants' | 'sectors' | 'locations';



export default function ConfigPage() {
  const [section, setSection] = useState<ActiveSection>('plants');
  const { fetchClients, fetchPlants, fetchSectors, fetchLocations } = useConfigStore();

  useEffect(() => {
    // Pre-fetch in background to keep cache warm
    fetchClients();
    fetchPlants();
    fetchSectors();
    fetchLocations();
  }, [fetchClients, fetchPlants, fetchSectors, fetchLocations]);

  const navItems: { key: ActiveSection; label: string; icon: React.ElementType }[] = [
    { key: 'clients', label: 'Clientes', icon: Building2 },
    { key: 'plants', label: 'Plantas', icon: Building2 },
    { key: 'sectors', label: 'Sectores', icon: Layers },
    { key: 'locations', label: 'Ubicaciones', icon: MapPin },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Settings className="w-7 h-7 text-primary" />
          </div>
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">Gestión de clientes, plantas, sectores y ubicaciones</p>
      </div>

      {/* Section Tabs */}
      <div className="tabs">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setSection(item.key)}
              className={section === item.key ? 'tab-active' : 'tab'}
            >
              <Icon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {section === 'clients' && <ClientsSection />}
      {section === 'plants' && <PlantsSection />}
      {section === 'sectors' && <SectorsSection />}
      {section === 'locations' && <LocationsSection />}
    </div>
  );
}

// ─── Clients Section ────────────────────────────────
function ClientsSection() {
  const { clients, fetchClients } = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (clients.length === 0) {
      setIsLoading(true);
      fetchClients().finally(() => setIsLoading(false));
    }
  }, [clients.length, fetchClients]);

  const handleDelete = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Cliente eliminado');
      fetchClients(true); // Force refresh cache
    } catch { toast.error('Error al eliminar cliente'); }
    finally {
      setIsDeleting(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => { setEditingClient(null); setShowModal(true); }} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : clients.length === 0 ? (
        <EmptyState icon={Building2} text="Sin clientes registrados" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} className="glass-card-hover p-5 flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg">{c.nombre}</h3>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingClient(c); setShowModal(true); }}
                      className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setClientToDelete(c.id)}
                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {c.email && <p className="text-sm text-muted-foreground mt-1">{c.email}</p>}
                {c.telefono && <p className="text-sm text-muted-foreground">{c.telefono}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title={editingClient ? "Editar Cliente" : "Nuevo Cliente"}
          initialData={editingClient ? {
            nombre: editingClient.nombre,
            email: editingClient.email || '',
            telefono: editingClient.telefono || '',
            direccion: (editingClient as any).direccion || '',
          } : undefined}
          fields={[
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'email', label: 'Email' },
            { name: 'telefono', label: 'Teléfono' },
            { name: 'direccion', label: 'Dirección' },
          ]}
          onClose={() => { setShowModal(false); setEditingClient(null); }}
          onSubmit={async (data) => {
            const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
            const method = editingClient ? 'PUT' : 'POST';
            const res = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(editingClient ? 'Cliente actualizado' : 'Cliente creado');
            fetchClients(true);
          }}
        />
      )}

      {clientToDelete && (
        <ConfirmModal
          title="Eliminar Cliente"
          description="¿Estás seguro de que deseas eliminar este cliente? Esta acción lo desactivará del sistema."
          onConfirm={handleDelete}
          onClose={() => setClientToDelete(null)}
          isLoading={isDeleting}
          confirmLabel="Eliminar"
          variant="danger"
        />
      )}
    </div>
  );
}

// ─── Plants Section ─────────────────────────────────
function PlantsSection() {
  const { plants, locations, fetchPlants, fetchLocations } = useConfigStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState<any>(null); // null, 'new', or plant object
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);

  useEffect(() => {
    if (plants.length === 0) {
      setIsLoading(true);
      fetchPlants().finally(() => setIsLoading(false));
    }
    if (locations.length === 0) {
      fetchLocations();
    }
    fetch('/api/clients').then(res => res.json()).then(setClients).catch(console.error);
  }, [plants.length, locations.length, fetchPlants, fetchLocations]);

  // Group locations by plantId for instant access
  const locationsByPlant = useMemo(() => {
    const map: Record<string, any[]> = {};
    locations.forEach(loc => {
      if (!loc.plant?.id) return;
      if (!map[loc.plant.id]) map[loc.plant.id] = [];
      map[loc.plant.id].push(loc);
    });
    return map;
  }, [locations]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/plants/${deleteConfirm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Planta eliminada');
      fetchPlants(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal('new')} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nueva Planta
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : plants.length === 0 ? (
        <EmptyState icon={Building2} text="Sin plantas registradas" />
      ) : (
        <div className="space-y-2">
          {plants.map((p: any) => {
            const myLocations = locationsByPlant[p.id] || [];
            const isExpanded = expandedPlant === p.id;
            
            return (
              <div key={p.id} className="glass-card overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => setExpandedPlant(isExpanded ? null : p.id)}
                    className="flex-1 px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-primary" />
                      <div className="text-left">
                        <span className="font-semibold">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {myLocations.length} ubicaciones
                        </span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-1 pr-4">
                    <button
                      onClick={() => setShowModal(p)}
                      className="btn-ghost btn-icon"
                      title="Editar Planta"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(p)}
                      className="btn-ghost btn-icon"
                      title="Eliminar Planta"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-4 border-t border-border animate-in slide-in-from-top-1 duration-200">
                    <div className="mt-3 space-y-2">
                      {myLocations.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Sin ubicaciones en esta planta</p>
                      ) : (
                        myLocations.map((loc: any) => (
                          <div key={loc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{loc.nombre}</span>
                              {loc.sector && (
                                <span className="badge-neutral text-xs">{loc.sector.nombre}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {loc.dispensers?.length > 0 ? (
                                <span className="badge-success text-xs gap-1">
                                  <GlassWater className="w-3 h-3" />
                                  {loc.dispensers[0].id}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Vacía</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title={showModal === 'new' ? "Nueva Planta" : "Editar Planta"}
          initialData={showModal === 'new' ? undefined : {
            nombre: showModal.nombre,
            direccion: showModal.direccion || '',
            clientId: showModal.clientId
          }}
          fields={[
            { name: 'clientId', label: 'Cliente *', type: 'select', options: clients.map(c => ({ value: c.id, label: c.nombre })), required: true },
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'direccion', label: 'Dirección' },
          ]}
          onClose={() => setShowModal(null)}
          onSubmit={async (data) => {
            const isEdit = showModal !== 'new';
            const url = isEdit ? `/api/plants/${showModal.id}` : '/api/plants';
            const res = await fetch(url, {
              method: isEdit ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(isEdit ? 'Planta actualizada' : 'Planta creada');
            fetchPlants(true);
            if (!isEdit) fetchLocations('', true);
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Eliminar Planta"
          description={`¿Estás seguro de que deseas eliminar la planta "${deleteConfirm.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Sectors Section ────────────────────────────────
function SectorsSection() {
  const { sectors, fetchSectors } = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState<any>(null); // null, 'new', or sector object
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  useEffect(() => {
    if (sectors.length === 0) {
      setIsLoading(true);
      fetchSectors().finally(() => setIsLoading(false));
    }
  }, [sectors.length, fetchSectors]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/sectors/${deleteConfirm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Sector eliminado');
      fetchSectors(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal('new')} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nuevo Sector
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : sectors.length === 0 ? (
        <EmptyState icon={Layers} text="Sin sectores registrados" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sectors.map(s => (
            <div key={s.id} className="glass-card-hover p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowModal(s)} className="btn-ghost btn-icon p-1">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                  </button>
                  <button onClick={() => setDeleteConfirm(s)} className="btn-ghost btn-icon p-1">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">{s.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {s._count?.locations || 0} ubicaciones · {s._count?.plants || 0} plantas
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title={showModal === 'new' ? "Nuevo Sector" : "Editar Sector"}
          initialData={showModal === 'new' ? undefined : {
            nombre: showModal.nombre,
            descripcion: showModal.descripcion || ''
          }}
          fields={[
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'descripcion', label: 'Descripción' },
          ]}
          onClose={() => setShowModal(null)}
          onSubmit={async (data) => {
            const isEdit = showModal !== 'new';
            const url = isEdit ? `/api/sectors/${showModal.id}` : '/api/sectors';
            const res = await fetch(url, {
              method: isEdit ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(isEdit ? 'Sector actualizado' : 'Sector creado');
            fetchSectors(true);
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Eliminar Sector"
          description={`¿Estás seguro de que deseas eliminar el sector "${deleteConfirm.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Locations Section ──────────────────────────────
// ─── Locations Section ──────────────────────────────
function LocationsSection() {
  const { locations, plants, sectors, fetchLocations, fetchPlants, fetchSectors } = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const [plantFilter, setPlantFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [showModal, setShowModal] = useState<any>(null); // null, 'new', or location object
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      if (locations.length === 0 || plants.length === 0 || sectors.length === 0) {
        setIsLoading(true);
        await Promise.all([
          fetchLocations(),
          fetchPlants(),
          fetchSectors()
        ]);
        setIsLoading(false);
      }
    };
    init();
  }, [locations.length, plants.length, sectors.length, fetchLocations, fetchPlants, fetchSectors]);

  // Sort locations numerically (natural sort)
  const sortedLocations = useMemo(() => {
    return [...locations].sort((a, b) => 
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [locations]);

  const filtered = useMemo(() => {
    return sortedLocations.filter(l => {
      const matchPlant = !plantFilter || l.plant?.id === plantFilter;
      const matchSector = !sectorFilter || l.sector?.id === sectorFilter;
      return matchPlant && matchSector;
    });
  }, [sortedLocations, plantFilter, sectorFilter]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/locations/${deleteConfirm.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Ubicación eliminada');
      fetchLocations('', true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const exportToExcel = () => {
    const data = filtered.map(loc => ({
      ID: loc.id,
      Nombre: loc.nombre,
      Planta: loc.plant?.nombre,
      Sector: loc.sector?.nombre || 'N/A',
      Dispenser: loc.dispensers?.[0]?.id || 'Vacía'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ubicaciones');
    XLSX.writeFile(wb, `ubicaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exportado correctamente');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <select
            value={plantFilter}
            onChange={e => setPlantFilter(e.target.value)}
            className="select select-sm md:select-md w-auto min-w-[140px]"
          >
            <option value="">Todas las plantas</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>

          <select
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="select select-sm md:select-md w-auto min-w-[140px]"
          >
            <option value="">Todos los sectores</option>
            {sectors.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          
          {filtered.length > 0 && (
            <button 
              onClick={exportToExcel}
              className="btn-outline btn-sm md:btn-md gap-2 px-3"
              title="Exportar a Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}
        </div>
        <button onClick={() => setShowModal('new')} className="btn-primary btn-sm md:btn-md gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nueva Ubicación
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : filtered.length === 0 ? (
        <EmptyState icon={MapPin} text="Sin ubicaciones registradas" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="text-center">ID</th>
                <th className="text-center">Nombre</th>
                <th className="text-center">Planta</th>
                <th className="text-center">Sector</th>
                <th className="text-center">Dispenser</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((loc: any) => (
                <tr key={loc.id}>
                  <td className="font-mono text-xs text-center">{loc.id}</td>
                  <td className="font-medium text-center">{loc.nombre}</td>
                  <td className="text-center">{loc.plant?.nombre}</td>
                  <td className="text-center">{loc.sector?.nombre || <span className="text-muted-foreground italic">—</span>}</td>
                  <td className="text-center">
                    <div className="flex justify-center">
                      {loc.dispensers?.length > 0 ? (
                        <span className="badge-success text-xs gap-1">
                          <GlassWater className="w-3 h-3" />
                          {loc.dispensers[0].id}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Vacía</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => setShowModal(loc)} className="btn-ghost btn-icon p-1">
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>
                      <button onClick={() => setDeleteConfirm(loc)} className="btn-ghost btn-icon p-1">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title={showModal === 'new' ? "Nueva Ubicación" : "Editar Ubicación"}
          initialData={showModal === 'new' ? undefined : {
            id: showModal.id,
            plantId: showModal.plantId,
            sectorId: showModal.sectorId || '',
            nombre: showModal.nombre,
            piso: showModal.piso || '',
          }}
          fields={[
            ...(showModal === 'new' ? [{ name: 'id', label: 'ID Ubicación *', placeholder: 'LOC-XXX', required: true }] : []),
            { name: 'plantId', label: 'Planta *', type: 'select', options: plants.map(p => ({ value: p.id, label: p.nombre })), required: true },
            { name: 'sectorId', label: 'Sector', type: 'select', options: [{ value: '', label: 'Sin sector' }, ...sectors.map(s => ({ value: s.id, label: s.nombre }))] },
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'piso', label: 'Piso' },
          ]}
          onClose={() => setShowModal(null)}
          onSubmit={async (data) => {
            const isEdit = showModal !== 'new';
            const url = isEdit ? `/api/locations/${showModal.id}` : '/api/locations';
            const res = await fetch(url, {
              method: isEdit ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(isEdit ? 'Ubicación actualizada' : 'Ubicación creada');
            fetchLocations('', true);
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          title="Eliminar Ubicación"
          description={`¿Estás seguro de que deseas eliminar la ubicación "${deleteConfirm.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Shared: Simple Form Modal ──────────────────────
type FormField = {
  name: string;
  label: string;
  type?: 'text' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

function SimpleFormModal({
  title, fields, initialData, onClose, onSubmit
}: {
  title: string;
  fields: FormField[];
  initialData?: Record<string, string>;
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>(
    initialData || Object.fromEntries(fields.map(f => [f.name, '']))
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="btn-ghost btn-icon"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            {fields.map(f => (
              <div key={f.name}>
                <label className="label">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className="select mt-1"
                    value={form[f.name]}
                    onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                    required={f.required}
                  >
                    <option value="">Seleccionar...</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    className="input mt-1"
                    placeholder={f.placeholder || ''}
                    value={form[f.name]}
                    onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
                    required={f.required}
                  />
                )}
              </div>
            ))}
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

// ─── Shared: Empty & Loading ────────────────────────
function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="glass-card p-12 flex flex-col items-center text-center">
      <Icon className="w-16 h-16 text-muted-foreground/20 mb-4" />
      <p className="text-muted-foreground text-lg font-medium">{text}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 skeleton rounded-lg" />)}
    </div>
  );
}
