'use client';

import { useState } from 'react';
import { ShieldCheck, Search, Loader2, AlertTriangle, Lock, FileSignature, MapPin, User, Calendar, Monitor, Globe } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-muted/20 py-12 px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="bg-card p-8 rounded-2xl shadow-sm border border-border text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Verificación de Firmas Digitales</h1>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Sistema de validación criptográfica (SHA-512 + AES-256-GCM). 
            Ingrese el hash del certificado para comprobar la autenticidad e integridad de la firma.
          </p>

          <form onSubmit={handleVerify} className="mt-8 relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              className="input pl-12 pr-24 py-4 text-sm w-full font-mono bg-muted/50 border-primary/20 focus:border-primary"
              placeholder="Ingrese el hash SHA-512 (ej. 30ffc53f...)"
              value={hash}
              onChange={e => setHash(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={isVerifying || !hash.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 px-4"
            >
              {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center animate-fade-in">
            <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
            <h2 className="text-lg font-bold text-danger">Verificación Fallida</h2>
            <p className="text-danger/80 mt-1">{error}</p>
          </div>
        )}

        {/* Success State */}
        {result && (
          <div className="bg-card border border-primary/20 rounded-2xl shadow-lg overflow-hidden animate-fade-in">
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-primary">Firma Auténtica y Verificada</h2>
                <p className="text-sm text-muted-foreground">La integridad criptográfica del documento está intacta.</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <User className="w-4 h-4" /> Datos del Firmante
                </h3>
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{result.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">DNI / Identificación</p>
                  <p className="font-medium">{result.customerIdentity}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <FileSignature className="w-4 h-4" /> Detalles de Operación
                </h3>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha y Hora Exacta</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(result.signedAt).toLocaleString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Técnico a cargo</p>
                  <p className="font-medium">{result.technicianName}</p>
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <MapPin className="w-4 h-4" /> Equipos Mantenidos
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.dispensers.map((d: string) => (
                    <span key={d} className="bg-muted px-3 py-1.5 rounded-lg text-sm font-medium font-mono">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 md:col-span-2">
                <h3 className="font-bold uppercase tracking-wider text-xs text-muted-foreground flex items-center gap-2 border-b border-border pb-2">
                  <Monitor className="w-4 h-4" /> Trazabilidad Técnica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Dirección IP
                    </p>
                    <p className="text-sm font-mono mt-1">{result.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> Dispositivo (User Agent)
                    </p>
                    <p className="text-sm mt-1 break-words">{result.deviceInfo}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
