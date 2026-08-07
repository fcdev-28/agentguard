# Plan de identidad visual — Faro Guard (v4)

**Ubicación en el repo:** `docs/design/PLAN.md`
**Estado del código al escribirlo:** `5d08342 feat: tema oscuro con primario verde lima (#34)`
**Entorno:** macOS, Claude Code nativo, repo en `~/proyectos/agentguard`

**Objetivo:** que la identidad de Guard deje de ser el default estadístico de un LLM, y que cambiarla siga siendo cambiar un archivo.

**Duración realista:** 3-4 sesiones. Una fase por sesión, un commit por fase.

---

## 1. Diagnóstico — verificado sobre el repo, no repetir

### El stack juega a favor

Cero dependencias de diseño. No hay Tailwind, ni librería de componentes, ni de iconos, ni de animación. La capa visual es CSS Modules a mano sobre `src/styles/tokens.css`. Eso significa que **`tokens.css` es de verdad la palanca única**, no una capa decorativa sobre utilidades de terceros. Next 16 + React 19, así que `next/font` está disponible sin fricción.

### El problema es dirección, no arquitectura

`tokens.css` son 99 líneas y 58 tokens en OKLCH, con nombres semánticos, escala base 4 y comentarios que explican el porqué. Está bien construido. Lo que falla es hacia dónde apunta: casi-negro por capas + acento lima saturado + Inter. Ese trío es el clúster estético #2 de diseño generado por IA. **Se conserva la estructura, cambian valores y familias.**

### El hallazgo central: el tiempo no existe

Hay siete familias semánticas —`primary`, `accent`, `success`, `warning`, `danger`, `critical`, `info`— y **ninguna es el tiempo**. El comentario de cabecera del archivo lo dice explícitamente: el primario es marca y acción, el riesgo alto va en `danger`. Todo el presupuesto de color está repartido entre marca y riesgo.

Pero el `schema.prisma` tiene `approvalDueAt` y `approvalSlaMinutes`. Guard es una **cola de aprobación humana** entre agentes de IA y la ejecución de sus herramientas, con SLA y parada de emergencia. No es un dashboard de observabilidad. **El eje visual dominante debe ser el tiempo restante, no el nivel de riesgo** — y ese concepto hoy no tiene ni un token. No está mal asignado: no existe. Ahí está el trabajo de la Fase 4.

### El commit lima, como caso de estudio

Su mensaje razona que al dejar de ser rojo, el primario ya no puede significar peligro, y por eso mueve el riesgo crítico y la parada de emergencia a `danger`. El razonamiento es correcto sobre una premisa invertida: **se eligió el color primero y se recolocó la semántica para que encajara**. Este plan hace lo contrario — primero decides qué interrumpe de verdad, el color viene después. Úsalo como ejemplo al escribir el brief.

Tocó solo 4 archivos (`tokens.css`, `DESIGN_SYSTEM.md`, `risk-badge.module.css`, `emergency-stop-banner.module.css`). Revertir la dirección es barato.

### Deuda de estilo, ya cuantificada

De los ~173 literales de `px` en `.module.css`: ~40 son breakpoints de media query (no tokenizables), ~67 son bordes de 1px (un solo token los cubre), y solo ~40 son deuda real. **Cero colores hardcodeados.** La auditoría está hecha; no hay que volver a ejecutarla.

### Qué falta en tokens

- Token de borde hairline (aparece ~67 veces)
- Tokens de elevación — hoy la separación de capas es solo `--color-border`
- Tokens de anchura para layouts fijos (sidebar, paneles, columnas)
- **Cara monoespaciada.** Solo existe `--font-sans`. Para un producto con trazas y payloads eso es un agujero funcional, no una preferencia estética.
- Pesos por encima de 600. Si la jerarquía debe sostenerse sin color, 400/500/600 se queda corto.

### Qué ya está resuelto

- **Motion.** Tres duraciones (140/190/240ms) y dos curvas. Es exactamente lo que pedía el punto 5 de la Fase 4. Solo hay que validarlo, no inventarlo.
- **Sincronización docs/código.** `DESIGN_SYSTEM.md` se actualizó en el mismo commit que los tokens. No hay deriva que arreglar.

### Documentación: cuál manda

Hay tres documentos de diseño, pero no hay conflicto:

| Archivo | Estado | Uso |
|---|---|---|
| `DESIGN_SYSTEM.md` (284 líneas) | **Vivo**, sincronizado con los tokens | El único que se pasa a las sesiones |
| `DESIGN.md` (72 líneas) | Congelado en el commit fundacional | Ignorar |
| `UX_ARCHITECTURE.md` (278 líneas) | Congelado en el commit fundacional | Ignorar |

Pasar los tres a Claude Code haría que promediara entre versiones de hace meses. **Solo `DESIGN_SYSTEM.md`.**

### Tipografía

IBM Plex (Sans / Sans Condensed / Mono), decidido. Inter prohibida. Aparece en dos sitios: el import de `src/app/layout.tsx` y la definición de `--font-sans` en `tokens.css`.

---

## 2. Entorno — configuración para las sesiones de diseño

`frontend-design@claude-plugins-official` **ya está activo** y es el plugin oficial de Anthropic para UI. Es la base estética, y es la única. No instales `impeccable` ni ninguna otra: dos bases simultáneas se promedian, y ese promedio es precisamente la enfermedad que se está tratando.

**Instalar:**

```bash
cd ~/proyectos/agentguard
npx skills add arvindrk/extract-design-system
```

Verifica el identificador en skills.sh antes de ejecutar — el ecosistema renombra paquetes a menudo. Si falla, es por eso. `extract-design-system` no se solapa con `frontend-design`: extrae un sistema a partir de referencias, y es el motor de la Fase 4.

**Apagar antes de empezar** (en `/plugin`, y reiniciar sesión — los plugins se leen al arrancar):

- **`caveman`** — comprime la salida al mínimo. Las fases 3 y 5 dependen de que el modelo **justifique** cada decisión. Con caveman activo te devuelve conclusiones sin razonamiento, que es justo lo que no puedes evaluar.
- **`superpowers`** — el que más contexto consume, y trae skills de planificación que pueden querer dirigir el proceso en paralelo a este plan. Vas a cargar schema, tokens, design system y cuatro capturas: ese margen lo necesitas entero.

**Dejar como están:** `humanizer` (útil para la prosa del brief), `pr-review-toolkit` (encaja con tu flujo de PRs), `napkin` y `graphify`.

**Confirmar apagados:** `skill-creator`, `claude-md-management`.

Añade a `.gitignore` si no está:

```
.claude/settings.local.json
```

---

## 3. Fases

### Fase 0 — Entorno

Lo de la sección 2: instalar `extract-design-system`, apagar `caveman` y `superpowers`, reiniciar sesión.

Commit: `chore(design): entorno de diseño a nivel de proyecto`

---

### Fase 1 — Capturas de referencia

**Puedes hacerla ya, en paralelo. No necesita Claude Code.** Es trabajo de navegador.

Guarda en `docs/design/refs/`:

| Referencia | Qué buscas | Archivo | Prioridad |
|---|---|---|---|
| incident.io | Urgencia temporal con SLA visible | `incident-io.png` | **Alta** |
| KDS o consola de despacho CAD | Densidad y tiempo bajo presión, fuera del mundo SaaS | `kds.png` | **Alta** |
| Stripe Radar — cola | Contadores que son filtros, no métricas de vanidad | `stripe-cola.png` | Media |
| Stripe Radar — detalle | Dos columnas asimétricas: narrativa ancha, metadatos estrechos | `stripe-detalle.png` | Media |

Las dos de arriba son las que importan: tienen el eje temporal que te falta. Stripe ya lo analizaste y no te resuelve el tiempo.

**Las notas van después del brief** (Fase 3). Capturar ahora, anotar luego.

Commit: `docs(design): capturas de referencia`

---

### Fase 2 — Brief

Sesión de Claude Code. **No escribe código.**

```
Lee prisma/schema.prisma, la estructura de rutas de src/app/ y
docs/DESIGN_SYSTEM.md. Ignora docs/DESIGN.md y docs/UX_ARCHITECTURE.md:
están congelados desde el commit fundacional y describen intenciones
obsoletas.

Produce docs/design/BRIEF.md respondiendo, en este orden:

1. QUÉ ES ESTO. Dos frases, sin lenguaje de marketing. Deriva la respuesta
   del schema, no de lo que suene bien.
2. QUIÉN LO USA Y EN QUÉ ESTADO MENTAL. ¿Mira la pantalla relajado, o con
   algo bloqueado esperando su decisión?
3. EL MOMENTO CRÍTICO. La única pantalla-segundo donde el producto se gana
   o se pierde. Concretamente.
4. QUÉ INTERRUMPE DE VERDAD. Lista de lo que justifica robar la atención.
   Sé restrictivo: si todo interrumpe, nada interrumpe.
5. TRES RESTRICCIONES NEGATIVAS. Cosas que esta interfaz NO debe hacer,
   verificables contra una pantalla real. "No debe ser genérica" no vale.
   "No debe usar color para nada que no sea tiempo agotándose" sí vale.

Contexto que debes tener en cuenta: el commit 5d08342 eligió un primario
verde lima y después recolocó la semántica de riesgo para que encajara.
Ese orden está invertido. Aquí primero se decide qué interrumpe, y el
color viene después.

No escribas CSS. No toques src/.
```

**Criterio de aceptación:** si el punto 3 podría describir cualquier panel de administración, no está terminado.

Commit: `docs(design): brief de producto`

---

### Fase 3 — Notas de referencia

Con el brief delante, vuelve a las capturas. Para cada una, **tres observaciones concretas y aplicables** en `docs/design/refs/NOTAS.md`.

La pregunta que las guía: *¿cómo resuelve esta referencia lo que mi brief dice que interrumpe de verdad?*

No vale "se ve limpio y ordenado". Sí vale: "el estado va pegado al importe en la misma línea, no en una card aparte — identidad y estado son una unidad".

En incident.io y en el KDS, fíjate específicamente en **cómo se representa el tiempo agotándose**: color, posición, tamaño, movimiento. Eso es lo que vas a necesitar y lo que hoy no tienes.

Commit: `docs(design): notas de referencia`

---

### Fase 4 — Identidad

Sesión nueva. **No escribe código.** Aquí es donde vale la pena atascarse.

```
Lee docs/design/BRIEF.md, docs/design/refs/NOTAS.md, docs/DESIGN_SYSTEM.md,
src/styles/tokens.css y las capturas de docs/design/refs/.

Contexto: el sistema actual está bien construido —OKLCH, nombres
semánticos, escala base 4— pero su dirección es el default: casi-negro +
acento lima + Inter + jerarquía por tono. Cambia la dirección, conserva
la calidad de la arquitectura.

Hallazgo que debe guiar todo: hay siete familias semánticas y ninguna es
el tiempo. El schema tiene approvalDueAt y approvalSlaMinutes. El eje
visual dominante debe ser el tiempo restante, no el nivel de riesgo.

Usa la skill extract-design-system. Produce docs/design/IDENTITY.md con:

1. PALETA. Máximo 4 familias semánticas, no 7. Justifica cuál se elimina y
   a dónde se colapsa; empieza por danger vs critical, que hoy no se
   distinguen sin mirar el código. El color se reserva para lo que
   interrumpe de verdad según el brief; el resto de jerarquía va por peso
   y espacio.
2. TIPOGRAFÍA. IBM Plex Sans / Sans Condensed / Mono, con roles asignados
   y fallbacks. Hoy solo existe --font-sans; falta mono para trazas y
   payloads. Justifica cada asignación contra el brief. Inter prohibida.
3. ESCALA DE TIPO. Puedes conservar la actual (--text-12 a --text-30) si
   la justificas, pero revisa los pesos: hoy llegan a 600 y la jerarquía
   tiene que sostenerse sin color.
4. ELEVACIÓN. Estrategia explícita de separación de capas que NO sea solo
   borde de 1px, que es lo único que hay hoy.
5. MOTION. Ya existen tres duraciones (140/190/240ms) y dos curvas.
   Valídalas contra el brief; cámbialas solo si puedes decir por qué.
6. ELEMENTO FIRMA. Una sola cosa por la que se recuerde Guard, derivada
   del momento crítico del brief.

No escribas CSS. No toques src/.

Antes de dármelo, revísalo tú: ¿llegarías a esto con el brief de cualquier
dashboard de observabilidad? Lo que no sobreviva, cámbialo y dime qué
cambiaste y por qué.
```

**Criterio de aceptación:** si el elemento firma es "un gráfico de líneas bonito", no vale. Si es algo que solo tiene sentido en Guard —la traza que se corta físicamente en el punto de bloqueo, la fila que se deforma según se agota el SLA— vas bien.

No pases a la Fase 5 hasta que el documento te convenza **a ti**.

Commit: `docs(design): identidad visual`

---

### Fase 5 — Tokens

Sesión nueva.

```
Lee docs/design/IDENTITY.md.

Reescribe src/styles/tokens.css conservando la arquitectura actual: OKLCH,
nombres semánticos, escala base 4, comentarios que explican el porqué de
cada grupo. Solo cambian valores, familias de color y nombres donde el
vocabulario de Guard lo mejore.

Añade:
- Un token para el borde hairline (aparece ~67 veces en el proyecto)
- Tokens de elevación según la estrategia de IDENTITY.md
- Tokens de anchura para los layouts fijos (sidebar, paneles, columnas)
- Los pesos tipográficos que IDENTITY.md necesite por encima de 600

Deriva cada valor del documento. Si algo no está, pregunta en vez de
inventarlo.

Después, reescribe docs/DESIGN_SYSTEM.md para reflejar la nueva dirección.
El documento actual describe el tema lima y no debe quedar rastro.

No toques ningún .module.css.
```

Commit: `feat(design): nueva dirección de tokens`

---

### Fase 6 — Tipografía

Un solo commit, y aproximadamente el 40% del cambio percibido. Dos sitios:

```bash
grep -rn "Inter\|font-inter" src/ --include="*.tsx" --include="*.css"
```

> Nota: en zsh hay que entrecomillar los patrones `*.tsx`, o los expande el shell antes de llegar a grep.

En `src/app/layout.tsx`, sustituye el import de `Inter` por las tres caras de IBM Plex vía `next/font/google`, con variables `--font-sans`, `--font-display` y `--font-mono`. En `tokens.css`, elimina `--font-inter` y conecta las nuevas.

Detalle que se olvida siempre: la cuenta atrás del SLA necesita `font-variant-numeric: tabular-nums`, o los dígitos bailan al actualizarse.

Commit: `feat(design): tipografía IBM Plex`

**Para aquí y abre la app.** Con tokens nuevos + tipografía nueva ya deberías ver otro producto, sin haber tocado un solo componente.

---

### Fase 7 — Migración y una pantalla

Primero lo mecánico, sin diseñar: los ~40 literales de deuda real → tokens. Los ~67 bordes de 1px → el token hairline. Los breakpoints se quedan como están.

Después, **una sola pantalla**, y que sea el momento crítico del brief (la cola o el detalle de acción). No las hagas todas.

Commits: `refactor(design): literales a tokens` y `feat(design): rediseño de <pantalla>`

---

### Fase 8 — Pulido

Solo ahora tiene sentido añadir motion fino y microinteracciones. Antes de esto, el pulido solo hace más brillante lo genérico.

---

## 3.bis. Estado al cerrar la rama `feature/identidad-visual`

Fases 5 a 8 completadas. Commits, en orden:

| Commit | Fase |
|---|---|
| `feat(design): tokens según identidad visual` | 5 |
| `feat(design): tipografía Archivo e IBM Plex` | 6 |
| `refactor(design): literales a tokens` | 7a.1 |
| `refactor(design): familias semánticas a la identidad nueva` | 7a.2 |
| `feat(design): rediseño de la cola de acciones` | 7b |
| `feat(design): descarga de la barra de parada y pulido de motion` | 8 |
| `fix(data): repartir el llenado del SLA en las acciones pendientes` | 8 |

### Correcciones al diagnóstico de este plan

- **§1 "Deuda de estilo, ya cuantificada" quedó obsoleto.** Se escribió en `5d08342`, antes de que la fase 5 renombrara el vocabulario. La fase 7 no fueron "~40 literales": fueron **466 referencias a tokens inexistentes** en 20 archivos, más 66 de familias cromáticas. Por eso 7 se partió en dos commits.
- **§1 "Cero colores hardcodeados" era falso.** Había cuatro `oklch` literales heredados del tema oscuro (dos velos y dos sombras). Cerrados con `--color-scrim` y `--shadow-panel`.
- **§1 "Motion ya está resuelto" era falso.** Las tres duraciones existían, pero ninguna servía para el elemento firma. `IDENTITY.md` las sustituyó por `instant`/`move`/`settle`.

### Qué queda fuera de esta rama

- **Cinco pantallas sin migrar**: dashboard, agentes, políticas, auditoría y ajustes. Siguen con `RiskBadge` (pill de color) en vez de la palabra en Archivo, y con el patrón de fila antiguo. Es deliberado: la Fase 7 dice "una sola pantalla, no las hagas todas". Rama aparte, una pantalla por commit. → **Cerrado en `feature/identidad-pantallas`, ver §3.ter.**
- **`review-queue.tsx` mide ~270 líneas** (antes 100). La animación de salida necesita retener filas, medir su alto y coordinar timers, y `eslint-plugin-react-hooks@7.1.1` con reglas de React Compiler impide el patrón directo de ajustar estado durante el render. Funciona y está comentado, pero es el archivo más frágil de la rama.
- **`--shadow-panel` lleva el nombre del único panel que no lo usa.** El panel de detalle de `/review` es una columna del grid, no una capa superpuesta, así que por la regla "sombra = solapamiento" no la lleva. Renombrarlo a `--shadow-overlay` sería más honesto.
- **La barra de parada es estática.** Se calcula contra `demoNow`, un reloj fijo en `src/data/demo-data.ts`. No avanza sola: al llegar el tiempo real (fase 10 del roadmap de producto) habrá que decidir si el contador refresca en cliente.

---

## 3.ter. Estado al cerrar la rama `feature/identidad-pantallas`

Las cinco pantallas que la rama anterior dejó fuera, más el panel de detalle de `/review`, que tampoco se había migrado. Commits, en orden:

| Commit | Pantalla |
|---|---|
| `refactor(design): stop-bar y risk-word a data-display` | — |
| `feat(design): rediseño del dashboard` | Panel |
| `refactor(design): tag de estado compartido en data-display` | — |
| `feat(design): rediseño del inventario de agentes` | Agentes |
| `fix(design): alinear las columnas del inventario de agentes` | Agentes |
| `feat(design): el panel resume y muestra los agentes que fallan` | Panel |
| `feat(design): rediseño de políticas` | Políticas |
| `feat(design): rediseño del registro de auditoría` | Auditoría |
| `feat(design): rediseño de ajustes` | Ajustes |
| `refactor(design): jubilar RiskBadge` | Detalle de `/review` |

### Lo que el plan no había visto

- **La deuda de color era declarativa, no visual.** La fase 7a aplanó las paletas pero dejó vivos los mapeos que las declaraban. Políticas tenía ocho clases de estado y efecto que renderizaban dos apariencias; auditoría, dos mapeos de catorce entradas para tres; ajustes, cuatro; el detalle de `/review`, cinco. Migrar cada pantalla fue sobre todo borrar código muerto que parecía vivo.
- **El aviso de "auditoría es la difícil" era falso.** Se dio por hecho que `audit-style.ts` mantenía un semáforo con verde. No lo mantenía: `dotSuccess` y `dotWarning` apuntaban ambos a `--color-ink-faint` desde la fase 7. La pantalla resultó mecánica.
- **Las columnas nunca habían estado alineadas.** En agentes, políticas y ajustes, cada fila era su propio grid con pistas `auto`, así que se calculaban fila a fila. Ya pasaba antes de esta rama, pero `RiskWord` lo hizo evidente: "Crítico" va en `wdth` 118 y "Bajo" en 100. Las columnas suben al contenedor y las filas las heredan con `subgrid`.
- **El panel listaba las 14 acciones pendientes.** Con las filas del rediseño, el doble de altas, el bloque ocupaba dos pantallas y enterraba a los otros cuatro. Ahora corta en cinco.
- **"Agentes activos" escondía los agentes caídos.** El bloque filtraba por `status === "active"`, así que los dos agentes en error no aparecían en el panel. Pasa a listar por atención y a escribir el estado.

### Vocabulario que queda en `data-display`

`RiskWord`, `StopBar`, `StatusTag` y los mapeos `actionStatusVariant` / `showsStatusTag`. Cada dominio conserva solo su propio mapeo a variante (`agent-status.ts`, `policies-style.ts`, `audit-style.ts`, `settings-status.ts`). Regla del color, ya aplicada en las seis pantallas: **ámbar** para lo que espera a una persona, **rojo** para lo que falló, neutro para todo lo demás. Bloquear no lleva color en ningún sitio.

El ámbar no distingue si esa persona está dentro o fuera del producto: `changes_requested` lo lleva igual que `needs_approval`, aunque la acción esté devuelta a quien construyó el agente y no corra ningún SLA. Lo que decide es si sigue parada esperando a alguien.

### Qué sigue fuera

- Las tres deudas de §3.bis siguen abiertas: `review-queue.tsx` sigue midiendo ~270 líneas, `--shadow-panel` sigue mal nombrado y la barra de parada sigue calculándose contra `demoNow`.

---

## 4. Reglas transversales

- **Una fase, una sesión, un commit.** Las sesiones largas degradan el resultado.
- **Las fases 2 y 4 no escriben código.** Si el modelo empieza a tocar `src/`, párale.
- **Solo `DESIGN_SYSTEM.md`** como documentación de entrada. Nunca `DESIGN.md` ni `UX_ARCHITECTURE.md`.
- **Una sola base estética activa.** Hoy es `frontend-design`. Si instalas otra, apaga la primera.
- **Todo vive en el repo**, en `docs/design/`, versionado. Lo que se quedó fuera de git la vez anterior es exactamente lo que se perdió.
