'use client';

import { useState, useEffect, useRef } from 'react';

const SUGGESTED_REASONS = [
  'Pérdida de agua',
  'No enfría',
  'No calienta',
  'Cortocircuito',
  'Ruido excesivo',
  'No enciende',
  'Agua con mal sabor',
  'Agua con mal olor',
  'Fuga en canilla',
  'Fuga en manguera',
  'Botón roto',
  'Canilla rota (Agua Fría)',
  'Canilla rota (Agua Caliente)',
  'Bandeja desborda',
  'Display apagado',
  'Error eléctrico',
  'Filtro obstruido',
  'Mantenimiento preventivo',
  'Instalación',
  'Desinstalación',
  'Reubicación',
  'Otro',
];

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface ReasonComboboxProps {
  value: string;
  onChange: (val: string) => void;
}

export default function ReasonCombobox({ value, onChange }: ReasonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = SUGGESTED_REASONS.filter(r =>
    normalize(r).includes(normalize(value))
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        setHighlightIdx(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && filtered[highlightIdx]) {
      e.preventDefault();
      onChange(filtered[highlightIdx]);
      setOpen(false);
      setHighlightIdx(-1);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIdx(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        className="input mt-1 w-full"
        placeholder="Ej. Pérdida de agua, no enfría..."
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlightIdx(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        required
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-y-auto"
          style={{ maxHeight: '15rem' }}
        >
          {filtered.slice(0, Math.max(filtered.length, 6)).map((reason, idx) => (
            <li
              key={reason}
              className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                idx === highlightIdx
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted/50'
              }`}
              onMouseDown={(e) => { e.preventDefault(); onChange(reason); setOpen(false); }}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
