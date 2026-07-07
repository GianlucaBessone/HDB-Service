'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { X, Loader2, Download } from 'lucide-react';
import dynamic from 'next/dynamic';
import { DispenserQRPDF } from '@/components/DispenserQRPDF';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(mod => mod.PDFDownloadLink),
  { ssr: false }
);

interface DispenserQRModalProps {
  dispenserId: string;
  onClose: () => void;
}

export default function DispenserQRModal({ dispenserId, onClose }: DispenserQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    async function generateQR() {
      try {
        const origin = window.location.origin;
        const url = `${origin}/qr/${dispenserId}`;
        const dataUrl = await QRCode.toDataURL(url, {
          margin: 2,
          width: 300,
          errorCorrectionLevel: 'H'
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error('Error al generar QR:', err);
      }
    }
    generateQR();
  }, [dispenserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold">Código QR del Dispenser</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center justify-center">
          {!qrDataUrl ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Generando código QR...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <img src={qrDataUrl} alt={`QR Code para Dispenser ${dispenserId}`} className="w-48 h-48" />
              </div>
              <p className="text-sm font-mono text-muted-foreground font-medium">{dispenserId}</p>

              <PDFDownloadLink
                document={<DispenserQRPDF qrs={[{ id: dispenserId, qrDataUrl }]} />}
                fileName={`QR_${dispenserId}.pdf`}
                className="btn-primary w-full gap-2 flex items-center justify-center"
              >
                {({ loading }: any) => (
                  <>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {loading ? 'Preparando PDF...' : 'Descargar PDF'}
                  </>
                )}
              </PDFDownloadLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
