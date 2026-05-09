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
  
  const variantClasses = {
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20',
    info: 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'
  };

  const iconClasses = {
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
    info: 'bg-primary/10 text-primary'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${iconClasses[variant]}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground leading-none">{title}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {description}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-accent rounded-full transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-muted/30 border-t border-border flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="btn-outline px-6"
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            className={`btn-primary px-6 shadow-lg border-none ${variantClasses[variant]}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
