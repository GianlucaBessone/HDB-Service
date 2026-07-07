'use client';

import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

interface MaterialComboboxProps {
  items: any[];
  value: string; // The selected code
  onChange: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function MaterialCombobox({ items, value, onChange, disabled, autoFocus }: MaterialComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Determine the display value based on selection vs search
  const selectedItem = items.find(i => i.code === value);

  useEffect(() => {
    if (selectedItem) {
      setSearch(`${selectedItem.code} - ${selectedItem.nombre}`);
    } else {
      setSearch('');
    }
  }, [selectedItem]);

  const filtered = items.filter(item => {
    const s = normalize(search);
    return (
      normalize(item.code).includes(s) ||
      normalize(item.nombre).includes(s) ||
      normalize(item.type === 'CONSUMABLE' ? 'consumible' : 'repuesto').includes(s)
    );
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (selectedItem) {
          setSearch(`${selectedItem.code} - ${selectedItem.nombre}`);
        } else {
          setSearch('');
          onChange('');
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedItem, onChange]);

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
      onChange(filtered[highlightIdx].code);
      setOpen(false);
      setHighlightIdx(-1);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHighlightIdx(-1);
      if (selectedItem) {
        setSearch(`${selectedItem.code} - ${selectedItem.nombre}`);
      } else {
        setSearch('');
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative mt-1">
      <input
        type="text"
        className="input w-full"
        placeholder="Buscar repuesto o consumible..."
        value={open ? search : (selectedItem ? `${selectedItem.code} - ${selectedItem.nombre}` : '')}
        onChange={e => { 
          setSearch(e.target.value); 
          if (!open) setOpen(true);
          setHighlightIdx(0);
          if (value) onChange(''); // Clear actual value when typing anew
        }}
        onFocus={() => {
          setOpen(true);
          if (selectedItem) setSearch(''); // clear to allow fresh search
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        required
      />
      {open && !disabled && (
        <ul
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-y-auto"
          style={{ maxHeight: '15rem' }}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-sm text-center text-muted-foreground italic">No se encontraron resultados</li>
          ) : (
            filtered.map((item, idx) => (
              <li
                key={item.id}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors flex justify-between items-center ${
                  idx === highlightIdx || item.code === value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted/50'
                }`}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  onChange(item.code); 
                  setOpen(false); 
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
              >
                <div className="flex flex-col">
                  <span className="font-semibold">{item.nombre}</span>
                  <span className="text-xs font-mono opacity-70">{item.code}</span>
                </div>
                <span className={clsx("badge text-[10px] px-1.5 py-0", item.type === 'CONSUMABLE' ? 'badge-primary' : 'badge-warning')}>
                  {item.type === 'CONSUMABLE' ? 'Consumible' : 'Repuesto'}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
