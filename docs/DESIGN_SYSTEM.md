# Sistema Visual

## Objetivo

Definir la base visual de AgentGuard antes de construir la interfaz. Este documento debe guiar tokens, componentes y patrones para que el producto se sienta serio, rápido y confiable desde el primer sprint.

## Escena de uso

Un equipo de operaciones revisa acciones de agentes a media mañana, en una pantalla de trabajo oscura, con presión controlada y necesidad de decidir sin drama.

## Estrategia visual

Estrategia: restringida, tema oscuro (único modo; `color-scheme: dark`).

La interfaz debe apoyarse en neutros oscuros precisos, jerarquía tipográfica y color semántico. El verde lima de marca se usa con intención: acciones primarias, foco y detalles de identidad. No debe teñir toda la experiencia ni convertir cada pantalla en una alarma.

**Regla semántica dura**: el primario (verde lima) ya no significa peligro ni riesgo. El riesgo alto/crítico y las alarmas (por ejemplo, parada de emergencia) van siempre por `danger` (rojo), nunca por el primario. Son dos canales de color separados a propósito: uno identifica marca y acción, el otro identifica amenaza.

## Paleta base

Todos los colores se expresan en OKLCH. Fuente de verdad: `src/styles/tokens.css`.

```css
:root {
  color-scheme: dark;

  /* Superficies (oscuro, por capas: base casi-negra, paneles algo más claros) */
  --color-bg: oklch(0.17 0.008 255);
  --color-bg-subtle: oklch(0.2 0.008 255);
  --color-surface: oklch(0.235 0.009 255);
  --color-panel: oklch(0.27 0.01 255);

  /* Texto (claro sobre oscuro) */
  --color-ink: oklch(0.96 0.004 255);
  --color-ink-soft: oklch(0.83 0.006 255);
  --color-muted: oklch(0.66 0.008 255);
  --color-faint: oklch(0.52 0.008 255);

  /* Bordes (visibles sobre el fondo oscuro) */
  --color-border: oklch(0.3 0.01 255);
  --color-border-strong: oklch(0.4 0.012 255);

  /* Primario (marca / acción principal / foco): verde lima.
     Es un color claro y saturado, así que el texto encima va oscuro. */
  --color-primary: oklch(0.82 0.19 130);
  --color-primary-hover: oklch(0.76 0.19 130);
  --color-primary-soft: oklch(0.28 0.06 130);
  --color-primary-text: oklch(0.18 0.03 130);

  /* Acento técnico */
  --color-accent: oklch(0.58 0.14 246);
  --color-accent-soft: oklch(0.27 0.05 246);
  --color-accent-text: oklch(0.97 0.01 246);
}
```

## Colores semánticos

Cada color semántico tiene tres variantes: el sólido (para dots e indicadores, brillante sobre el fondo oscuro), `-bg` (tinte oscuro para el fondo de pills) y `-text` (brillante, para el texto que va sobre ese pill oscuro).

```css
:root {
  --color-success: oklch(0.72 0.15 155);
  --color-success-bg: oklch(0.27 0.05 155);
  --color-success-text: oklch(0.85 0.12 155);

  --color-warning: oklch(0.8 0.15 80);
  --color-warning-bg: oklch(0.28 0.05 80);
  --color-warning-text: oklch(0.87 0.13 80);

  --color-danger: oklch(0.65 0.185 25);
  --color-danger-bg: oklch(0.28 0.07 25);
  --color-danger-text: oklch(0.8 0.15 25);

  --color-critical: oklch(0.62 0.16 330);
  --color-critical-bg: oklch(0.27 0.06 330);
  --color-critical-text: oklch(0.82 0.13 330);

  --color-info: oklch(0.68 0.12 245);
  --color-info-bg: oklch(0.27 0.05 245);
  --color-info-text: oklch(0.82 0.1 245);
}
```

## Uso del color

- Primario (verde lima, hue 130): acciones principales, foco activo, selección y detalles de marca. Nunca indica riesgo.
- Rojo (`danger`): riesgo alto, impacto real y alarmas (parada de emergencia). Es el único canal de peligro.
- Azul técnico (`accent`/`info`): información, integración y contexto de sistema.
- Verde (`success`, hue 155): éxito y acciones completadas. Hue distinto al primario para no confundir "marca" con "éxito".
- Ámbar (`warning`): revisión necesaria, advertencias y umbrales.
- Magenta (`critical`): severidad crítica, un escalón por encima de `danger`.
- Neutros: estructura, tablas, navegación y lectura.

## Tipografía

Familia recomendada:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Escala fija:

- `12px`: metadatos, timestamps, etiquetas compactas.
- `13px`: navegación, tablas densas, controles secundarios.
- `14px`: cuerpo principal de interfaz.
- `16px`: texto destacado y formularios.
- `20px`: títulos de sección.
- `24px`: título de pantalla.
- `30px`: título de dashboard o vista principal.

Reglas:

- Peso 400 para lectura.
- Peso 500 para labels y navegación.
- Peso 600 para títulos y acciones relevantes.
- Evitar mayúsculas sostenidas salvo badges muy cortos.
- No usar tipografía display en botones, tablas ni formularios.

## Espaciado

Base de 4px:

- `4px`: separación interna mínima.
- `8px`: grupos compactos, badges, controles.
- `12px`: filas densas y separación de metadatos.
- `16px`: padding estándar de controles y paneles.
- `24px`: bloques de contenido.
- `32px`: separación entre secciones.
- `48px`: separación de vistas amplias.

## Radios y bordes

- Botones: `6px`.
- Inputs: `6px`.
- Badges: `999px`.
- Paneles: `8px`.
- Tablas: `8px` en contenedor externo.

Evitar sombras grandes. La separación debe venir de espaciado, bordes suaves y capas de superficie.

## Layout de aplicación

Estructura inicial:

- Sidebar izquierda persistente en desktop.
- Top bar ligera para búsqueda, entorno y usuario.
- Área principal con ancho fluido.
- Panel lateral para detalle de acción cuando haya suficiente espacio.
- En móvil, navegación colapsada y detalle como vista completa.

## Componentes base

### AppShell

Contiene navegación, top bar y área de contenido. Debe sostener todas las pantallas del producto sin cambios estructurales.

### Sidebar

Navegación principal con icono y texto:

- Dashboard.
- Revisión.
- Agentes.
- Políticas.
- Auditoría.
- Ajustes.

Debe mostrar estado activo con fondo neutro y un detalle en primario (verde lima) mínimo.

### PageHeader

Compone título, descripción breve, acciones principales y filtros de alto nivel.

### DataTable

Tabla para agentes, acciones y auditoría.

Debe incluir:

- Cabecera fija cuando tenga sentido.
- Filas con hover sutil.
- Estados vacíos.
- Ordenación futura prevista.
- Densidad cómoda, no apretada.

### ActionQueueItem

Fila o bloque compacto para una acción pendiente.

Debe mostrar:

- Título.
- Agente.
- Herramienta.
- Riesgo.
- Política aplicada.
- Tiempo desde creación.
- Estado.

### RiskBadge

Badge semántico para riesgo:

- Bajo.
- Medio.
- Alto.
- Crítico.

No debe depender solo del color. Debe incluir texto claro.

### StatusPill

Indica estado de acción, agente, política o herramienta.

### PolicyMatch

Muestra qué política se ha activado y por qué. Debe ser legible sin abrir documentación externa.

### Timeline

Secuencia de eventos para auditoría o detalle de acción.

### DetailPanel

Panel lateral para revisar acciones sin perder contexto de lista.

### EmptyState

Debe explicar qué falta y ofrecer una acción concreta.

Ejemplo: "No hay acciones pendientes" con acceso a "Ver auditoría".

## Controles

- Botones con icono cuando la acción sea reconocible.
- Segmented controls para modos o vistas.
- Tabs para secciones dentro de una pantalla.
- Toggles para permisos binarios.
- Selects para filtros cerrados.
- Inputs para búsqueda y valores editables.
- Sliders solo si el valor numérico se beneficia de ajuste continuo.

## Motion

Tokens:

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --duration-fast: 140ms;
  --duration-base: 190ms;
  --duration-panel: 240ms;
}
```

Reglas:

- Botones: `transform: scale(0.98)` en estado activo.
- Hover: color, borde o fondo, no desplazamientos innecesarios.
- Panel lateral: entrada rápida con transform y opacidad.
- Tooltips y popovers: 150 a 190 ms.
- Acciones de teclado frecuentes: sin animación decorativa.
- Siempre incluir alternativa para `prefers-reduced-motion`.

## Accesibilidad

- Contraste de texto principal mínimo 4.5:1, objetivo 7:1.
- Estados de foco visibles.
- Badges con texto, no solo color.
- Botones con labels claros.
- Tablas con cabeceras semánticas.
- Formularios con label visible.

## Reglas de calidad visual

- Ninguna tarjeta dentro de otra tarjeta.
- Ningún gradiente morado.
- Ningún bloque de métricas decorativas sin acción.
- Ninguna tabla sin estado vacío.
- Ningún texto pequeño como solución a falta de espacio.
- Ningún modal si un panel o flujo inline resuelve mejor la tarea.
