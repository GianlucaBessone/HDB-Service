'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import PageHeader from '@/components/ui/PageHeader';
import { useRouter } from 'next/navigation';
import { 
  ScanLine, ArrowLeft, Loader2, Camera, 
  CameraOff, History, ChevronRight,
  Maximize2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { extractDispenserId } from '@/lib/qr';

export default function QRScanPage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recent_scans');
    if (saved) {
      const ids: string[] = JSON.parse(saved).slice(0, 5);
      // Validate that recent dispensers still exist
      Promise.all(
        ids.map(id =>
          fetch(`/api/dispensers/${id}`)
            .then(res => (res.ok ? id : null))
            .catch(() => null)
        )
      ).then(results => {
        const valid = results.filter((id): id is string => id !== null);
        setRecentScans(valid);
        localStorage.setItem('recent_scans', JSON.stringify(valid));
      });
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    setIsLoading(false);

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) return;
    
    try {
      setIsLoading(true);
      await scannerRef.current.start(
        { facingMode: "environment" },
        { 
          fps: 20, 
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            return { width: size, height: size };
          },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanFailure
      );
      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error("No se pudo acceder a la cámara. Verifique los permisos.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  async function onScanSuccess(decodedText: string) {
    const dispenserId = extractDispenserId(decodedText);

    if (dispenserId) {
      await stopScanning();
      toast.success('Equipo detectado: ' + dispenserId);
      
      const updated = [dispenserId, ...recentScans.filter(id => id !== dispenserId)].slice(0, 5);
      setRecentScans(updated);
      localStorage.setItem('recent_scans', JSON.stringify(updated));

      setTimeout(() => {
        router.push(`/qr/${dispenserId}`);
      }, 300);
    } else {
      toast.error('Código no reconocido');
    }
  }

  function onScanFailure() {}

  return (
    <div className="mx-auto max-w-md space-y-6 animate-fade-in">
      <PageHeader
        title="Escanear activo"
        description="Apuntá la cámara al código QR del equipo."
      />

      <div className="space-y-4">
        {/* Visor */}
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-sidebar">
          <div id="qr-reader" className="h-full w-full"></div>

          {isScanning && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative h-[68%] w-[68%]">
                <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white/90" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white/90" />
                <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/90" />
                <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/90" />
              </div>
              <div className="absolute left-[16%] right-[16%] top-0 h-px bg-[hsl(var(--sidebar-active))] animate-scan-line"></div>
            </div>
          )}

          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center text-sidebar-foreground">
              {isLoading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-sidebar-muted" />
                  <p className="max-w-[220px] text-sm text-sidebar-muted">La cámara se activa sólo mientras escaneás.</p>
                  <button onClick={startScanning} className="btn-primary h-11 px-6">
                    <ScanLine className="h-4 w-4" />
                    Iniciar escaneo
                  </button>
                </>
              )}
            </div>
          )}

          {isScanning && (
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2">
              <button onClick={stopScanning} className="btn h-11 border border-white/20 bg-black/60 px-5 text-white hover:bg-black/70">
                <CameraOff className="h-4 w-4" />
                Detener
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => router.push('/dispensers')}
          className="glass-card-hover flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <span className="flex items-center gap-3">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Buscar en el listado de activos</span>
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>

        {recentScans.length > 0 && (
          <section>
            <h2 className="eyebrow mb-2 flex items-center gap-1.5 px-1">
              <History className="h-3.5 w-3.5" />
              Recientes
            </h2>
            <ul className="glass-card divide-y divide-border overflow-hidden">
              {recentScans.map(id => (
                <li key={id}>
                  <button
                    onClick={() => router.push(`/dispensers/${id}`)}
                    className="flex min-h-[48px] w-full items-center justify-between gap-3 px-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="font-mono text-sm font-medium">{id}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
