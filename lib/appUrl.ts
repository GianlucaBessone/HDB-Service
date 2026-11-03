/** URL pública de la app (para enlaces en correos y notificaciones push). */
export function appUrl(path = '/') {
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (!base) return '';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
