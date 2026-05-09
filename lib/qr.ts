/**
 * Extrae de forma inteligente el ID de un dispenser de un texto escaneado.
 * Maneja formatos como:
 * - https://hdb-service.com/qr/DISP-A058
 * - /dispensers/DISP-A058
 * - DISP-A058
 */
export function extractDispenserId(text: string): string | null {
  if (!text) return null;

  let id = '';
  
  // Si contiene patrones de URL comunes en la app
  if (text.includes('/qr/') || text.includes('/dispensers/')) {
    const parts = text.split('/');
    id = parts.pop() || '';
    // Si la URL terminaba en /, tomamos el segmento anterior
    if (!id && parts.length > 0) id = parts.pop() || '';
  } 
  // Si no, asumimos que es el texto directo
  else {
    id = text.trim();
  }

  // Limpiar parámetros de consulta o fragmentos si los hay
  id = id.split('?')[0].split('#')[0].toUpperCase();

  // Validar que cumpla con el prefijo DISP-
  if (id.startsWith('DISP-')) {
    return id;
  }

  return null;
}
