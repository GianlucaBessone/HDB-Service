import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Client { id: string; nombre: string; email: string | null; telefono: string | null; active: boolean }
interface Plant { id: string; nombre: string; direccion: string | null; clientId: string; _count: { locations: number } }
interface Sector { id: string; nombre: string; _count?: { locations: number; plants: number } }
interface Location {
  id: string; nombre: string; piso: string | null;
  plant: { id: string; nombre: string; client: { nombre: string } };
  sector: { id: string; nombre: string } | null;
  dispensers: { id: string; marca: string; modelo: string; status: string }[];
}

interface ConfigState {
  clients: Client[];
  plants: Plant[];
  sectors: Sector[];
  locations: Location[];
  lastUpdated: number | null;
  
  setClients: (clients: Client[]) => void;
  setPlants: (plants: Plant[]) => void;
  setSectors: (sectors: Sector[]) => void;
  setLocations: (locations: Location[]) => void;
  
  fetchClients: (force?: boolean) => Promise<void>;
  fetchPlants: (force?: boolean) => Promise<void>;
  fetchSectors: (force?: boolean) => Promise<void>;
  fetchLocations: (plantId?: string, force?: boolean) => Promise<void>;
  
  invalidateAll: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      clients: [],
      plants: [],
      sectors: [],
      locations: [],
      lastUpdated: null,

      setClients: (clients) => set({ clients, lastUpdated: Date.now() }),
      setPlants: (plants) => set({ plants, lastUpdated: Date.now() }),
      setSectors: (sectors) => set({ sectors, lastUpdated: Date.now() }),
      setLocations: (locations) => set({ locations, lastUpdated: Date.now() }),

      fetchClients: async (force = false) => {
        if (!force && get().clients.length > 0) return;
        try {
          const res = await fetch('/api/clients');
          const data = await res.json();
          set({ clients: Array.isArray(data) ? data.filter((c: any) => c.active !== false) : [], lastUpdated: Date.now() });
        } catch (error) {
          console.error('Error fetching clients:', error);
        }
      },

      fetchPlants: async (force = false) => {
        if (!force && get().plants.length > 0) return;
        try {
          const res = await fetch('/api/plants');
          const data = await res.json();
          set({ plants: Array.isArray(data) ? data : [], lastUpdated: Date.now() });
        } catch (error) {
          console.error('Error fetching plants:', error);
        }
      },

      fetchSectors: async (force = false) => {
        if (!force && get().sectors.length > 0) return;
        try {
          const res = await fetch('/api/sectors');
          const data = await res.json();
          set({ sectors: Array.isArray(data) ? data : [], lastUpdated: Date.now() });
        } catch (error) {
          console.error('Error fetching sectors:', error);
        }
      },

      fetchLocations: async (plantId = '', force = false) => {
        // Only cache "all locations" or specific filters if we want, 
        // but for now let's cache the list if it's empty or forced
        if (!force && get().locations.length > 0 && !plantId) return;
        try {
          const params = new URLSearchParams();
          if (plantId) params.set('plantId', plantId);
          const res = await fetch(`/api/locations?${params}`);
          const data = await res.json();
          
          if (!plantId) {
            set({ locations: Array.isArray(data) ? data : [], lastUpdated: Date.now() });
          } else {
            // Background update if filtered? No, let's keep it simple.
            // If it's a filtered request, we return it but don't necessarily overwrite the global cache
            // unless it's the main list.
          }
        } catch (error) {
          console.error('Error fetching locations:', error);
        }
      },

      invalidateAll: () => set({ 
        clients: [], plants: [], sectors: [], locations: [], lastUpdated: null 
      }),
    }),
    {
      name: 'hdb-config-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
