import clsx from 'clsx';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  /** Sin borde/tarjeta (para usar dentro de un Panel). */
  bare?: boolean;
}

export default function EmptyState({ icon: Icon = Inbox, title, description, action, className, bare }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        !bare && 'glass-card border-dashed',
        className
      )}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
