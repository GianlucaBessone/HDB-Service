'use client';

import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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
    if (saved) setRecentScans(JSON.parse(saved).slice(0, 5));

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
        router.push(`/dispensers/${dispenserId}`);
      }, 300);
    } else {
      toast.error('Código no reconocido');
    }
  }

  function onScanFailure() {}

  return (
    <div className="p-4 space-y-6 animate-fade-in max-w-md mx-auto">
      {/* Navigation Row - Consistent with other pages */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-xl transition-colors shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Escaneo de Equipo</h1>
          <p className="text-xs text-muted-foreground">Identificación rápida mediante QR</p>
        </div>
      </div>

      <main className="w-full space-y-6">
        {/* Scanner Area - Simple & Functional */}
        <div className="relative w-full aspect-square bg-muted rounded-3xl overflow-hidden border border-border shadow-sm">
          <div id="qr-reader" className="w-full h-full"></div>
          
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              {/* Subtle target frame */}
              <div className="w-[70%] h-[70%] border-2 border-primary/30 rounded-2xl"></div>
              {/* Subtle scan line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-primary/40 animate-scan-line"></div>
            </div>
          )}

          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              {isLoading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              ) : (
                <div className="space-y-8 w-full max-w-[200px]">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <button 
                    onClick={startScanning}
                    className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Escanear QR
                  </button>
                </div>
              )}
            </div>
          )}

          {isScanning && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
              <button 
                onClick={stopScanning}
                className="px-6 py-3 bg-destructive text-destructive-foreground font-bold rounded-2xl shadow-xl flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <CameraOff className="w-5 h-5" />
                Detener
              </button>
            </div>
          )}
        </div>

        {/* Action: Manual Search */}
        <button 
          onClick={() => router.push('/dispensers')}
          className="w-full p-4 bg-card border border-border rounded-2xl flex items-center justify-between hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-muted rounded-xl group-hover:bg-background transition-colors">
              <Maximize2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="font-semibold">Buscar en lista manual</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Recent Scans Section */}
        {recentScans.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Recientes
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {recentScans.map(id => (
                <button
                  key={id}
                  onClick={() => router.push(`/dispensers/${id}`)}
                  className="w-full p-4 bg-card border border-border rounded-2xl flex items-center justify-between hover:border-primary/40 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      <ScanLine className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <span className="font-mono font-bold">{id}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
