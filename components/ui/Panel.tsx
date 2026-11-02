import clsx from 'clsx';

interface PanelProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Sin padding en el cuerpo (tablas, listas). */
  flush?: boolean;
}

/** Bloque de contenido estándar con encabezado opcional. */
export default function Panel({ title, description, actions, children, className, bodyClassName, flush }: PanelProps) {
  return (
    <section className={clsx('glass-card overflow-hidden', className)}>
      {(title || actions) && (
        <div className="panel-header">
          <div className="min-w-0">
            {title && <h2 className="panel-title">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={clsx(!flush && 'panel-body', bodyClassName)}>{children}</div>
    </section>
  );
}
