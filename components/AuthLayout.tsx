import { BrandLogo, BrandMark } from '@/components/ui/BrandMark';

/**
 * Layout de pantallas de autenticación.
 * Desktop: panel institucional a la izquierda + formulario. Móvil: sólo formulario.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh w-full grid-cols-1 bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Panel institucional */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex xl:p-14">
        <BrandLogo tone="inverse" subtitle />

        <div className="max-w-md">
          <p className="eyebrow !text-sidebar-muted">Plataforma de servicio técnico</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">
            Mantenimiento, activos y SLA en un solo lugar.
          </h2>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-sidebar-border pt-6">
            {[
              ['Tickets', 'Seguimiento y SLA'],
              ['Preventivo', 'Rutas y checklists'],
              ['Activos', 'Fichas y QR'],
            ].map(([term, desc]) => (
              <div key={term}>
                <dt className="text-sm font-semibold">{term}</dt>
                <dd className="mt-1 text-xs text-sidebar-muted">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-2xs text-sidebar-muted">© {new Date().getFullYear()} HDB Service</p>

        {/* Retícula técnica sutil */}
        <svg className="pointer-events-none absolute -right-24 top-1/2 h-[520px] w-[520px] -translate-y-1/2 text-sidebar-border" aria-hidden="true">
          <defs>
            <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
      </aside>

      {/* Formulario */}
      <main className="flex min-h-dvh min-w-0 flex-col px-5 py-8 sm:px-10 lg:min-h-0 lg:justify-center lg:px-16">
        <div className="mb-10 lg:hidden">
          <BrandLogo />
        </div>
        <div className="mx-auto w-full min-w-0 max-w-sm flex-1 lg:flex-none">{children}</div>
      </main>
    </div>
  );
}

export { BrandMark };
