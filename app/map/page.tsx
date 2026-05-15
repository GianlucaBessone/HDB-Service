'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center rounded-xl">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
});

interface Plant {
  id: string;
  nombre: string;
  direccion: string | null;
  lat: number;
  lng: number;
  client?: { nombre: string };
}

export default function MapPage() {
  const { data: plants = [], isLoading } = useQuery<Plant[]>({
    queryKey: ['map-plants'],
    queryFn: async () => {
      const res = await fetch('/api/map');
      if (!res.ok) throw new Error('Failed to fetch map data');
      return res.json();
    }
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="w-8 h-8 text-primary" />
            Mapa de Operaciones
          </h1>
          <p className="text-muted-foreground mt-1">
            Ubicación geográfica de plantas y dispensers activos.
          </p>
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden p-2 relative min-h-[400px]">
        {isLoading ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="w-10 h-10 animate-spin" />
            Cargando mapa...
          </div>
        ) : (
          <Map plants={plants} />
        )}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 items-start">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Los marcadores indican las plantas de clientes que tienen dispensers registrados con coordenadas geográficas. Haz clic en un marcador para ver más detalles.
        </p>
      </div>
    </div>
  );
}
