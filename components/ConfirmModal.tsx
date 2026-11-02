'use client';

import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onClose,
  isLoading = false,
  variant = 'danger'
}: ConfirmModalProps) {
  
  const confirmClass = {
    danger: 'btn-destructive',
    warning: 'btn-primary',
    info: 'btn-primary',
  }[variant];

  const iconClass = {
    danger: 'text-destructive bg-destructive/10 border-destructive/20',
    warning: 'text-warning bg-warning/10 border-warning/20',
    info: 'text-info bg-info/10 border-info/20',
  }[variant];

  return (
    <div className="modal-overlay z-[100]" onMouseDown={e => e.target === e.currentTarget && !isLoading && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="modal-content max-w-md">
        <div className="flex items-start gap-4 p-5 sm:p-6">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${iconClass}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-title" className="text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <button onClick={onClose} className="modal-close -mr-2 -mt-2" aria-label="Cerrar" disabled={isLoading}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="modal-footer bg-muted/40">
          <button type="button" onClick={onClose} className="btn-outline" disabled={isLoading}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={confirmClass} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
