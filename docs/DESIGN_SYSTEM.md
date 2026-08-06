# Sistema Visual

## Objetivo

Definir la base visual de AgentGuard antes de construir la interfaz. Este documento traduce la dirección fijada en `docs/design/IDENTITY.md` a tokens, componentes y patrones. Para el razonamiento detrás de cada decisión (por qué claro, por qué Archivo, por qué la barra de parada), consultar ese documento. Aquí solo la referencia de implementación.

## Escena de uso

Un equipo de operaciones revisa acciones de agentes a media mañana, en una consola de despacho de fondo claro. El 95% del tiempo la pantalla no tiene nada que decir. Hay presión controlada y necesidad de decidir sin drama.

## Estrategia visual

Estrategia: sustrato claro (único modo; sin `color-scheme: dark`), neutros precisos y color racionado a propósito.

El color no describe el contenido — solo interrumpe. La jerarquía la sostienen peso, ancho tipográfico y espacio, no el tono. No hay color de marca cromático: la identidad la llevan la cara display (Archivo), el ritmo de chasis y placas, y la barra de parada.

**Regla semántica dura**: solo dos cosas saturan la pantalla. `hold` (una acción espera a una persona: `needs_approval`, `escalated`) y `fault` (algo se rompió: `failed`, integración caída). Se distinguen por **estructura**, no solo por tono — `hold` es una losa sólida, `fault` es tinta (texto, glifo, filete de 2px), nunca una losa roja. Todo lo demás, incluido "resuelto", es neutro: en una cola de despacho, "todo bien" es la condición de fondo, no un premio en verde.

## Paleta base

Todos los colores se expresan en OKLCH. Fuente de verdad: `src/styles/tokens.css`. Cuatro familias semánticas — de las 7 del sistema anterior — más `focus`, que es una affordance de accesibilidad y se declara aparte.

### Tinta y papel (`ink` / `paper`)

Estructura, lectura, tablas, navegación y todos los estados resueltos. Es la familia por defecto: si algo no interrumpe, es neutro.

```css
:root {
  --color-paper-chassis: oklch(0.93 0.004 265); /* fondo de página: la junta entre placas */
  --color-paper-plate: oklch(0.985 0.003 265); /* paneles, tablas, filas */
  --color-paper-inset: oklch(0.895 0.005 265); /* payloads, inputs, trazas */

  --color-ink: oklch(0.24 0.045 265); /* texto principal y relleno de la acción primaria */
  --color-ink-soft: oklch(0.43 0.02 265); /* metadatos, cabeceras de columna, labels */
  --color-ink-faint: oklch(0.6 0.012 265); /* deshabilitado, placeholder, guiones — nunca contenido */
  --color-ink-hair: oklch(0.86 0.006 265); /* única línea del sistema: separa filas dentro de una placa */
}
```

`ink` es un negro azulado, no un gris neutro: el botón primario es un bloque sólido de `ink`, tiene que leerse como decisión.

### `hold` — está parado esperando a una persona

```css
:root {
  --color-hold: oklch(0.78 0.17 62); /* relleno sólido de la barra de parada; texto encima en ink */
  --color-hold-deep: oklch(0.56 0.15 55); /* tick de cabeza de la barra; texto hold sobre papel */
}
```

Ámbar por convención. Para el único elemento que un revisor de guardia debe leer sin mirar, la convención es lo correcto.

### `fault` — se rompió de verdad

```css
:root {
  --color-fault: oklch(0.45 0.17 25); /* texto, glifo, filete de 2px al borde izquierdo del bloque */
  --color-fault-wash: oklch(0.93 0.03 25); /* única placa teñida del producto: el bloque de error de ejecución */
}
```

### `act` — la afirmación

```css
:root {
  --color-act: var(--color-ink); /* relleno del botón primario, texto en paper-plate */
  --color-act-press: oklch(0.18 0.04 265); /* estado activo */
}
```

### Fuera de las cuatro familias

```css
:root {
  --color-focus: oklch(0.62 0.17 255); /* anillo de foco, 2px */
}
```

Tiene que distinguirse tanto de `hold` como de `fault`.

## Uso del color

- Neutro (`ink` / `paper`): estructura, tablas, navegación, lectura, y **todos los estados resueltos**. Es el canal por defecto.
- `hold` (ámbar): una acción espera a una persona. Solo en la barra de parada. Es la única zona saturada de la pantalla.
- `fault` (rojo, como tinta): algo se rompió de verdad. Nunca como losa.
- `act` (= `ink`): la acción primaria. No hay color de marca cromático.
- `focus`: affordance de accesibilidad, no describe estado.
- El riesgo (bajo/medio/alto/crítico) **no lleva color**: se escribe en `--font-display`, y escala por peso y por eje de ancho variable (`wdth`), ver Tipografía.

## Tipografía

Tres caras, todas en `next/font/google`. Las variables se declaran en tokens; la carga de fuentes llega en la Fase 6.

```css
:root {
  --font-display: Archivo, "Helvetica Neue", Arial, sans-serif;
  --font-sans: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  --font-mono:
    "IBM Plex Mono", ui-monospace, "SF Mono", "Cascadia Mono", Consolas,
    monospace;
}
```

- **Archivo** (`--font-display`, eje variable `wdth`): títulos de pantalla, cabecera de sección, y la palabra de riesgo. Requiere `axes: ['wdth']` en `next/font/google`.
- **IBM Plex Sans** (`--font-sans`): cuerpo de interfaz, filas de cola, tablas, formularios, navegación. Cifras tabulares reales.
- **IBM Plex Mono** (`--font-mono`): payloads JSON, IDs, hashes, timestamps, nombres de herramienta, contador de la barra de parada.

## Escala de tipo

Cinco pasos — recortada de ocho.

```css
:root {
  --text-12: 0.75rem; /* metadatos, línea inferior de fila, cabeceras de columna, timestamps */
  --text-13: 0.813rem; /* filas de cola, tablas, controles, payloads */
  --text-15: 0.938rem; /* título de acción en la fila, texto de formulario */
  --text-18: 1.125rem; /* cabecera de sección (Archivo, wdth 100) */
  --text-24: 1.5rem; /* título de pantalla (Archivo, wdth 118, peso 700) */
}
```

Pesos:

```css
:root {
  --weight-regular: 400; /* todo lo que se lee */
  --weight-semibold: 600; /* título de acción, cabecera de columna, label de control */
  --weight-bold: 700; /* título de pantalla, con wdth 118 en Archivo */
}
```

Reglas duras:

- **Dos pesos por superficie, nunca tres.** En la cola: 600 para el título de acción, 400 para el resto. Sin 500 intermedio.
- **Cifras tabulares en todo lo numérico**: importes, duraciones, contadores, IDs.
- **El riesgo se escribe, no se pinta ni se mide.** En `--font-display`, sube por ancho antes que por peso: `bajo` (wdth 100/400) → `medio` (100/600) → `alto` (118/600) → `crítico` (118/700). Un solo canal, sin color, sin barra de severidad segmentada.
- Sin mayúsculas sostenidas ni tracking como micro-label. Cabeceras de columna: 12px Plex Sans 600, caja normal.

## Espaciado

Base de 4px, sin cambios respecto al sistema anterior:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
}
```

## Elevación — "chasis y placas"

Estrategia única: valor de superficie + junta de chasis. Cero desenfoque, cero borde de delimitación.

| Nivel | Token de color | Regla |
|---|---|---|
| Chasis | `--color-paper-chassis` | Fondo de página. Se ve: es el separador. |
| Placa | `--color-paper-plate` | Más clara que el chasis. Paneles, tablas, cola, cabecera. |
| Inset | `--color-paper-inset` | Más oscuro que el chasis. Payload, input, traza. |

```css
:root {
  --chassis-joint: 4px; /* separa placas adyacentes; ninguna placa lleva contorno */
  --shadow-panel: -16px 0 32px -8px oklch(0.24 0.045 265 / 0.08); /* única definición de sombra del producto */
  --color-scrim: oklch(0.24 0.045 265 / 0.35); /* velo de overlays: ink al 35% */
}
```

Reglas:

1. Las capas se separan por la junta de chasis (4px), jamás por un borde. Placas adyacentes comparten junta.
2. `--color-ink-hair` solo existe *dentro* de una placa, para separar filas. Nunca para delimitarla.
3. Sin biseles, brillos ni texturas.
4. **Sombra = solapamiento.** `--shadow-panel` es la única definición de sombra del producto, y la llevan únicamente las superficies que se superponen a otra cosa: la paleta de comandos y el desplegable de notificaciones. Si no solapa, no lleva sombra — por eso el panel de detalle de `/review` no la tiene: es una columna del grid, no una capa encima de la cola.

   > `docs/design/IDENTITY.md` §4 dice que el panel de detalle "es lo único que solapa de verdad". Es un descuido: la paleta de comandos y el desplegable de notificaciones también solapan, y el panel de detalle acabó siendo una columna. La regla que manda es el principio, no el ejemplo.

5. Los overlays con foco modal (paleta de comandos, navegación móvil) atenúan la página con `--color-scrim` en lugar de delimitarse con un contorno.
6. Sin tarjeta dentro de tarjeta.

## Radios

```css
:root {
  --radius-plate: 4px;
  --radius-control: 3px; /* botón, input, select */
  --radius-inset: 3px;
  --radius-tag: 2px; /* tag de estado */
  --radius-stop-bar: 0;
}
```

Sin pill de 999px: los estados son tags cuadrados de 2px, texto en `--font-mono` 12px caja normal + glifo. Radio 0 se reserva a la barra de parada.

## Layout de aplicación

```css
:root {
  --width-sidebar: 240px;
  --width-detail-panel: 420px;
  --width-stop-bar-track: 56px; /* pista de la barra de parada; la losa crece dentro de este ancho */
}
```

- Sidebar izquierda persistente en desktop, ancho fijo (`--width-sidebar`).
- Top bar ligera para búsqueda, entorno y usuario.
- Área principal con ancho fluido. El héroe del dashboard es la cola, no una fila de métricas.
- Panel lateral de detalle con ancho fijo (`--width-detail-panel`), única superposición del producto y por tanto la única sombra.
- En móvil, navegación colapsada y detalle como vista completa.
- Fila de cola: patrón de referencia tipo Dependabot (título 15/600 + línea de metadatos 12/400, tag de estado en línea), no tabla en rejilla. Rejilla de columnas solo en auditoría y agentes.

## Componentes base

### AppShell

Contiene navegación, top bar y área de contenido. Debe sostener todas las pantallas del producto sin cambios estructurales.

### Sidebar

Navegación principal con icono y texto: Dashboard, Revisión, Agentes, Políticas, Auditoría, Ajustes. Estado activo con fondo neutro (`--color-paper-inset` o similar) — sin color de marca, no hay primario cromático.

### PageHeader

Compone título (`--font-display`), descripción breve, acciones principales y filtros de alto nivel.

### DataTable

Tabla para agentes, acciones y auditoría. Cabecera fija cuando tenga sentido, filas separadas por `--color-ink-hair`, hover sutil, estados vacíos, densidad cómoda.

### ActionQueueItem

Fila compacta para una acción pendiente. Muestra título, agente, herramienta, riesgo (como palabra en `--font-display`), política aplicada, tiempo desde creación, estado. Si está en `needs_approval` o `escalated`, lleva la barra de parada al borde izquierdo.

### RiskBadge → palabra de riesgo

Ya no es un badge de color: es texto en `--font-display`, escalando por ancho y peso (ver Escala de tipo). Sin color, sin medidor segmentado.

### StatusPill → StatusTag

Tag cuadrado (`--radius-tag`), texto en `--font-mono` 12px + glifo. Neutro salvo que el estado sea `needs_approval`/`escalated` (ver StopBar) o `failed` (tinta `fault`).

### StopBar — elemento firma

Losa sólida de `--color-hold` sobre `--color-paper-plate`, ancho de pista fijo (`--width-stop-bar-track`), al borde izquierdo de la fila. Crece con el tiempo de parada, medido contra el SLA de la política, no contra el reloj. Tiempo transcurrido alineado a la derecha, `--font-mono` 12px sobre `--color-ink`.

Solo aparece en filas de cola y en la cabecera del panel de detalle. En auditoría aparece descargada, en `--color-ink-hair` — tiempo pasado, sin urgencia. En ningún otro sitio (nunca en agentes, políticas ni ajustes).

Al resolver, no se desvanece: se descarga a cero en `--duration-settle` con `--ease-decide`; la fila colapsa en los últimos `--duration-move`.

### PolicyMatch

Muestra qué política se ha activado y por qué. Legible sin abrir documentación externa.

### Timeline

Secuencia de eventos para auditoría o detalle de acción. Sin color semántico decorativo: neutro salvo evento de fallo (`fault`).

### DetailPanel

Panel lateral de ancho fijo (`--width-detail-panel`) para revisar acciones sin perder contexto de lista. Única superposición del producto: lleva `--shadow-panel`.

### EmptyState

Explica qué falta y ofrece una acción concreta. Ejemplo: "No hay acciones pendientes" con acceso a "Ver auditoría".

## Controles

- Botones con icono cuando la acción sea reconocible. Primario: relleno `--color-act`, texto `--color-paper-plate`.
- Segmented controls para modos o vistas.
- Tabs para secciones dentro de una pantalla.
- Toggles para permisos binarios.
- Selects para filtros cerrados.
- Inputs para búsqueda y valores editables, sobre `--color-paper-inset`.
- Sliders solo si el valor numérico se beneficia de ajuste continuo.

## Motion

```css
:root {
  --duration-instant: 90ms; /* selección de fila, checkbox, foco, navegación por teclado */
  --duration-move: 160ms; /* panel de detalle, subrayado de tab, disclosure, colapso de fila */
  --duration-settle: 320ms; /* solo la descarga de la barra de parada */

  --ease-out: cubic-bezier(0.2, 0, 0, 1); /* todo lo que entra o responde */
  --ease-decide: cubic-bezier(0.32, 0.72, 0, 1); /* solo settle: sin rebote */
}
```

Reglas:

- Nada anima al llegar excepto la barra de parada. Las filas nuevas aparecen sin transición.
- Hover cambia color o fondo, nunca posición.
- Acciones frecuentes por teclado: sin animación decorativa.
- Sin `ease-in-out` en ningún sitio: es la curva de "mírame".
- `prefers-reduced-motion`: `--duration-settle` colapsa a un paso de opacidad, pero la fila sigue saliendo. Nunca se desactiva el cambio de estado, solo su representación.

## Accesibilidad

- Contraste de texto principal mínimo 4.5:1, objetivo 7:1.
- Estados de foco visibles con `--color-focus`.
- Tags de estado con texto, no solo color.
- `hold` y `fault` se distinguen por estructura (losa vs. tinta), no solo por tono — cubre daltonismo.
- Botones con labels claros.
- Tablas con cabeceras semánticas.
- Formularios con label visible.

## Reglas de calidad visual

- Ninguna tarjeta dentro de otra tarjeta.
- Ningún gradiente morado.
- Ningún bloque de métricas decorativas sin acción. El héroe es la cola.
- Ninguna tabla sin estado vacío.
- Ningún texto pequeño como solución a falta de espacio. No hay paso de 11px.
- Ningún modal si un panel o flujo inline resuelve mejor la tarea.
- Ningún color semántico fuera de `hold` y `fault`. "Resuelto" es neutro.
