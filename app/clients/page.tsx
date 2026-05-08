'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings, Building2, MapPin, Layers, Plus, ChevronRight,
  ChevronDown, X, Loader2, Edit2, Trash2, GlassWater,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

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
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetch_ = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch { toast.error('Error al cargar clientes'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : clients.length === 0 ? (
        <EmptyState icon={Building2} text="Sin clientes registrados" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(c => (
            <div key={c.id} className="glass-card-hover p-5">
              <h3 className="font-semibold text-lg">{c.nombre}</h3>
              {c.email && <p className="text-sm text-muted-foreground mt-1">{c.email}</p>}
              {c.telefono && <p className="text-sm text-muted-foreground">{c.telefono}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title="Nuevo Cliente"
          fields={[
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'email', label: 'Email' },
            { name: 'telefono', label: 'Teléfono' },
            { name: 'direccion', label: 'Dirección' },
          ]}
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            const res = await fetch('/api/clients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Cliente creado');
            fetch_();
          }}
        />
      )}
    </div>
  );
}

// ─── Plants Section ─────────────────────────────────
function PlantsSection() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedPlant, setExpandedPlant] = useState<string | null>(null);
  const [plantLocations, setPlantLocations] = useState<Record<string, Location[]>>({});

  const fetchPlants = useCallback(async () => {
    setIsLoading(true);
    try {
      const [plantsRes, clientsRes] = await Promise.all([
        fetch('/api/plants'),
        fetch('/api/clients'),
      ]);
      setPlants(await plantsRes.json());
      setClients(await clientsRes.json());
    } catch { toast.error('Error al cargar plantas'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchPlants(); }, [fetchPlants]);

  const toggleExpand = async (plantId: string) => {
    if (expandedPlant === plantId) {
      setExpandedPlant(null);
      return;
    }
    setExpandedPlant(plantId);
    if (!plantLocations[plantId]) {
      try {
        const res = await fetch(`/api/locations?plantId=${plantId}`);
        const data = await res.json();
        setPlantLocations(prev => ({ ...prev, [plantId]: data }));
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nueva Planta
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : plants.length === 0 ? (
        <EmptyState icon={Building2} text="Sin plantas registradas" />
      ) : (
        <div className="space-y-2">
          {plants.map((p: any) => (
            <div key={p.id} className="glass-card overflow-hidden">
              <button
                onClick={() => toggleExpand(p.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <span className="font-semibold">{p.nombre}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {p._count?.locations || 0} ubicaciones
                    </span>
                  </div>
                </div>
                {expandedPlant === p.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {expandedPlant === p.id && (
                <div className="px-5 pb-4 border-t border-border">
                  <div className="mt-3 space-y-2">
                    {(plantLocations[p.id] || []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Sin ubicaciones en esta planta</p>
                    ) : (
                      plantLocations[p.id]?.map((loc: any) => (
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
                              <span className="badge-success text-xs flex items-center gap-1">
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
          ))}
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title="Nueva Planta"
          fields={[
            { name: 'clientId', label: 'Cliente *', type: 'select', options: clients.map(c => ({ value: c.id, label: c.nombre })), required: true },
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'direccion', label: 'Dirección' },
          ]}
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            const res = await fetch('/api/plants', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Planta creada');
            fetchPlants();
          }}
        />
      )}
    </div>
  );
}

// ─── Sectors Section ────────────────────────────────
function SectorsSection() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchSectors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sectors');
      const data = await res.json();
      setSectors(Array.isArray(data) ? data : []);
    } catch { toast.error('Error al cargar sectores'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchSectors(); }, [fetchSectors]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2">
          <Plus className="w-4 h-4" /> Nuevo Sector
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : sectors.length === 0 ? (
        <EmptyState icon={Layers} text="Sin sectores registrados" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sectors.map(s => (
            <div key={s.id} className="glass-card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-primary" />
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
          title="Nuevo Sector"
          fields={[
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'descripcion', label: 'Descripción' },
          ]}
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            const res = await fetch('/api/sectors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Sector creado');
            fetchSectors();
          }}
        />
      )}
    </div>
  );
}

// ─── Locations Section ──────────────────────────────
function LocationsSection() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plantFilter, setPlantFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (plantFilter) params.set('plantId', plantFilter);
      const [locRes, plantsRes, sectorsRes] = await Promise.all([
        fetch(`/api/locations?${params}`),
        fetch('/api/plants'),
        fetch('/api/sectors'),
      ]);
      setLocations(await locRes.json());
      setPlants(await plantsRes.json());
      setSectors(await sectorsRes.json());
    } catch { toast.error('Error al cargar ubicaciones'); }
    finally { setIsLoading(false); }
  }, [plantFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <select
          value={plantFilter}
          onChange={e => setPlantFilter(e.target.value)}
          className="select max-w-xs"
        >
          <option value="">Todas las plantas</option>
          {plants.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button onClick={() => setShowModal(true)} className="btn-primary gap-2 shrink-0">
          <Plus className="w-4 h-4" /> Nueva Ubicación
        </button>
      </div>

      {isLoading ? <LoadingSkeleton /> : locations.length === 0 ? (
        <EmptyState icon={MapPin} text="Sin ubicaciones registradas" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Planta</th>
                <th>Sector</th>
                <th>Dispenser</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc: any) => (
                <tr key={loc.id}>
                  <td className="font-mono text-xs">{loc.id}</td>
                  <td className="font-medium">{loc.nombre}</td>
                  <td>{loc.plant?.nombre}</td>
                  <td>{loc.sector?.nombre || <span className="text-muted-foreground italic">—</span>}</td>
                  <td>
                    {loc.dispensers?.length > 0 ? (
                      <span className="badge-success text-xs gap-1">
                        <GlassWater className="w-3 h-3" />
                        {loc.dispensers[0].id}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Vacía</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SimpleFormModal
          title="Nueva Ubicación"
          fields={[
            { name: 'id', label: 'ID Ubicación *', placeholder: 'LOC-XXX', required: true },
            { name: 'plantId', label: 'Planta *', type: 'select', options: plants.map(p => ({ value: p.id, label: p.nombre })), required: true },
            { name: 'sectorId', label: 'Sector', type: 'select', options: [{ value: '', label: 'Sin sector' }, ...sectors.map(s => ({ value: s.id, label: s.nombre }))] },
            { name: 'nombre', label: 'Nombre *', required: true },
            { name: 'piso', label: 'Piso' },
          ]}
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => {
            const res = await fetch('/api/locations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success('Ubicación creada');
            fetchAll();
          }}
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
  title, fields, onClose, onSubmit
}: {
  title: string;
  fields: FormField[];
  onClose: () => void;
  onSubmit: (data: Record<string, string>) => Promise<void>;
}) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(fields.map(f => [f.name, '']))
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
