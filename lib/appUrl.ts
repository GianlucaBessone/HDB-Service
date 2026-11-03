/**
 * URL pública de la app (para enlaces en correos y notificaciones push).
 * Prioridad: APP_URL → NEXT_PUBLIC_APP_URL → dominio de producción de Vercel.
 */
export function appUrl(path = '/') {
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || vercelProd || '').replace(/\/+$/, '');
  if (!base) return '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
