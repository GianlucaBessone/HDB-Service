'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  Layers, 
  Ticket, 
  Building2, 
  ScanLine, 
  Wrench, 
  Package, 
  ArrowRight,
  Loader2,
  Wind,
  Snowflake,
  Fan,
  Droplets,
  Cpu
} from 'lucide-react';
import { getEquipmentTypeLabel } from '@/lib/equipment';

function getAssetIcon(type?: string) {
  switch (type) {
    case 'AIR_CONDITIONER':
      return <Wind className="w-4 h-4 text-sky-500" />;
    case 'COLD_ROOM':
      return <Snowflake className="w-4 h-4 text-cyan-400" />;
    case 'VENTILATION':
      return <Fan className="w-4 h-4 text-emerald-500" />;
    case 'DISPENSER':
      return <Droplets className="w-4 h-4 text-blue-500" />;
    default:
      return <Cpu className="w-4 h-4 text-purple-500" />;
  }
}

export default function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    equipments: any[];
    clients: any[];
    tickets: any[];
  }>({ equipments: [], clients: [], tickets: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ equipments: [], clients: [], tickets: [] });
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent will toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults({ equipments: [], clients: [], tickets: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Flattened items for keyboard navigation
  const flatItems: { type: string; id: string; label: string; url: string; badge?: string }[] = [];

  if (!query || query.length < 2) {
    // Quick Actions
    flatItems.push(
      { type: 'action', id: 'scan-qr', label: 'Escanear Código QR en Planta', url: '/qr/scan' },
      { type: 'action', id: 'view-equipments', label: 'Flota de Equipos y Activos', url: '/dispensers' },
      { type: 'action', id: 'view-tickets', label: 'Mesa de Ayuda / Tickets', url: '/tickets' },
      { type: 'action', id: 'view-maintenance', label: 'Órdenes de Mantenimiento', url: '/maintenance' },
      { type: 'action', id: 'view-dashboard', label: 'Centro de Control y Analítica', url: '/dashboard' }
    );
  } else {
    results.equipments.forEach(e => {
      flatItems.push({
        type: 'equipment',
        id: e.id,
        label: `${e.id} — ${e.marca} ${e.modelo}`,
        url: `/dispensers/${e.id}`,
        badge: getEquipmentTypeLabel(e.equipmentType),
      });
    });
    results.tickets.forEach(t => {
      flatItems.push({
        type: 'ticket',
        id: t.id,
        label: `#${t.id.slice(-6)}: ${t.titulo}`,
        url: `/tickets/${t.id}`,
        badge: t.prioridad,
      });
    });
    results.clients.forEach(c => {
      flatItems.push({
        type: 'client',
        id: c.id,
        label: c.nombre,
        url: `/clients`,
        badge: 'Cliente',
      });
    });
  }

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < flatItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : flatItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelect(flatItems[selectedIndex].url);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border gap-3 bg-muted/30">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar por serial, modelo, cliente, ticket o acción rápida..."
            className="w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base"
          />
          {loading && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
          {query && !loading && (
            <button 
              onClick={() => setQuery('')}
              className="p-1 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-mono bg-muted text-muted-foreground rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1">
          {flatItems.length === 0 && !loading && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No se encontraron resultados para &quot;{query}&quot;.
            </div>
          )}

          {/* Render Sections */}
          {!query && (
            <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acciones Rápidas
            </div>
          )}

          {flatItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => handleSelect(item.url)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-colors ${
                  isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted/60 text-foreground'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  {item.type === 'action' && <ScanLine className="w-4 h-4 text-primary shrink-0" />}
                  {item.type === 'equipment' && getAssetIcon()}
                  {item.type === 'ticket' && <Ticket className="w-4 h-4 text-amber-500 shrink-0" />}
                  {item.type === 'client' && <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-muted text-muted-foreground border border-border">
                      {item.badge}
                    </span>
                  )}
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 text-primary" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">↑</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">↓</kbd> Navegar</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">↵</kbd> Abrir</span>
          </div>
          <span>HDB Service Universal Search</span>
        </div>
      </div>
    </div>
  );
}
