'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Plant {
  id: string;
  nombre: string;
  direccion: string | null;
  lat: number;
  lng: number;
  client?: { nombre: string };
}

export default function Map({ plants }: { plants: Plant[] }) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current).setView([-34.6037, -58.3816], 11);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    plants.forEach(plant => {
      const marker = L.marker([plant.lat, plant.lng], { icon })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="min-width: 150px; font-family: sans-serif;">
            <p style="font-weight: bold; color: #0b8296; margin: 0 0 4px 0;">${plant.nombre}</p>
            ${plant.client ? `<p style="font-size: 11px; color: #666; margin: 0 0 4px 0;">${plant.client.nombre}</p>` : ''}
            <p style="font-size: 11px; margin: 0;">${plant.direccion || ''}</p>
          </div>
        `);
      markersRef.current.push(marker);
    });

    // If there are plants, fit bounds
    if (plants.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [plants]);

  return <div ref={containerRef} className="h-full w-full rounded-xl z-0" style={{ minHeight: '400px' }} />;
}
