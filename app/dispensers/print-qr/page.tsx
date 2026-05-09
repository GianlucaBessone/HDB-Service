'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import QRCode from 'qrcode';

// Dynamic import to avoid SSR issues with PDFViewer
const PDFViewer = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFViewer),
  { ssr: false, loading: () => <div className="p-8 text-center animate-pulse">Cargando visor de PDF...</div> }
);

import { DispenserQRPDF } from '@/components/DispenserQRPDF';

export default function PrintQRPage() {
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
    <div className="h-screen w-full flex flex-col">
      <div className="p-4 bg-muted/30 border-b flex justify-between items-center">
        <div>
          <h1 className="font-bold text-lg">Impresión de QR ({qrs.length})</h1>
          <p className="text-sm text-muted-foreground">Utiliza el botón de impresión dentro del visor PDF.</p>
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
