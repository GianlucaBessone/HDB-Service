'use client';

import { useState } from 'react';
import { ShieldCheck, Search, Loader2, AlertTriangle } from 'lucide-react';
import PublicShell from '@/components/PublicShell';

export default function VerificationPage() {
  const [hash, setHash] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim()) return;

    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/public/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error de verificación');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const Section = ({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) => (
    <section className={wide ? 'md:col-span-2' : ''}>
      <h3 className="eyebrow mb-2 border-b border-border pb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
  const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );

  return (
    <PublicShell>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold sm:text-2xl">Verificación de firmas digitales</h1>
          <p className="text-sm text-muted-foreground">
            Ingresá el hash del certificado (SHA-512) para comprobar la autenticidad e integridad de una conformidad firmada.
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              className="input pl-9 font-mono"
              placeholder="Hash SHA-512 (ej. 30ffc53f…)"
              aria-label="Hash del certificado"
              value={hash}
              onChange={e => setHash(e.target.value)}
            />
          </div>
          <button type="submit" disabled={isVerifying || !hash.trim()} className="btn-primary">
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verificar'}
          </button>
        </form>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/10 p-4 animate-fade-in">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <h2 className="text-sm font-semibold text-destructive">Verificación fallida</h2>
              <p className="mt-0.5 text-sm text-foreground">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="glass-card overflow-hidden animate-fade-in">
            <div className="flex items-start gap-3 border-b border-border bg-success/10 p-4 sm:p-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Firma auténtica</h2>
                <p className="text-sm text-muted-foreground">La integridad del documento está verificada.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-4 sm:p-5 md:grid-cols-2">
              <Section title="Firmante">
                <Field label="Nombre" value={result.customerName} />
                <Field label="DNI / identificación" value={result.customerIdentity} />
              </Section>
              <Section title="Operación">
                <Field label="Fecha y hora" value={new Date(result.signedAt).toLocaleString('es-AR')} />
                <Field label="Técnico a cargo" value={result.technicianName} />
              </Section>
              <Section title="Activos intervenidos" wide>
                <div className="flex flex-wrap gap-1.5">
                  {result.dispensers.map((d: string) => (
                    <span key={d} className="badge-neutral font-mono">{d}</span>
                  ))}
                </div>
              </Section>
              <Section title="Trazabilidad" wide>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Dirección IP" value={result.ipAddress} mono />
                  <Field label="Dispositivo" value={result.deviceInfo} />
                </div>
              </Section>
            </div>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
