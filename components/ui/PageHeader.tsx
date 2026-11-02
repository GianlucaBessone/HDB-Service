import clsx from 'clsx';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Acciones a la derecha (botones). En móvil bajan y ocupan el ancho. */
  actions?: React.ReactNode;
  /** Texto pequeño sobre el título (p. ej. sección padre). */
  eyebrow?: React.ReactNode;
  /** Enlace para volver. */
  backHref?: string;
  backLabel?: string;
  /** Contenido extra bajo el título (badges, metadatos). */
  meta?: React.ReactNode;
  className?: string;
}

/**
 * Encabezado estándar de pantalla.
 * Regla: una pantalla = un PageHeader. Sin íconos decorativos en el título.
 */
export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  backHref,
  backLabel = 'Volver',
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={clsx('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="min-w-0 space-y-1">
        {backHref && (
          <Link
            href={backHref}
            className="-ml-1 mb-1 inline-flex items-center gap-1 rounded text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="text-xl font-semibold leading-7 text-foreground sm:text-2xl sm:leading-8 break-words">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
        )}
        {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0 lg:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
    </header>
  );
}
