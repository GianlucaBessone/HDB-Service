import clsx from 'clsx';
import Link from 'next/link';

export type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const toneBar: Record<Tone, string> = {
  default: 'before:bg-border',
  primary: 'before:bg-primary',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  danger: 'before:bg-destructive',
  info: 'before:bg-info',
};

const toneValue: Record<Tone, string> = {
  default: 'text-foreground',
  primary: 'text-foreground',
  success: 'text-foreground',
  warning: 'text-foreground',
  danger: 'text-destructive',
  info: 'text-foreground',
};

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Línea de contexto bajo el valor. */
  hint?: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  href?: string;
  className?: string;
  /** Resalta el valor en rojo sólo cuando es > 0 y tone=danger. */
  emphasize?: boolean;
}

/**
 * Indicador numérico estándar (KPI).
 * Acento semántico: barra izquierda de 2px. Sin fondos de color.
 */
export default function StatCard({ label, value, hint, icon: Icon, tone = 'default', href, className, emphasize = true }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="metric-label">{label}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
      </div>
      <p className={clsx('metric-value', emphasize ? toneValue[tone] : 'text-foreground')}>{value}</p>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </>
  );

  const classes = clsx(
    'metric-card relative overflow-hidden min-w-0',
    'before:absolute before:inset-y-0 before:left-0 before:w-[3px]',
    toneBar[tone],
    href && 'transition-colors hover:border-foreground/25',
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4', className)}>
      {children}
    </div>
  );
}
