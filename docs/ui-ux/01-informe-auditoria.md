# Informe de auditoría UI/UX — HDB Service

**Fecha:** noviembre 2026 · **Alcance:** toda la aplicación web/PWA (shell, 24 pantallas, 14 componentes compartidos, páginas públicas).

---

## 1. Resumen ejecutivo

La aplicación es funcionalmente completa, pero su capa visual transmite "plantilla generada" más que "software empresarial":

| Dimensión | Estado inicial | Riesgo |
|---|---|---|
| Identidad visual | Genérica (gradientes, brillos, glassmorphism) | Alto — resta credibilidad frente a clientes corporativos |
| Consistencia | Baja: cada pantalla resuelve encabezados, KPIs, filtros y modales a su manera | Alto — curva de aprendizaje y mantenimiento |
| Responsive / móvil | Parcial: funciona, pero con modales cortados, tablas desbordadas, textos de 9–10 px y zoom bloqueado | Alto — los técnicos trabajan desde el celular |
| Confiabilidad de datos | El dashboard mostraba **valores ficticios** cuando la API no devolvía datos | Crítico |
| Accesibilidad | Zoom deshabilitado, botones solo-ícono sin etiqueta, selects sin indicador | Medio |

**Decisión:** rehacer el sistema de diseño (tokens, tipografía, componentes base y shell de navegación) y migrar todas las pantallas a él, sin tocar la lógica de negocio ni las APIs.

---

## 2. Hallazgos detallados

### 2.1 Rasgos de "UI generada por IA"
- Gradientes `primary → cyan` en logo, login, set-password y página de sugerencias.
- Manchas de color difuminadas (`blur-[120px]`, `mix-blend-multiply`) de fondo en inicio, login y sugerencias.
- *Glassmorphism*: `backdrop-blur` en 34 lugares y `.glass-card` (fondo translúcido + blur) en 88 tarjetas.
- Íconos rotados (`rotate-3 hover:rotate-0`), efecto *shimmer* en botones, *hover lift* (`-translate-y`, `scale`) en tarjetas.
- Badge decorativo "✨ Multiactivo" con ícono `Sparkles` en el dashboard.
- Animaciones `pulse` permanentes en badges y contadores (16 usos) que no comunican urgencia real.
- Saludo informal "¡Buenas tardes, Nombre!" y textos de marketing ("Centro de Control Operativo", "en tiempo real", "integral").
- Barra inferior móvil con botón QR flotante que cambia de tamaño con el scroll mediante manipulación directa del DOM.

### 2.2 Inconsistencias de sistema
- **Encabezados de página:** 4 variantes (ícono en caja, ícono suelto, sin ícono; `text-2xl`/`text-3xl`; `font-bold`/`font-extrabold`).
- **Tarjetas KPI:** `KpiCard` duplicado en Tickets, Activos y Mantenimiento con estilos distintos; Presupuestos y Dashboard usan otro patrón.
- **Radios:** se mezclan `rounded-md/lg/xl/2xl/3xl` (55 usos de `rounded-2xl`).
- **Inputs:** convivían la clase `.input` y campos ad-hoc (`px-3 py-2 border rounded-lg`) en Usuarios y Reportes.
- **Paleta:** colores decorativos sin significado (sky, purple, indigo, rose, cyan, violet). Las pestañas del dashboard tenían un color distinto cada una.
- **Pesos tipográficos:** `font-black` y `font-extrabold` mezclados con `font-bold`.
- **Microtexto:** 116 textos en 9, 10 y 11 px — ilegibles en móvil.
- **Tipografía cargada dos veces:** Inter vía `@import` en CSS y vía `next/font`.

### 2.3 Responsive y móvil
- `maximumScale: 1, userScalable: false` impedía el zoom (incumple WCAG 1.4.4).
- Layout con `h-screen` (100vh): en Safari/Chrome móvil la barra del navegador corta el contenido inferior.
- Inputs con `text-sm` (14 px) → iOS hace zoom automático al enfocarlos.
- 22 modales con overlays propios centrados con `p-4`: en móvil quedaban cortados y sin *safe area*.
- Tablas (Usuarios, Inventario, Configuración, Reportes) sin alternativa móvil.
- Dropdown de notificaciones posicionado con `top` fijo.

### 2.4 Integridad de datos (crítico)
El resumen del dashboard mostraba `94%`, `18.4h` y `42` como valores por defecto. Además, leía campos que **las APIs no devuelven** (`overallHealthScore`, `avgResolutionHours`, `completedTicketsThisMonth`…), por lo que **siempre** se veían esas cifras inventadas. **Corregido:** el dashboard ahora calcula los indicadores desde los campos reales (`ranking`, `distribution`, `kpis.sla/mttr/mtbf`) y muestra "—" cuando no hay dato.

Además, `/api/dashboard/salud` generaba la evolución mensual del score con una función seno sobre el valor actual (no era histórico real). **Corregido con fotos mensuales congeladas** (tabla `AssetHealthSnapshot`):

- El cron diario (`/api/cron`) guarda, una vez por activo y mes, la foto de salud al cierre del mes anterior. Las fotos **nunca se actualizan** (`skipDuplicates`), así que la evolución queda fija aunque después se carguen datos retroactivos, se elimine un activo o cambie la fórmula (`formulaVersion`).
- La primera vez se completan los 5 meses previos con una carga inicial **reconstruida** con los datos disponibles al cierre de cada mes; en la vista se identifica como tal.
- La foto guarda cliente y plantas del momento, por lo que los filtros y permisos se aplican sobre el ámbito histórico.
- El mes en curso se muestra en vivo y como provisorio.

### 2.5 Funcionalidad rota o engañosa
- `Ctrl/⌘ + K` sólo cerraba la paleta de comandos; nunca la abría.
- Botón "Filtrar" en Usuarios sin acción.
- Clase `custom-scrollbar` referenciada pero no definida.
- `select` con `appearance-none` sin flecha → no se reconocían como desplegables.
- `getStatusColor` sin variantes oscuras → badges pastel brillantes en modo oscuro.
- Cerrar sesión era un ícono suelto, sin menú de usuario.
- El enlace "Ver todos" de tickets en la ficha de activo (`/tickets?search=`) no filtraba.
- Acciones de editar/eliminar visibles sólo con *hover* (inaccesibles en pantallas táctiles).
- Barra de selección para firma en Mantenimiento quedaba tapada por la barra inferior móvil.
- Calendario de Mantenimiento ilegible en móvil (chips de 10 px); ahora muestra el detalle del día al tocarlo.

### 2.6 Navegación y arquitectura de información
- 11 ítems planos en la barra lateral, sin agrupación.
- Mismo ícono para "Firmas" y "Presupuestos".
- "Inicio" repetía el menú como grilla de tarjetas sin información accionable.
- Sin título de sección en la barra superior.

### 2.7 Redacción
- Mezcla de "&" e "y", Title Case ("Confiabilidad & Salud MTTR"), exclamaciones ("¡Ups!"), tuteo ("tienes") en una app de uso en Argentina.

---

## 3. Plan de corrección aplicado

1. **Reglas de marca y sistema de diseño** → `docs/ui-ux/02-reglas-de-marca.md`.
2. **Tokens** (color, tipografía, radios, sombras, movimiento) en `app/globals.css` y `tailwind.config.ts`.
3. **Componentes base** en `components/ui/`: `PageHeader`, `StatCard`, `Panel`, `EmptyState`, `StatusBadge`, `Modal`, `BrandMark`, `FilterBar`.
4. **Shell nuevo:** barra lateral agrupada por dominio, barra superior con título de sección, buscador y menú de usuario, barra inferior móvil plana con *safe area*.
5. **Migración de todas las pantallas** a los componentes y tokens, quitando decoración, corrigiendo textos y adaptando a móvil (modales tipo *bottom sheet*, tablas con vista de tarjetas, objetivos táctiles ≥ 40 px).
6. **Correcciones funcionales** listadas en 2.4 y 2.5.

## 4. Resultado

| Antes | Después |
|---|---|
| Inter + gradientes cian + glassmorphism | IBM Plex Sans/Mono, petróleo sobrio, superficies opacas con borde |
| 4 estilos de encabezado, 3 de KPI | `PageHeader` y `StatCard` únicos en todas las pantallas |
| 11 ítems planos en el menú | 5 grupos: General, Operación, Activos y stock, Gestión, Administración |
| Modales centrados cortados en móvil | Hojas inferiores con encabezado y pie fijos y *safe area* |
| Tablas que desbordaban | Columnas prioritarias + vista de tarjetas en móvil |
| Textos de 9–10 px | Mínimo 11 px; campos a 16 px en móvil |
| Zoom bloqueado | Zoom habilitado |
| Datos ficticios en dashboard | Datos reales o "—" |

## 5. Pendientes recomendados (fuera de alcance)
- Pruebas de usabilidad con 3–5 técnicos en campo (escaneo QR + checklist).
- Auditoría de contraste automática (axe) en CI.
- Validar el isotipo con un diseñador (los íconos PWA ya se regeneraron con el monograma provisorio).
- La tabla `AssetHealthSnapshot` se crea sola la primera vez que corre el cron o se abre la vista (DDL idempotente). El script `prisma/sql/2026-11_asset_health_snapshot.sql` queda como referencia.
