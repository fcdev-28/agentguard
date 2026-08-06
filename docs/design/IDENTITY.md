# Identidad visual — Guard

Documento de dirección. Fija paleta, tipografía, escala, elevación, motion y elemento firma.
No es un fichero de tokens: no contiene CSS y no sustituye a `src/styles/tokens.css` hasta que
se implemente. Sustituye la dirección descrita en `docs/DESIGN_SYSTEM.md` (casi-negro + verde
lima + Inter + jerarquía por tono).

**Sustrato: claro.** El brief lo pide explícitamente y es la decisión de mayor riesgo del
documento. Todo lo demás se deriva de ella.

**Tesis:** Guard es una consola de despacho. El 95% del tiempo la pantalla no tiene nada que
decir. Por eso el color no describe el contenido — solo interrumpe. La jerarquía la sostienen
peso, ancho y espacio.

---

## 1. Paleta

Cuatro familias. Una es acromática y hace casi todo el trabajo.

### 1.1 Tinta y papel (`ink` / `paper`)

Estructura, lectura, tablas, navegación, y **todos los estados resueltos**. Es la familia
por defecto: si algo no interrumpe, es neutro.

| Rol | Valor | Uso |
|---|---|---|
| `paper.chassis` | `oklch(0.930 0.004 265)` | Fondo de página. Se ve: es la junta entre placas. |
| `paper.plate` | `oklch(0.985 0.003 265)` | Paneles, tablas, filas. La superficie de trabajo. |
| `paper.inset` | `oklch(0.895 0.005 265)` | Payloads, inputs, trazas. Más oscuro que el chasis. |
| `ink` | `oklch(0.240 0.045 265)` | Texto principal **y relleno de la acción primaria**. |
| `ink.soft` | `oklch(0.430 0.020 265)` | Metadatos, cabeceras de columna, labels. |
| `ink.faint` | `oklch(0.600 0.012 265)` | Deshabilitado, placeholder, guiones. Nunca contenido. |
| `ink.hair` | `oklch(0.860 0.006 265)` | Única línea del sistema. Separa filas *dentro* de una placa. Nunca delimita una placa. |

`ink` es un negro azulado, no un gris neutro. Importa porque el botón primario es un bloque
sólido de `ink`: tiene que leerse como decisión, no como "se nos olvidó el color de marca".

### 1.2 `hold` — está parado esperando a una persona

El único color saturado de la pantalla. `needs_approval` y `escalated`. Nada más.

| Rol | Valor | Uso |
|---|---|---|
| `hold` | `oklch(0.780 0.170 62)` | Relleno sólido de la barra de parada. Texto encima en `ink`. |
| `hold.deep` | `oklch(0.560 0.150 55)` | Tick de cabeza de la barra; texto `hold` sobre papel cuando no cabe la barra. |

Ámbar es convención. Para el único elemento que un revisor de guardia debe leer sin mirar,
la convención es lo correcto, no lo perezoso. Lo que no es convencional es la forma: **losa
sólida, no pill teñido, y su tamaño es un dato** (§6).

### 1.3 `fault` — se rompió de verdad

`failed`, integración caída, agente sin responder. Se comporta como tinta, no como relleno:
texto, glifo y filete de 2px. Nunca hay una losa roja.

| Rol | Valor | Uso |
|---|---|---|
| `fault` | `oklch(0.450 0.170 25)` | Texto, glifo, filete de 2px al borde izquierdo del bloque. |
| `fault.wash` | `oklch(0.930 0.030 25)` | Única placa teñida del producto: el bloque de error de ejecución. |

`hold` y `fault` no se distinguen solo por tono (62 vs 25 están cerca): se distinguen por
**estructura** — losa saturada vs. tinta oscura. Esto es deliberado y cubre daltonismo.

### 1.4 `act` — la afirmación

| Rol | Valor | Uso |
|---|---|---|
| `act` | `= ink` | Relleno del botón primario, texto en `paper.plate`. |
| `act.press` | `oklch(0.180 0.040 265)` | Estado activo. |

No hay color de marca cromático. La identidad la llevan la cara display, el chasis y la barra
de parada. Un panel de despacho cuyo botón de confirmar es un bloque negro sólido es más
seguro de sí mismo que uno con un morado corporativo.

### 1.5 Fuera de las cuatro familias

`focus` — `oklch(0.620 0.170 255)`, anillo de 2px. No es una familia semántica: es una
affordance de accesibilidad, y por definición tiene que ser distinguible tanto de `hold` como
de `fault`. Se declara aparte a propósito.

### 1.6 Qué se elimina y a dónde va

| Familia actual | Destino | Motivo |
|---|---|---|
| `primary` (verde lima) | → `act` (tinta sólida) | Prohibido por el brief. Además, un acento cromático permanente compite con lo único que debe interrumpir. |
| `success` (verde 155) | → **neutro** | En una consola de despacho "todo bien" es la condición de fondo. Un check verde por fila, en una cola llena, es ruido puro. Lo resuelto pierde el color: es el premio por despacharlo. |
| `info` / `accent` (azul) | → `ink.soft` | Era metadato disfrazado de semántica. Los metadatos son neutros. |
| `warning` (ámbar 80) | → `hold` | Hacía doble trabajo: "riesgo medio" y "atención humana". El riesgo sale del canal de color (§3); lo que queda —atención humana— *es* `hold`. |
| `critical` (magenta 330) | → `fault` | Magenta-por-encima-de-rojo era una escalera de severidad por tono: exactamente la jerarquía por tono que el brief prohíbe. La severidad ahora va por peso y ancho. |
| `danger` (rojo 25) | → `fault` | Renombrado y reasignado. Ya no significa "riesgo alto", significa "se rompió". |

De 7 familias a 4, y de ~21 tokens de color semántico a 8.

---

## 2. Tipografía

Tres caras, todas en `next/font/google`. Inter descartada por brief.

### 2.1 Display — **Archivo** (eje variable `wdth`)

```
Archivo, "Helvetica Neue", Arial, sans-serif
```

Títulos de pantalla, cabecera de sección, y **la palabra de riesgo** (§3).

Por qué: se dibujó a partir de grotescas de rotulación y señalética, no de tipografía de
lectura. En su ancho expandido (`wdth` 110–125) a peso 700 no es neutra: es contundente y
plana, lee como placa de equipo, que es exactamente el "panel industrial" del brief sin
disfrazarse de ello.

El motivo real de la elección es funcional: **el eje de ancho me da un tercer canal de
jerarquía** además de peso y espacio. Como el color está racionado, lo necesito.

En `next/font/google` requiere `axes: ['wdth']`. El fallback pierde el eje — asumido, solo
afecta a títulos.

### 2.2 Texto — **IBM Plex Sans**

```
"IBM Plex Sans", "Segoe UI", system-ui, sans-serif
```

Cuerpo de interfaz, filas de cola, tablas, formularios, navegación.

Por qué: cifras tabulares reales (una consola es columnas de números que tienen que alinearse),
comportamiento sólido a 13px, y hermana monoespaciada del mismo diseño — mono y sans conviven
en la misma fila de tabla y tienen que parecer la misma voz.

**Tensión declarada:** Plex es una grotesca institucional, y el brief prohíbe "cualquier
grotesca neutra por defecto". Mi lectura es que prohíbe las *por defecto* —Inter, Geist,
system-ui, Helvetica— no una cara competente con carácter propio (la `a` de terminal abierto,
las salidas anguladas, la `l` con cola). Aun así es la elección más discutible del documento.
**Si suena demasiado a IBM: Instrument Sans**, mismo perfil de uso, más reciente, menos
gastada; se perdería la coherencia con la mono.

### 2.3 Datos y trazas — **IBM Plex Mono**

```
"IBM Plex Mono", ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace
```

Payloads JSON, IDs, hashes, timestamps, nombres de herramienta, el contador de la barra de
parada.

Por qué: los remates casi de slab y el 0 diferenciado leen como télex/terminal sin caer en la
mono decorativa. Y comparte esqueleto con Plex Sans: en `agente · herramienta · id` los tres
fragmentos cambian de voz sin cambiar de familia.

Pesos declarados explícitamente (Plex no siempre resuelve como variable en `next/font`).

---

## 3. Escala de tipo

**No conservo la actual.** Se recorta de 8 pasos a 5.

| px | rem | Cara | Uso |
|---|---|---|---|
| 12 | 0.750 | Plex Sans | Metadatos, línea inferior de fila, cabeceras de columna, timestamps. |
| 13 | 0.813 | Plex Sans / Mono | Caballo de batalla: filas de cola, tablas, controles, payloads. |
| 15 | 0.938 | Plex Sans | Título de acción en la fila, texto de formulario. |
| 18 | 1.125 | Archivo (`wdth` 100) | Cabecera de sección. |
| 24 | 1.500 | Archivo (`wdth` 118, 700) | Título de pantalla. |

Qué se cae y por qué:

- **36 y 30** — existían para la métrica hero. El brief prohíbe el hero de métrica grande; el
  héroe del dashboard es la cola. Sin ese patrón no hay nada que justifique 30px en una
  consola de despacho.
- **20** — quedaba a un paso de 24 y de 18. Redundante.
- **16 → 15** — a 16px el título de fila no cabe cómodo en una fila de 32px junto a metadatos
  de 12. 15/12 con salto de peso y de ancho separa mejor y comprime más cola en pantalla.
- **No hay 11px.** El micro-label mono en mayúsculas y tracking es el tic genérico de toda
  tabla de datos, y es un problema de accesibilidad. Las cabeceras de columna son 12px Plex
  Sans 600 en `ink.soft`, en caja normal.

### Pesos — aquí es donde vive la jerarquía

| Peso | Cara | Uso |
|---|---|---|
| 400 | Plex Sans / Mono | Todo lo que se lee. |
| 600 | Plex Sans | Título de acción, cabecera de columna, label de control. |
| 700 + `wdth` 118 | Archivo | Título de pantalla. |

Reglas duras:

- **Dos pesos por superficie, nunca tres.** En la cola: 600 para el título de acción, 400 para
  todo lo demás. Sin 500 intermedio — a 13px la diferencia 400/500 desaparece y produce papilla;
  400/600 es un escalón real.
- **Cifras tabulares en todo lo numérico.** Importes, duraciones, contadores, IDs. Una columna
  que no alinea no es un instrumento.
- **El riesgo se escribe, no se pinta ni se mide.** Va en Archivo, y sube por **ancho** antes
  que por peso: `bajo` en `wdth` 100/400 → `medio` 100/600 → `alto` 118/600 → `crítico`
  118/700. Un canal, sin color, sin barra de severidad segmentada (esa barra competiría con el
  elemento firma y lo mataría), y le da una función real a la cara display.

---

## 4. Elevación — "chasis y placas"

Estrategia única: **valor de superficie + junta de chasis. Cero desenfoque, cero borde de
delimitación.**

Exactamente tres niveles, nunca más:

| Nivel | Superficie | Regla |
|---|---|---|
| Chasis | `paper.chassis` | El fondo de página. **Se ve.** Es el separador. |
| Placa | `paper.plate` | Más clara que el chasis. Paneles, tablas, cola, cabecera. |
| Inset | `paper.inset` | Más oscuro que el chasis. Payload, input, traza. Ventana a la máquina. |

Reglas:

1. **Las capas se separan por una junta de chasis de 4px, jamás por un borde.** Placas
   adyacentes comparten junta. Ninguna placa lleva contorno.
2. `ink.hair` solo existe *dentro* de una placa, para separar filas. Nunca para delimitarla.
3. Nada de biseles, brillos ni texturas. El "panel industrial" sale del ritmo de juntas, no de
   simular chapa.
4. **Una sola sombra en todo el producto:** el panel de detalle que se superpone a la cola.
   `-16px 0 32px -8px` sobre `ink` al 8%. Existe porque es lo único que solapa de verdad a otra
   cosa. Sombra = solapamiento. Si no solapa, no lleva sombra.
5. Sin tarjeta dentro de tarjeta (se mantiene la regla del sistema actual, y con tres niveles
   fijos es estructuralmente imposible).

### Radios

| Elemento | Radio |
|---|---|
| Placa | 4px |
| Control (botón, input, select) | 3px |
| Inset | 3px |
| Tag de estado | 2px |
| Barra de parada | 0 |

**Se elimina el pill de 999px.** Un pill totalmente redondeado es lenguaje de tarjeta de
producto, no de panel de control. Los estados pasan a ser tags cuadrados de 2px, texto en Plex
Mono 12px caja normal + glifo. Radio 0 se reserva a la barra de parada — es el único elemento
que quiere leerse como objeto físico, y el brief prohíbe el radio 0 sistemático (cluster
"periódico"), no un uso puntual y con motivo.

---

## 5. Motion

### Duraciones

| Token | ms | Para qué |
|---|---|---|
| `instant` | 90 | Lo que el revisor hace 200 veces por hora: selección de fila, checkbox, foco, navegación por teclado. Suficientemente rápido para que la UI no opine. |
| `move` | 160 | Algo se desplaza: panel de detalle, subrayado de tab, disclosure, colapso de fila. |
| `settle` | 320 | **Solo la descarga de la barra de parada** (§6). Es larga a propósito: es el acuse de recibo. |

### Curvas

| Token | Valor | Para qué |
|---|---|---|
| `out` | `cubic-bezier(0.2, 0, 0, 1)` | Todo lo que entra o responde. Frontal duro, cola larga. |
| `decide` | `cubic-bezier(0.32, 0.72, 0, 1)` | Solo `settle`. Sin rebote; deceleración larga para que la salida siga siendo legible cuando se despachan diez seguidas. |

Sin `ease-in-out` en ningún sitio: es la curva de "mírame".

### Reglas

- **Nada anima al llegar excepto la barra de parada.** Las filas nuevas aparecen sin
  transición. Animar la entrada en una cola que se está llenando estorba a quien escanea.
- Hover cambia color o fondo, nunca posición.
- Acciones frecuentes por teclado: sin animación decorativa.
- `prefers-reduced-motion`: `settle` colapsa a un paso de opacidad, pero **la fila sigue
  saliendo**. Nunca se desactiva el cambio de estado, solo su representación.

---

## 6. Elemento firma — **la barra de parada**

Guard se recuerda por una cosa: **el tiempo que una acción lleva parada es un objeto físico en
pantalla, no un metadato en gris.**

Del brief: *"Hay una persona esperando al otro lado y un proceso detenido […] el coste de dudar
se mide en minutos de trabajo bloqueado."* Esa frase es el producto. La barra la hace visible.

### Qué es

Toda acción en `needs_approval` lleva, a sangre en el borde izquierdo de su fila, una **losa
sólida de `hold`** sobre una pista de ancho fijo (56px). La losa crece con el tiempo de parada.
Dentro, alineado a la derecha y en Plex Mono 12px sobre `ink`, el tiempo transcurrido.

Es la única zona saturada de la pantalla.

### Por qué funciona

- **Se llena contra el SLA de la política, no contra el reloj.** Una acción con umbral de 5
  minutos se llena doce veces más rápido que una de 60. La barra es *comparable entre acciones*
  — es un instrumento, no una decoración.
- Es simultáneamente clave de ordenación, indicador de estado y canal de urgencia — que es como
  la urgencia sale del canal de color sin perderse.
- Se lee en visión periférica. Una pantalla con tres losas largas en el margen izquierdo es
  peor que una con tres cortas, sin leer una palabra.
- **Al resolver, no se desvanece: se descarga.** Drena a cero de izquierda a derecha en 320ms
  con `decide`; la fila colapsa en los últimos 160ms. Ningún otro elemento de Guard usa ese
  movimiento. Es el premio por despachar, y es lo que hace que vaciar la cola se sienta como
  algo.

### Dónde aparece

Filas de cola, y cabecera del panel de detalle (versión a ancho completo). **En ningún otro
sitio.** En auditoría aparece descargada y en `ink.hair` — tiempo pasado, sin urgencia. Nunca
en agentes, políticas ni ajustes.

---

## 7. Consecuencias de layout

No es el alcance de este documento, pero la identidad fuerza tres cosas:

- El héroe del dashboard es **la cola**, no una fila de métricas. El brief prohíbe el patrón
  métrica-grande + label + stats de apoyo, y sin color semántico decorativo esas tarjetas no
  tendrían nada que enseñar.
- La fila de cola sigue el patrón de la referencia de Dependabot, no el de tabla en rejilla:
  título en 15/600 + línea de metadatos en 12/400, tag de estado en línea. Rejilla de columnas
  solo en auditoría y agentes, donde sí se compara valor contra valor.
- El panel de detalle es la única superposición del producto y por tanto la única sombra.

---

## 8. Revisión: qué cambié y por qué

Criterio aplicado al borrador: *¿llegaría a esto partiendo del brief de cualquier dashboard de
observabilidad?* Lo que sí, se cambió.

| Borrador | Cambio | Motivo |
|---|---|---|
| 4ª familia `live` (teal) para "ejecutándose ahora" | **Eliminada.** El estado en curso va en mono + un filete de 1px en tinta. El 4º hueco lo ocupa `act`. | Todo producto de observabilidad tiene un color de "running". Y violaba mi propia regla: un agente ejecutando no interrumpe a nadie. |
| Riesgo como medidor segmentado de 4 tramos | **Eliminado.** El riesgo pasa a palabra en Archivo, escalando por eje de ancho. | La barra de severidad es mobiliario estándar de observabilidad, y una segunda barra por fila mata el elemento firma. Además así la cara display hace un trabajo real en vez de decorar. |
| Elevación por bisel de 2px (línea oscura + brillo superior) | **Eliminado.** Valor de superficie + junta de chasis, cero desenfoque. | Era "panel industrial" como disfraz: se llega a él desde la palabra clave, no desde el trabajo. Y envejece a 2005. |
| Micro-label mono 11px en mayúsculas con tracking | **Eliminado**, escala recortada a 5 pasos. Cabeceras de columna en 12/600 caja normal. | Es el tic genérico de toda tabla de datos y un problema de accesibilidad. |
| `settle` como salida de fila con florituras | **Reasignado.** Los 320ms pertenecen solo a la descarga de la barra; la fila colapsa dentro de los últimos 160ms. | Las animaciones de salida las tiene cualquiera. Lo específico es la descarga, y solo se sostiene si no compite con nada. |
| Color de marca cromático para el botón primario | **Eliminado.** El primario es tinta sólida. | Un acento permanente compite con lo único que debe interrumpir, y cualquier indigo/violeta habría sido la elección por defecto (ver referencia de Stripe). |

Lo que sobrevivió con la tensión declarada, no oculta:

- **IBM Plex Sans** es una elección que sí podría salir de un brief de infraestructura
  cualquiera. Se queda porque las cifras tabulares y la hermana mono son estructurales aquí, no
  estéticas. Alternativa si suena demasiado a IBM: Instrument Sans.
- **Ámbar para `hold`** es convención pura. Se queda porque para el único elemento que debe
  leerse pre-atentivamente la convención es correcta. Lo que no es convencional es que sea una
  losa sólida dimensionada por tiempo, y que sea lo único saturado en pantalla.
