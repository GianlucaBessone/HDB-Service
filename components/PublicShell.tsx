import { BrandLogo } from '@/components/ui/BrandMark';

/** Contenedor para páginas públicas (clientes sin sesión). */
export default function PublicShell({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card pt-safe">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <BrandLogo />
          {aside}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-8">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-2xs text-muted-foreground">
        HDB Service · Gestión de mantenimiento y activos
      </footer>
    </div>
  );
}
