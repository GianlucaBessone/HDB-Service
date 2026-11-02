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
import { isNavVisible } from '@/lib/rbac';
import { UserRole } from '@prisma/client';

function getAssetIcon(type?: string) {
  const cls = 'w-4 h-4 text-muted-foreground shrink-0';
  switch (type) {
    case 'AIR_CONDITIONER':
      return <Wind className={cls} />;
    case 'COLD_ROOM':
      return <Snowflake className={cls} />;
    case 'VENTILATION':
      return <Fan className={cls} />;
    case 'DISPENSER':
      return <Droplets className={cls} />;
    default:
      return <Cpu className={cls} />;
  }
}

const SECTION_LABELS: Record<string, string> = {
  action: 'Accesos rápidos',
  equipment: 'Activos',
  ticket: 'Tickets',
  client: 'Clientes',
};

export default function CommandPalette({
  isOpen,
  onClose,
  userRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
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

  // Escape para cerrar (Ctrl/⌘+K lo maneja TopBar)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
  const flatItems: { type: string; id: string; label: string; url: string; badge?: string; assetType?: string }[] = [];

  if (!query || query.length < 2) {
    // Quick Actions
    const actions = [
      { type: 'action', id: 'scan-qr', label: 'Escanear QR de un activo', url: '/qr/scan' },
      { type: 'action', id: 'view-tickets', label: 'Ir a Tickets', url: '/tickets' },
      { type: 'action', id: 'view-equipments', label: 'Ir a Activos', url: '/dispensers' },
      { type: 'action', id: 'view-maintenance', label: 'Ir a Mantenimiento', url: '/maintenance' },
      { type: 'action', id: 'view-dashboard', label: 'Ir a Dashboard', url: '/dashboard' },
    ];
    flatItems.push(...actions.filter(a => !userRole || isNavVisible(a.url, userRole)));
  } else {
    results.equipments.forEach(e => {
      flatItems.push({
        type: 'equipment',
        id: e.id,
        label: `${e.id} — ${e.marca} ${e.modelo}`,
        url: `/dispensers/${e.id}`,
        badge: getEquipmentTypeLabel(e.equipmentType),
        assetType: e.equipmentType,
      });
    });
    results.tickets.forEach(t => {
      flatItems.push({
        type: 'ticket',
        id: t.id,
        label: `#${t.id.slice(-6)} · ${t.titulo}`,
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
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/50 px-0 pt-0 sm:px-4 sm:pt-[12vh] dark:bg-black/70 animate-in fade-in-0 duration-150"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda global"
        className="flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden border-border bg-popover shadow-xl sm:h-auto sm:max-h-[70vh] sm:rounded-xl sm:border"
      >
        {/* Campo de búsqueda */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar activo, ticket o cliente…"
            className="w-full border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
            aria-label="Buscar"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
          {query && !loading && (
            <button onClick={() => setQuery('')} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Limpiar búsqueda">
              <X className="h-4 w-4" />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost btn-sm sm:hidden">Cancelar</button>
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-2xs text-muted-foreground sm:inline-block">Esc</kbd>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto p-2">
          {flatItems.length === 0 && !loading && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Sin resultados para “{query}”.
            </div>
          )}

          {flatItems.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            const showSection = idx === 0 || flatItems[idx - 1].type !== item.type;
            return (
              <div key={`${item.type}-${item.id}`}>
                {showSection && (
                  <div className="eyebrow px-3 pb-1.5 pt-3 first:pt-1.5">{SECTION_LABELS[item.type]}</div>
                )}
                <button
                  onClick={() => handleSelect(item.url)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors sm:min-h-[38px] ${
                    isSelected ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/60'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {item.type === 'action' && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    {item.type === 'equipment' && getAssetIcon(item.assetType)}
                    {item.type === 'ticket' && <Ticket className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    {item.type === 'client' && <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && <span className="badge-neutral ml-3 shrink-0">{item.badge}</span>}
                </button>
              </div>
            );
          })}
        </div>

        {/* Ayuda de teclado */}
        <div className="hidden items-center gap-4 border-t border-border bg-muted/50 px-4 py-2 text-2xs text-muted-foreground sm:flex">
          <span><kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">↑</kbd> <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">↓</kbd> Navegar</span>
          <span><kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">↵</kbd> Abrir</span>
          <span><kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  );
}
