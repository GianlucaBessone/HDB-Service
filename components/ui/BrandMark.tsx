import clsx from 'clsx';

/**
 * Isotipo HDB Service: monograma "H" sobre cuadrado petróleo.
 * Ver docs/ui-ux/02-reglas-de-marca.md §2.
 */
export function BrandMark({ className, mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={clsx('shrink-0', className)}
    >
      <rect width="32" height="32" rx="7" className={mono ? 'fill-white/10' : 'fill-primary'} />
      <path
        d="M10 8.5v15M22 8.5v15M10 16h12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="square"
        fill="none"
      />
      <rect x="20.5" y="8.5" width="3" height="3" className="fill-[hsl(var(--sidebar-active))]" />
    </svg>
  );
}

export function BrandLogo({
  className,
  subtitle = false,
  tone = 'default',
}: {
  className?: string;
  subtitle?: boolean;
  tone?: 'default' | 'inverse';
}) {
  return (
    <div className={clsx('flex items-center gap-2.5 min-w-0', className)}>
      <BrandMark className="h-8 w-8" />
      <div className="min-w-0 leading-none">
        <span
          className={clsx(
            'block text-[15px] font-semibold tracking-[-0.01em]',
            tone === 'inverse' ? 'text-sidebar-foreground' : 'text-foreground'
          )}
        >
          HDB Service
        </span>
        {subtitle && (
          <span
            className={clsx(
              'mt-1 block text-2xs font-medium uppercase tracking-wider',
              tone === 'inverse' ? 'text-sidebar-muted' : 'text-muted-foreground'
            )}
          >
            Gestión de activos
          </span>
        )}
      </div>
    </div>
  );
}
