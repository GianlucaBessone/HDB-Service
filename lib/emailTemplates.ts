/**
 * Plantillas de correo de HDB Service.
 *
 * - Metadatos de cada tipo (etiqueta, cuándo se envía, variables disponibles).
 * - Textos predeterminados: se usan como respaldo si la plantilla no existe en la base
 *   o si todavía tiene el texto de relleno, y se pueden cargar desde Configuración → Emails.
 * - Diseño (layout) con la marca, compartido entre el envío y la vista previa.
 *
 * Este módulo no accede a la base: puede importarse desde el cliente.
 *
 * Formato del cuerpo: texto con saltos de línea (se convierten a <br>) y HTML simple
 * (<strong>, <em>, <a>). Variables entre llaves: {nombre}.
 */

export type EmailTemplateType =
  | 'WELCOME_TEMP_PASSWORD'
  | 'TICKET_CREATED'
  | 'TICKET_ASSIGNED'
  | 'TICKET_RESOLVED'
  | 'DISPENSER_BLOCKED'
  | 'DISPENSER_BLOCKED_REQUESTER';

export interface EmailTemplateDefinition {
  label: string;
  help: string;
  variables: string[];
  /** Texto del botón que lleva a {link}. */
  ctaLabel: string;
  subject: string;
  body: string;
  /** Valores de ejemplo para la vista previa. */
  sample: Record<string, string>;
}

/** Textos de relleno que generaba la versión anterior al inicializar plantillas. */
export const PLACEHOLDER_BODY = 'Cuerpo de correo predeterminado';
export const isPlaceholderTemplate = (t: { subject?: string | null; body?: string | null } | null | undefined) =>
  !t || !t.body?.trim() || t.body.trim() === PLACEHOLDER_BODY || /^Notificación: [A-Z_]+$/.test(t.subject?.trim() || '');

const SAMPLE_COMMON = { link: 'https://hdb-service.app/tickets/TK-2026-0412' };

export const EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateDefinition> = {
  WELCOME_TEMP_PASSWORD: {
    label: 'Bienvenida (clave temporal)',
    help: 'Se envía al crear un usuario nuevo, con su contraseña temporal.',
    variables: ['{nombre_completo}', '{primer_nombre}', '{email}', '{contraseña}', '{link}'],
    ctaLabel: 'Ingresar a HDB Service',
    subject: 'Tu acceso a HDB Service',
    body: `Hola {primer_nombre}:

Se creó tu usuario en <strong>HDB Service</strong>, la plataforma de gestión de mantenimiento y activos.

<strong>Usuario:</strong> {email}
<strong>Contraseña temporal:</strong> {contraseña}

Por seguridad, en el primer ingreso el sistema te va a pedir que definas una contraseña nueva. No compartas estos datos con nadie.

Desde el celular podés instalar la aplicación desde el navegador ("Agregar a la pantalla de inicio") para escanear códigos QR y recibir notificaciones.`,
    sample: {
      ...SAMPLE_COMMON,
      nombre_completo: 'María Gómez',
      primer_nombre: 'María',
      email: 'maria.gomez@empresa.com',
      'contraseña': 'Hdb-4821',
      link: 'https://hdb-service.app/login',
    },
  },

  TICKET_CREATED: {
    label: 'Ticket creado',
    help: 'Se envía a supervisores, administradores y técnicos de la planta cuando se registra un ticket.',
    variables: ['{id_ticket}', '{motivo}', '{reportador_completo}', '{primer_nombre_reportador}', '{prioridad}', '{planta}', '{ubicacion}', '{link}'],
    ctaLabel: 'Ver ticket',
    subject: 'Nuevo ticket {id_ticket} · Prioridad {prioridad} · {planta}',
    body: `Se registró un nuevo ticket de servicio técnico.

<strong>Ticket:</strong> {id_ticket}
<strong>Motivo:</strong> {motivo}
<strong>Prioridad:</strong> {prioridad}
<strong>Planta:</strong> {planta}
<strong>Ubicación:</strong> {ubicacion}
<strong>Reportado por:</strong> {reportador_completo}

Ingresá a la plataforma para asignarlo o tomarlo.`,
    sample: {
      ...SAMPLE_COMMON,
      id_ticket: 'TK-2026-0412',
      motivo: 'Cámara frigorífica no alcanza temperatura de consigna',
      reportador_completo: 'Laura Fernández',
      primer_nombre_reportador: 'Laura',
      prioridad: 'Crítica',
      planta: 'Planta Arroyito',
      ubicacion: 'Depósito de producto terminado',
    },
  },

  TICKET_ASSIGNED: {
    label: 'Ticket asignado',
    help: 'Se envía al técnico cuando se le asigna un ticket.',
    variables: ['{id_ticket}', '{motivo}', '{tecnico_completo}', '{primer_nombre_tecnico}', '{prioridad}', '{planta}', '{ubicacion}', '{dias_vencimiento_sla}', '{fecha_vencimiento_sla}', '{link}'],
    ctaLabel: 'Ver ticket',
    subject: 'Se te asignó el ticket {id_ticket} · Prioridad {prioridad}',
    body: `Hola {primer_nombre_tecnico}:

Se te asignó un ticket de servicio técnico.

<strong>Ticket:</strong> {id_ticket}
<strong>Motivo:</strong> {motivo}
<strong>Prioridad:</strong> {prioridad}
<strong>Planta:</strong> {planta}
<strong>Ubicación:</strong> {ubicacion}
<strong>Vencimiento de resolución (SLA):</strong> {fecha_vencimiento_sla} ({dias_vencimiento_sla})

Registrá el avance y la reparación desde la plataforma para mantener informado al cliente.`,
    sample: {
      ...SAMPLE_COMMON,
      id_ticket: 'TK-2026-0412',
      motivo: 'Cámara frigorífica no alcanza temperatura de consigna',
      tecnico_completo: 'Martín Ruiz',
      primer_nombre_tecnico: 'Martín',
      prioridad: 'Crítica',
      planta: 'Planta Arroyito',
      ubicacion: 'Depósito de producto terminado',
      dias_vencimiento_sla: 'vence en 1 día',
      fecha_vencimiento_sla: '04/11/2026 14:00',
    },
  },

  TICKET_RESOLVED: {
    label: 'Ticket resuelto',
    help: 'Se envía a quien reportó el ticket cuando se resuelve (si eligió recibir avisos por correo).',
    variables: ['{id_ticket}', '{motivo}', '{resolucion}', '{tecnico_completo}', '{primer_nombre_tecnico}', '{reportador_completo}', '{primer_nombre_reportador}', '{planta}', '{ubicacion}', '{fecha_resolucion}', '{link}'],
    ctaLabel: 'Ver detalle',
    subject: 'Ticket {id_ticket} resuelto · {planta}',
    body: `Hola {primer_nombre_reportador}:

El ticket que reportaste fue resuelto.

<strong>Ticket:</strong> {id_ticket}
<strong>Motivo:</strong> {motivo}
<strong>Resolución:</strong> {resolucion}
<strong>Técnico:</strong> {tecnico_completo}
<strong>Fecha:</strong> {fecha_resolucion}
<strong>Planta / ubicación:</strong> {planta} · {ubicacion}

Si el problema continúa, podés generar un nuevo ticket desde la plataforma o escaneando el código QR del equipo.`,
    sample: {
      ...SAMPLE_COMMON,
      id_ticket: 'TK-2026-0412',
      motivo: 'Cámara frigorífica no alcanza temperatura de consigna',
      resolucion: 'Se reemplazó el presostato de baja y se verificó la carga de refrigerante.',
      tecnico_completo: 'Martín Ruiz',
      primer_nombre_tecnico: 'Martín',
      reportador_completo: 'Laura Fernández',
      primer_nombre_reportador: 'Laura',
      planta: 'Planta Arroyito',
      ubicacion: 'Depósito de producto terminado',
      fecha_resolucion: '03/11/2026',
    },
  },

  DISPENSER_BLOCKED: {
    label: 'Activo bloqueado (aviso al responsable)',
    help: 'Se envía a los responsables del cliente cuando un activo queda bloqueado y requiere reparación mayor, reemplazo u orden de compra.',
    variables: ['{id_equipo}', '{id_dispenser}', '{marca}', '{modelo}', '{motivo_cambio}', '{tecnico_completo}', '{primer_nombre_tecnico}', '{responsable_completo}', '{primer_nombre_responsable}', '{planta}', '{ubicacion}', '{fecha_bloqueo}', '{link}'],
    ctaLabel: 'Ver activo',
    subject: 'Acción requerida: activo {id_equipo} bloqueado · {planta}',
    body: `Hola {primer_nombre_responsable}:

El activo <strong>{id_equipo}</strong> ({marca} {modelo}) quedó bloqueado y necesita una definición de tu parte para volver a operar.

<strong>Motivo:</strong> {motivo_cambio}
<strong>Planta / ubicación:</strong> {planta} · {ubicacion}
<strong>Informado por:</strong> {tecnico_completo}
<strong>Fecha:</strong> {fecha_bloqueo}

Si corresponde una reparación mayor o un reemplazo, podés aprobar el presupuesto y cargar la orden de compra desde la sección Presupuestos y OC.`,
    sample: {
      ...SAMPLE_COMMON,
      id_equipo: 'CF-003',
      id_dispenser: 'CF-003',
      marca: 'Bohn',
      modelo: 'BCH-3500',
      motivo_cambio: 'Compresor con falla eléctrica; se recomienda reemplazo.',
      tecnico_completo: 'Martín Ruiz',
      primer_nombre_tecnico: 'Martín',
      responsable_completo: 'Jorge Peralta',
      primer_nombre_responsable: 'Jorge',
      planta: 'Planta Arroyito',
      ubicacion: 'Depósito de producto terminado',
      fecha_bloqueo: '03/11/2026',
      link: 'https://hdb-service.app/dispensers/CF-003',
    },
  },

  DISPENSER_BLOCKED_REQUESTER: {
    label: 'Activo bloqueado (aviso al referente)',
    help: 'Se envía a los referentes de la planta cuando un activo queda bloqueado.',
    variables: ['{id_equipo}', '{id_dispenser}', '{marca}', '{modelo}', '{motivo_cambio}', '{tecnico_completo}', '{primer_nombre_tecnico}', '{referente_completo}', '{primer_nombre_referente}', '{planta}', '{ubicacion}', '{fecha_bloqueo}', '{link}'],
    ctaLabel: 'Ver activo',
    subject: 'Aviso: activo {id_equipo} fuera de servicio · {planta}',
    body: `Hola {primer_nombre_referente}:

Te informamos que el activo <strong>{id_equipo}</strong> ({marca} {modelo}) de tu planta quedó fuera de servicio.

<strong>Motivo:</strong> {motivo_cambio}
<strong>Ubicación:</strong> {planta} · {ubicacion}
<strong>Informado por:</strong> {tecnico_completo}
<strong>Fecha:</strong> {fecha_bloqueo}

El responsable de tu empresa ya fue notificado para definir los próximos pasos. Te avisaremos cuando el activo vuelva a estar operativo.`,
    sample: {
      ...SAMPLE_COMMON,
      id_equipo: 'CF-003',
      id_dispenser: 'CF-003',
      marca: 'Bohn',
      modelo: 'BCH-3500',
      motivo_cambio: 'Compresor con falla eléctrica; se recomienda reemplazo.',
      tecnico_completo: 'Martín Ruiz',
      primer_nombre_tecnico: 'Martín',
      referente_completo: 'Laura Fernández',
      primer_nombre_referente: 'Laura',
      planta: 'Planta Arroyito',
      ubicacion: 'Depósito de producto terminado',
      fecha_bloqueo: '03/11/2026',
      link: 'https://hdb-service.app/dispensers/CF-003',
    },
  },
};

export const EMAIL_TEMPLATE_TYPES = Object.keys(EMAIL_TEMPLATES) as EmailTemplateType[];

// ─────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Reemplaza {variables}. En el cuerpo los valores se escapan (vienen de datos de usuarios). */
export function applyVariables(text: string, variables: Record<string, string>, opts: { html: boolean }) {
  return text.replace(/\{([a-zA-Z0-9_ñáéíóú]+)\}/g, (match, key: string) => {
    if (!(key in variables)) return match;
    const value = variables[key] ?? '';
    return opts.html ? escapeHtml(value) : value;
  });
}

/** Convierte saltos de línea en <br> salvo que el cuerpo ya use etiquetas de bloque. */
function normalizeBody(body: string) {
  if (/<(p|div|table|ul|ol|h[1-6])[\s>]/i.test(body)) return body;
  return body
    .trim()
    .split(/\n{2,}/)
    .map(par => `<p style="margin:0 0 16px 0;">${par.replace(/\n/g, '<br />')}</p>`)
    .join('');
}

const BRAND = {
  primary: '#0F6A7B',
  ink: '#182130',
  muted: '#5C6676',
  border: '#DDE2E8',
  bg: '#F5F7F9',
  dark: '#151C27',
};

/** Arma el HTML final del correo con la marca. */
export function renderEmailHtml({
  subject,
  body,
  variables,
  ctaLabel,
}: {
  subject: string;
  body: string;
  variables: Record<string, string>;
  ctaLabel?: string;
}) {
  const content = normalizeBody(applyVariables(body, variables, { html: true }));
  const link = variables.link && /^https?:\/\//.test(variables.link) ? escapeHtml(variables.link) : '';
  const title = escapeHtml(applyVariables(subject, variables, { html: false }));

  const button = link && ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px 0;"><tr><td style="border-radius:6px;background:${BRAND.primary};">
         <a href="${link}" style="display:inline-block;padding:11px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(ctaLabel)}</a>
       </td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr><td style="background:${BRAND.dark};border-radius:8px 8px 0 0;padding:16px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="width:28px;height:28px;background:${BRAND.primary};border-radius:6px;text-align:center;font:700 16px/28px Arial,Helvetica,sans-serif;color:#ffffff;">H</td>
            <td style="padding-left:10px;font:600 15px Arial,Helvetica,sans-serif;color:#E6EAF0;">HDB Service</td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#ffffff;border:1px solid ${BRAND.border};border-top:0;border-radius:0 0 8px 8px;padding:28px 24px;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:${BRAND.ink};">
          ${content}
          ${button}
        </td></tr>
        <tr><td style="padding:16px 8px;font:400 12px/1.5 Arial,Helvetica,sans-serif;color:${BRAND.muted};text-align:center;">
          Mensaje automático de HDB Service · Gestión de mantenimiento y activos.<br />Por favor, no respondas a este correo.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Texto plano alternativo (mejora la entrega y la lectura en clientes sin HTML). */
export function renderEmailText(body: string, variables: Record<string, string>) {
  const text = applyVariables(body, variables, { html: false })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return variables.link ? `${text}\n\n${variables.link}` : text;
}
