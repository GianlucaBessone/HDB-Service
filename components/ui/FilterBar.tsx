import clsx from 'clsx';

/** Contenedor estándar de filtros: grilla en móvil/tablet, fila en desktop. */
export default function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('filter-bar', className)}>{children}</div>;
}

/** Campo con ícono a la izquierda (para buscadores y selects de filtro). */
export function FieldIcon({ icon: Icon, children, className }: { icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('relative min-w-0', className)}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      {children}
    </div>
  );
}
