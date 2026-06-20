# Arquitectura UX

## Objetivo

Definir cómo se organiza AgentGuard para que un equipo pueda controlar agentes de IA sin perder velocidad operacional.

La interfaz debe responder rápido a cuatro preguntas:

- Qué está pasando.
- Qué requiere atención humana.
- Por qué se ha aplicado una política.
- Qué ocurrió después de cada decisión.

## Roles principales

### Administrador

Configura la organización, gestiona usuarios, conecta agentes y define permisos generales.

Necesita:

- Ver estado global.
- Crear y editar políticas.
- Gestionar herramientas conectadas.
- Revisar actividad sensible.

### Revisor

Persona responsable de aprobar, rechazar o escalar acciones propuestas por agentes.

Necesita:

- Entender riesgo y contexto en segundos.
- Tomar decisiones con evidencia suficiente.
- Ver qué política se ha activado.
- Dejar una razón clara cuando rechaza o escala.

### Auditor

Consulta actividad histórica, decisiones, evidencias y cambios de configuración.

Necesita:

- Buscar eventos.
- Filtrar por agente, usuario, herramienta, riesgo o estado.
- Reconstruir una secuencia de acciones.
- Exportar o preparar información para revisión.

### Desarrollador

Integra agentes, herramientas y eventos con AgentGuard.

Necesita:

- Ver claves o endpoints.
- Probar eventos simulados.
- Entender errores de integración.
- Consultar payloads técnicos.

## Entidades UX

- Agente: sistema de IA que propone o ejecuta acciones.
- Acción: intención concreta del agente sobre una herramienta o dato.
- Herramienta: integración disponible para el agente.
- Política: regla que permite, bloquea o exige aprobación.
- Aprobación: decisión humana sobre una acción.
- Evento de auditoría: registro de algo ocurrido en el sistema.
- Riesgo: lectura resumida del impacto potencial de una acción.

## Arquitectura de información

Navegación principal del MVP:

- Dashboard.
- Revisión.
- Agentes.
- Políticas.
- Auditoría.
- Ajustes.

Jerarquía recomendada:

- Dashboard: estado operativo y prioridades.
- Revisión: cola de acciones que necesitan decisión.
- Agentes: configuración y actividad por agente.
- Políticas: reglas de control y aprobación.
- Auditoría: historial completo e investigación.
- Ajustes: organización, usuarios e integraciones básicas.

## Flujos clave

### Revisar una acción

1. El usuario entra en Revisión.
2. Selecciona una acción pendiente.
3. Ve resumen, agente, herramienta, riesgo, política aplicada y evidencia.
4. Decide aprobar, rechazar, pedir cambios o escalar.
5. AgentGuard registra decisión, usuario, hora y motivo.
6. La acción cambia de estado y queda trazada en auditoría.

### Conectar un agente

1. El administrador crea un agente.
2. Define nombre, propietario y entorno.
3. Asigna herramientas permitidas.
4. Aplica una política base.
5. Ejecuta un evento simulado.
6. El agente queda activo o en modo observación.

### Ajustar una política

1. El administrador abre Políticas.
2. Revisa reglas activas y su impacto reciente.
3. Edita umbrales, herramientas o condiciones.
4. Previsualiza qué acciones se habrían visto afectadas.
5. Publica la nueva versión.
6. El cambio queda registrado en auditoría.

### Investigar actividad

1. El auditor entra en Auditoría.
2. Filtra por agente, herramienta, fecha, riesgo o estado.
3. Abre un evento.
4. Revisa acción, política, decisión y actor humano.
5. Reconstruye la secuencia relacionada.
6. Exporta o marca el caso como revisado.

## Estados de acción

| Estado | Significado | Acción principal |
| --- | --- | --- |
| `proposed` | El agente propone una acción | Evaluar política |
| `allowed` | La acción cumple política | Ejecutar o registrar |
| `blocked` | La política impide la acción | Revisar bloqueo |
| `needs_approval` | Requiere decisión humana | Aprobar o rechazar |
| `approved` | Un humano la aprobó | Ejecutar |
| `rejected` | Un humano la rechazó | Registrar motivo |
| `changes_requested` | Un humano pidió cambios | Devolver al agente |
| `escalated` | Requiere revisión superior | Asignar responsable |
| `executed` | La acción se completó | Auditar |
| `failed` | La ejecución falló | Revisar error |

## Niveles de riesgo

| Nivel | Uso | Ejemplo |
| --- | --- | --- |
| Bajo | Acción reversible o informativa | Crear borrador de email |
| Medio | Cambia datos internos sin impacto económico directo | Actualizar CRM |
| Alto | Puede afectar dinero, permisos, clientes o cumplimiento | Emitir reembolso |
| Crítico | Impacto amplio o irreversible | Cambiar permisos masivos |

## Pantallas del MVP

### Dashboard

Resumen operativo del sistema.

Debe mostrar:

- Acciones pendientes.
- Riesgo agregado.
- Agentes activos.
- Políticas activadas recientemente.
- Incidentes o bloqueos relevantes.

### Revisión

Cola principal de trabajo para decisiones humanas.

Debe mostrar:

- Lista priorizada de acciones.
- Filtros por riesgo, agente, herramienta y estado.
- Detalle de acción.
- Botones de aprobar, rechazar y escalar.
- Motivo requerido para rechazo o escalado.

### Agentes

Inventario y configuración de agentes.

Debe mostrar:

- Lista de agentes.
- Estado operativo.
- Propietario.
- Herramientas permitidas.
- Actividad reciente.
- Enlace a detalle.

### Detalle de agente

Vista centrada en un agente concreto.

Debe mostrar:

- Identidad y propietario.
- Permisos.
- Políticas aplicadas.
- Acciones recientes.
- Errores de integración.
- Modo activo u observación.

### Políticas

Gestión de reglas.

Debe mostrar:

- Políticas activas.
- Condiciones principales.
- Impacto reciente.
- Estado publicado o borrador.
- Entrada al editor de política.

### Auditoría

Historial completo de eventos.

Debe mostrar:

- Búsqueda.
- Filtros.
- Línea temporal.
- Detalle de evento.
- Actor, fecha, política y resultado.

### Ajustes

Configuración mínima de organización.

Debe mostrar:

- Usuarios.
- Roles.
- Herramientas simuladas.
- Entorno de demo.

## Estados de interfaz necesarios

Cada pantalla importante debe contemplar:

- Estado vacío con siguiente acción clara.
- Estado de carga sin saltos visuales.
- Estado de error con recuperación posible.
- Estado filtrado sin resultados.
- Estado sin permisos.
- Estado de datos simulados.

## Criterios de aceptación UX

El MVP será aceptable si:

- Un revisor puede decidir sobre una acción en menos de un minuto.
- El motivo de una política se entiende sin abrir documentación externa.
- Una acción aprobada o rechazada queda trazada en auditoría.
- Un administrador puede identificar qué agentes tienen más riesgo.
- La interfaz evita sensación de chatbot y se siente como software de control.

## Fuera del MVP

Quedan fuera por ahora:

- Chat con agentes.
- Editor visual complejo de reglas.
- Integraciones reales con terceros.
- Gestión avanzada de equipos.
- Reportes ejecutivos extensos.
- Automatización completa de cumplimiento.
