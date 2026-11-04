# HDB Service — Reglas de marca y sistema de diseño

Documento normativo. Toda pantalla nueva o modificada debe cumplirlo. Si algo no está cubierto, se elige la opción **más sobria**.

---

## 1. Personalidad de marca

HDB Service es una herramienta de trabajo para empresas de mantenimiento industrial (climatización, refrigeración, ventilación, agua). La interfaz debe sentirse como un **instrumento técnico**: precisa, sobria, confiable.

| Somos | No somos |
|---|---|
| Técnicos, precisos | Juguetones, "cool" |
| Sobrios, densos en información | Decorativos, con aire vacío |
| Directos | Promocionales |
| Consistentes | Sorprendentes |

**Prohibido:** gradientes decorativos, manchas difuminadas de fondo, glassmorphism, íconos rotados, brillos/shimmer, emojis, ✨, animaciones en bucle sin significado, sombras de color, *hover lift*.

---

## 2. Logotipo

- **Isotipo:** cuadrado petróleo con monograma "H" en blanco (`components/ui/BrandMark.tsx`, `public/logo.svg`).
- **Íconos de la PWA y favicon:** salen del isotipo con `node scripts/pwa/generate-icons.js` (`public/icons/vN/`, `app/favicon.ico`). Si el isotipo cambia, regenerálos en una carpeta con versión nueva (`ICONS_DIR`) y actualizá las rutas en `public/manifest.json` y `app/layout.tsx`: con la misma URL, las PWA ya instaladas no detectan el cambio.
- **Logotipo:** isotipo + "HDB Service" en IBM Plex Sans SemiBold, *tracking* −0.01em.
- Área de resguardo: ½ del lado del isotipo en todos los lados.
- Tamaños mínimos: 20 px (isotipo), 96 px de ancho (logotipo completo).
- No aplicar gradientes, sombras, rotaciones ni cambiar el color del isotipo salvo la versión monocroma blanca sobre fondos oscuros.

---

## 3. Color

Los colores se usan **por significado**, nunca por decoración. Todos están definidos como tokens en `app/globals.css`; **nunca** usar colores de Tailwind directos (`cyan-500`, `purple-500`, …) en pantallas.

### 3.1 Marca y neutros

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `primary` (Petróleo HDB) | `#0F6A7B` | `#3AAFC1` | Acción principal, estado activo, enlaces |
| `foreground` | `#182130` | `#E6EAF0` | Texto principal |
| `muted-foreground` | `#5C6676` | `#959DAB` | Texto secundario, etiquetas |
| `background` | `#F5F7F9` | `#101318` | Fondo de aplicación |
| `card` | `#FFFFFF` | `#171B22` | Superficies |
| `border` | `#DDE2E8` | `#2A3039` | Divisores, bordes |
| `sidebar` | `#151C27` | `#0C0F13` | Navegación lateral (siempre oscura) |

### 3.2 Semánticos (estado)

| Token | Significado | Ejemplos |
|---|---|---|
| `success` | Correcto, operativo, completado | En servicio, Resuelto, Aprobado |
| `warning` | Requiere atención, en curso | En progreso, Pendiente, Taller |
| `destructive` | Error, crítico, vencido, bloqueado | Crítico, Vencido, Bloqueado, Eliminar |
| `info` | Informativo, nuevo | Abierto, Firmado |
| neutro (`muted`) | Inactivo, cerrado, archivado | Cerrado, Baja |

Regla de badge: fondo al 10 %, borde al 25 %, texto al 100 % del token (`bg-success/10 text-success border-success/25`). Centralizado en `getStatusColor()` y `<StatusBadge>`.

### 3.3 Gráficos
Serie principal `primary`; series secundarias en escala de neutros + `info`. Rojo/ámbar/verde sólo para umbrales (SLA, salud).

---

## 4. Tipografía

- **Familia:** IBM Plex Sans (interfaz) · IBM Plex Mono (IDs, códigos, números de serie).
- **Números:** cifras tabulares (`tabular-nums`) en KPIs y tablas.
- **Pesos permitidos:** 400, 500, 600, 700. Prohibidos 800/900 (`font-extrabold`, `font-black`).

| Rol | Tamaño / interlineado | Peso | Clase |
|---|---|---|---|
| Título de página | 20 px móvil · 24 px desktop | 600 | `PageHeader` |
| Título de sección | 15–16 px | 600 | `Panel` |
| Cuerpo | 14 px / 20 | 400 | `text-sm` |
| Secundario | 13 px | 400 | `text-[13px]` / `text-xs` |
| Etiqueta / overline | 11 px, mayúsculas, +0.04em | 600 | `text-2xs uppercase tracking-wide` |
| KPI | 24–28 px | 600 | `StatCard` |

**Mínimo absoluto: 11 px.** En móvil los campos de formulario se renderizan a 16 px para evitar el zoom de iOS.

---

## 5. Espaciado, radios y elevación

- **Grilla base 4 px.** Espaciados estándar: 4 · 8 · 12 · 16 · 24 · 32.
- Separación entre bloques de página: 24 px (`space-y-6`); en móvil 20 px.
- Padding de página: 16 px móvil · 24 px tablet · 32 px desktop. Ancho máximo de contenido: 1440 px.
- **Radios:** 4 px badges · 6 px controles · 8 px tarjetas · 12 px modales/hojas. Nunca más de 12 px (salvo `rounded-full` en avatares y puntos de estado).
- **Elevación:** las superficies se separan con **borde 1 px**, no con sombra. Sombras sólo en elementos flotantes (menús, modales).

---

## 6. Iconografía

- Librería única: **lucide-react**, trazo por defecto.
- Tamaños: 16 px en botones y tablas, 18 px en navegación, 20 px máximo en encabezados.
- Los íconos heredan el color del texto (`currentColor`). Sólo llevan color semántico cuando comunican estado.
- No poner íconos dentro de "cajitas" de color como decoración. Cada ícono debe ser único por sección de navegación.

---

## 7. Movimiento

- Duración 150–200 ms, curva `ease-out`.
- Sólo para: aparición de overlays (fade + desplazamiento 8 px), cambios de estado de hover/focus.
- Animación en bucle sólo para cargas (`spinner`, `skeleton`) y alertas en vivo de SLA vencido (punto de estado).
- Respetar `prefers-reduced-motion`.

---

## 8. Componentes estándar

| Necesidad | Componente | Notas |
|---|---|---|
| Encabezado de pantalla | `PageHeader` | Título + descripción + acciones. En móvil las acciones bajan y ocupan el ancho. |
| Indicador numérico | `StatCard` | Etiqueta, valor, contexto. Acento semántico opcional (barra izquierda 2 px). |
| Bloque de contenido | `Panel` | Título, descripción, acciones, cuerpo. |
| Filtros | `FilterBar` | Contenedor con grilla responsive. |
| Estado vacío | `EmptyState` | Ícono neutro, título, descripción, acción opcional. |
| Estado | `StatusBadge` / `getStatusColor` | Nunca colores ad-hoc. |
| Diálogo | `.modal-overlay` + `.modal-content` / `Modal` | Hoja inferior en móvil, centrado en desktop. |
| Confirmación destructiva | `ConfirmModal` | Siempre para eliminar. |
| Botones | `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-ghost`, `.btn-destructive` | Un solo `btn-primary` por vista. |
| Campos | `.input`, `.select`, `.textarea`, `.label` | Nunca estilos ad-hoc. |
| Tablas | `.table-container` + `.table` | En móvil, ofrecer vista de tarjetas o scroll horizontal con columnas prioritarias. |

---

## 9. Responsive

| Breakpoint | Ancho | Navegación |
|---|---|---|
| Móvil | < 768 px | Barra inferior (5 accesos) + menú lateral en cajón |
| Tablet | 768–1023 px | Menú lateral en cajón + barra superior |
| Desktop | ≥ 1024 px | Menú lateral fijo 248 px |

- Objetivos táctiles ≥ 40 px (44 px en la barra inferior).
- Usar `dvh` en lugar de `vh`; respetar `env(safe-area-inset-*)`.
- Los modales se convierten en hoja inferior a pantalla completa de ancho.
- Nada de scroll horizontal de página; las tablas hacen scroll dentro de su contenedor.
- El zoom del navegador nunca se bloquea.

---

## 10. Redacción (es-AR)

- **Sentence case** en títulos, botones y pestañas: "Nuevo ticket", no "Nuevo Ticket".
- "y" en lugar de "&".
- Tono impersonal y directo: "No hay notificaciones", no "¡No tienes notificaciones!".
- Sin exclamaciones ni emojis en la interfaz.
- Botones: verbo + objeto ("Guardar cambios", "Crear activo", "Exportar PDF").
- Glosario único: **Activo** (no "equipo/dispenser" en navegación), **Ticket**, **Mantenimiento**, **Planta**, **Sector**, **Ubicación**, **Presupuesto**, **OC**.
- Fechas: `dd/mm/aaaa` con `toLocaleDateString('es-AR')`. Horas en 24 h.
- Valores ausentes: "—". **Nunca** mostrar valores de ejemplo como si fueran reales.

---

## 11. Accesibilidad

- Contraste AA (4.5:1 texto, 3:1 elementos de interfaz).
- Todo botón sólo-ícono lleva `aria-label` y `title`.
- Foco visible: anillo de 2 px `ring`.
- El estado nunca se comunica sólo con color: badge con texto o ícono.
