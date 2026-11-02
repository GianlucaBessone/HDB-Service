'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import QRCode from 'qrcode';

// Dynamic import to avoid SSR issues with PDFViewer
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFViewer),
  { ssr: false, loading: () => <div className="p-8 text-center text-sm text-muted-foreground">Cargando visor de PDF…</div> }
);

import { DispenserQRPDF } from '@/components/DispenserQRPDF';

function PrintQRContent() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids');
  
  const [qrs, setQrs] = useState<{ id: string, qrDataUrl: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function generateQRs() {
      if (!idsParam) {
        setLoading(false);
        return;
      }
      
      const ids = idsParam.split(',');
      const origin = window.location.origin;
      const generated = await Promise.all(
        ids.map(async (id) => {
          const url = `${origin}/qr/${id}`;
          const qrDataUrl = await QRCode.toDataURL(url, {
            margin: 2,
            width: 300,
            errorCorrectionLevel: 'H'
          });
          return { id, qrDataUrl };
        })
      );
      
      setQrs(generated);
      setLoading(false);
    }
    
    generateQRs();
  }, [idsParam]);

  if (loading) {
    return <div className="p-8 text-center">Generando códigos QR...</div>;
  }

  if (qrs.length === 0) {
    return <div className="p-8 text-center">No se especificaron IDs para imprimir.</div>;
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-base font-semibold">Impresión de QR <span className="font-normal text-muted-foreground tabular">({qrs.length})</span></h1>
          <p className="text-xs text-muted-foreground">Usá el botón de impresión del visor PDF.</p>
        </div>
        <button onClick={() => window.close()} className="btn-outline">Cerrar</button>
      </div>
      <div className="flex-1">
        <PDFViewer className="w-full h-full border-none">
          <DispenserQRPDF qrs={qrs} />
        </PDFViewer>
      </div>
    </div>
  );
}

export default function PrintQRPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Cargando…</div>}>
      <PrintQRContent />
    </Suspense>
  );
}
