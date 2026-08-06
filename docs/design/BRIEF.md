# Brief — Faro Guard

**Qué es:** Un puesto de control donde una persona ve lo que los agentes de IA de su empresa están a punto de hacer y decide si ocurre.

**Quién lo abre:** El revisor de guardia — alguien de operaciones o seguridad con la pantalla abierta toda su jornada, no un directivo que entra a mirar métricas.

**El único trabajo de la pantalla principal:** Despachar. Vaciar la cola de acciones pendientes; todo lo demás es secundario.

**Registro:** Denso, instrumental, impasible.

**Momento crítico:** Un agente propone algo que la política no puede resolver sola y queda parado en `needs_approval`. Hay una persona esperando al otro lado y un proceso detenido: la acción sube a la cabecera de la cola y se ve de un vistazo qué agente es, qué herramienta toca, qué payload lleva y por qué se paró. Se resuelve en un gesto —aprobar, rechazar, escalar— sin cambiar de pantalla. El coste de dudar se mide en minutos de trabajo bloqueado, así que primero va el riesgo y después el detalle.

**Dirección elegida:** Claro, denso, instrumental. Tipo terminal de trading o panel industrial. Rompe con la expectativa de "dashboard de IA", que va siempre en oscuro. Más riesgo, más distintivo. Quiero que la interfaz sea distinta, que llame la atención.

## Prohibido

Heredado del sistema actual:
- Acento verde lima / ácido saturado sobre fondo casi-negro
- Inter, Geist, y cualquier grotesca neutra por defecto
- Jerarquía codificada por tono: el color se reserva para urgencia temporal y bloqueo; el riesgo se comunica por otro canal
- Separación de capas exclusivamente por borde de 1px
- Métrica grande + label pequeño + stats de apoyo como hero

Clusters generales de diseño IA:
- Crema (~#F4F1EA) + serif de alto contraste + terracota (~#D97757)
- Casi-negro + un único acento verde ácido o bermellón
- Layout tipo periódico: filetes finos, radius 0, columnas densas

Dashboards:
- Gradientes en cards, glassmorphism, iconos decorativos sin función de estado