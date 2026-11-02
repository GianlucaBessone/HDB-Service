'use client';

import { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

interface ModalProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  /** z-index personalizado cuando se apila sobre otro modal. */
  zClassName?: string;
}

const sizes = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-6xl',
};

/**
 * Diálogo estándar. Hoja inferior en móvil, centrado en desktop.
 * Cierra con Escape y clic en el fondo.
 */
export default function Modal({ title, description, onClose, children, footer, size = 'md', className, zClassName }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className={clsx('modal-overlay', zClassName)} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" className={clsx('modal-content max-w-none', sizes[size], className)}>
        <div className="modal-header">
          <div className="min-w-0">
            <h2 className="truncate">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
