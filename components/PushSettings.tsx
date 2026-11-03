'use client';

import { useCallback, useEffect, useState } from 'react';
import { BellRing, BellOff, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { PushState, enablePush, disablePush, getPushState, onPushChange } from '@/lib/pushClient';

const LABELS: Record<PushState, { text: string; tone: string }> = {
  'not-configured': { text: 'No configuradas', tone: 'badge-neutral' },
  unsupported: { text: 'No disponibles', tone: 'badge-neutral' },
  loading: { text: 'Verificando…', tone: 'badge-neutral' },
  denied: { text: 'Bloqueadas', tone: 'badge-danger' },
  default: { text: 'Desactivadas', tone: 'badge-warning' },
  subscribed: { text: 'Activadas', tone: 'badge-success' },
  unsubscribed: { text: 'Desactivadas', tone: 'badge-warning' },
};

/** Estado y control de las notificaciones push del dispositivo actual. */
export default function PushSettings() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    getPushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  useEffect(() => {
    refresh();
    onPushChange(refresh);
  }, [refresh]);

  const handleEnable = async () => {
    setBusy(true);
    const next = await enablePush();
    setState(next);
    setBusy(false);
    if (next === 'subscribed') toast.success('Notificaciones activadas en este dispositivo');
    else if (next === 'denied') toast.error('El navegador bloqueó las notificaciones');
  };

  const handleDisable = async () => {
    setBusy(true);
    setState(await disablePush());
    setBusy(false);
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/notifications/test-push', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) toast.success('Notificación de prueba enviada');
      else toast.error(data.error ? `No se pudo enviar: ${String(data.error).slice(0, 140)}` : 'No se pudo enviar la prueba');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  const label = LABELS[state];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">Notificaciones push</p>
        <span className={label.tone}>{label.text}</span>
      </div>

      {state === 'default' || state === 'unsubscribed' ? (
        <button onClick={handleEnable} disabled={busy} className="btn-primary btn-sm w-full">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
          Activar en este dispositivo
        </button>
      ) : state === 'subscribed' ? (
        <div className="flex gap-2">
          <button onClick={handleTest} disabled={busy} className="btn-outline btn-sm flex-1">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Enviar prueba
          </button>
          <button onClick={handleDisable} disabled={busy} className="btn-ghost btn-sm" title="Desactivar en este dispositivo" aria-label="Desactivar notificaciones">
            <BellOff className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : state === 'denied' ? (
        <p className="text-xs text-muted-foreground">
          Están bloqueadas en el navegador. Habilitalas desde la configuración del sitio (ícono del candado) y volvé a intentar.
        </p>
      ) : state === 'unsupported' ? (
        <p className="text-xs text-muted-foreground">
          Este navegador no admite notificaciones. En iPhone, instalá la app con “Agregar a pantalla de inicio” (iOS 16.4 o superior) y activalas desde ahí.
        </p>
      ) : state === 'not-configured' ? (
        <p className="text-xs text-muted-foreground">Falta configurar OneSignal en el servidor.</p>
      ) : null}
    </div>
  );
}
