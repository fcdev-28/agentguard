# Sistema Visual

## Objetivo

Definir la base visual de AgentGuard antes de construir la interfaz. Este documento debe guiar tokens, componentes y patrones para que el producto se sienta serio, rápido y confiable desde el primer sprint.

## Escena de uso

Un equipo de operaciones revisa acciones de agentes a media mañana, en una pantalla de trabajo luminosa, con presión controlada y necesidad de decidir sin drama.

## Estrategia visual

Estrategia: restringida.

La interfaz debe apoyarse en neutros precisos, jerarquía tipográfica y color semántico. El rojo de marca se usa con intención: acciones primarias, foco, riesgo alto y detalles de identidad. No debe teñir toda la experiencia ni convertir cada pantalla en una alarma.

## Paleta base

Todos los colores se expresan en OKLCH.

```css
:root {
  --color-bg: oklch(1.000 0.000 0);
  --color-bg-subtle: oklch(0.985 0.000 0);
  --color-surface: oklch(0.972 0.000 0);
  --color-panel: oklch(0.955 0.004 255);

  --color-ink: oklch(0.160 0.006 255);
  --color-ink-soft: oklch(0.300 0.008 255);
  --color-muted: oklch(0.470 0.010 255);
  --color-faint: oklch(0.650 0.008 255);

  --color-border: oklch(0.900 0.006 255);
  --color-border-strong: oklch(0.820 0.008 255);

  --color-primary: oklch(0.580 0.170 8);
  --color-primary-hover: oklch(0.530 0.170 8);
  --color-primary-soft: oklch(0.955 0.030 8);
  --color-primary-text: oklch(1.000 0.000 0);

  --color-accent: oklch(0.360 0.080 246);
  --color-accent-soft: oklch(0.940 0.020 246);
  --color-accent-text: oklch(1.000 0.000 0);
}
```

## Colores semánticos

```css
:root {
  --color-success: oklch(0.500 0.120 155);
  --color-success-bg: oklch(0.960 0.035 155);
  --color-success-text: oklch(0.330 0.090 155);

  --color-warning: oklch(0.700 0.135 80);
  --color-warning-bg: oklch(0.965 0.045 80);
  --color-warning-text: oklch(0.390 0.085 75);

  --color-danger: oklch(0.540 0.170 25);
  --color-danger-bg: oklch(0.955 0.040 25);
  --color-danger-text: oklch(0.370 0.130 25);

  --color-critical: oklch(0.320 0.120 330);
  --color-critical-bg: oklch(0.940 0.030 330);
  --color-critical-text: oklch(0.300 0.115 330);

  --color-info: oklch(0.520 0.110 245);
  --color-info-bg: oklch(0.955 0.030 245);
  --color-info-text: oklch(0.340 0.090 245);
}
```

## Uso del color

- Primario: acciones principales, foco activo y detalles mínimos de marca.
- Rojo de riesgo: solo cuando exista impacto real.
- Azul técnico: información, integración y contexto de sistema.
- Verde: éxito y acciones completadas.
- Ámbar: revisión necesaria, advertencias y umbrales.
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

Debe mostrar estado activo con fondo neutro y un detalle rojo mínimo.

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
