/**
 * Extrae de forma inteligente el ID de un equipo/activo de un texto o URL escaneada.
 * Maneja formatos como:
 * - https://hdb-service.com/qr/AA-SPLIT-01
 * - https://hdb-service.com/dispensers/CF-004
 * - /dispensers/DISP-A058
 * - /qr/DISP-A058
 * - AA-SPLIT-01, CF-001, DISP-1234, o identificadores patrimoniales de clientes
 */
export function extractAssetId(text: string): string | null {
  if (!text) return null;

  let id = '';
  
  // Si contiene patrones de URL comunes en la app
  if (text.includes('/qr/') || text.includes('/dispensers/') || text.includes('/equipos/')) {
    const parts = text.split('/');
    id = parts.pop() || '';
    // Si la URL terminaba en /, tomamos el segmento anterior
    if (!id && parts.length > 0) id = parts.pop() || '';
  } 
  // Si no, asumimos que es el texto directo
  else {
    id = text.trim();
  }

  // Limpiar parámetros de consulta (?...) o fragmentos (#...) si los hay
  id = id.split('?')[0].split('#')[0].trim().toUpperCase();

  // Validar longitud mínima y que no sea una URL residual vacía
  if (id.length >= 2 && !id.includes('/') && !id.includes(' ')) {
    return id;
  }

  return null;
}

// Alias compatible para código existente
export const extractDispenserId = extractAssetId;
