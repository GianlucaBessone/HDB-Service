# Notificaciones: correo y push

## Correos

| Plantilla | Cuándo se envía | Destinatarios |
|---|---|---|
| Bienvenida (clave temporal) | Alta de usuario | El usuario creado |
| Ticket creado | Alta de ticket | Supervisores, administradores y técnicos de la planta |
| Ticket asignado | Asignación a un técnico (no al tomarlo uno mismo) | El técnico asignado |
| Ticket resuelto | Ticket pasa a *Resuelto* | Quien lo reportó, si marcó "También por correo" |
| Activo bloqueado (responsable) | Activo pasa a *Bloqueado* | Responsables del cliente |
| Activo bloqueado (referente) | Activo pasa a *Bloqueado* | Referentes de la planta |

- Los textos se editan en **Configuración → Emails** (vista previa y "Enviarme una prueba").
- Si una plantilla no está guardada o tiene el texto de relleno anterior, se usa el texto recomendado de `lib/emailTemplates.ts`.
- Todos los correos salen con el diseño de marca y una versión en texto plano. Los datos ingresados por usuarios se escapan.
- Una plantilla desactivada no se envía.

### Modo prueba
En **Configuración → Servidor SMTP**. Mientras está activo, **todos** los correos van a la casilla de prueba y el asunto indica a quién iban dirigidos. Viene activo por defecto (comportamiento anterior); desactivarlo para enviar a los usuarios reales.

### Enlaces
Los botones de los correos y las notificaciones push usan `APP_URL`; si no está definida, se usa automáticamente el dominio de producción de Vercel (`VERCEL_PROJECT_PRODUCTION_URL`).

## Notificaciones push (OneSignal)

Variables de entorno: `NEXT_PUBLIC_ONESIGNAL_APP_ID`, `ONESIGNAL_APP_ID`, `ONESIGNAL_API_KEY` (clave REST; funcionan tanto las claves nuevas `os_v2_…` como las heredadas).

- Cada usuario activa las notificaciones en su dispositivo desde **menú de usuario → Notificaciones push → Activar**, y puede **enviarse una prueba**.
- El dispositivo se vincula al usuario con `OneSignal.login(user.id)` (External ID).
- El service worker de OneSignal se registra en `/push/onesignal/` para no competir con el de la PWA (`/sw.js`). Si en el panel de OneSignal se configuró una ruta de service worker distinta, actualizarla a `push/onesignal/OneSignalSDKWorker.js` con scope `/push/onesignal/`.
- En iPhone/iPad las notificaciones web sólo funcionan con la app instalada ("Agregar a pantalla de inicio", iOS 16.4+).

| Evento | Destinatarios |
|---|---|
| Ticket creado | Supervisores, administradores y técnicos de la planta |
| Ticket asignado | El técnico |
| Ticket en curso / resuelto / cerrado | Quien lo reportó, si activó "Recibir notificaciones de este ticket" |
| Ticket cerrado sin resolver | Supervisores y quien lo reportó |
| SLA vencido o por vencer | Supervisores y administradores |
