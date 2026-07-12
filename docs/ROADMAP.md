# Roadmap del producto

Roadmap granular hasta un **producto completo y totalmente funcional**: cada paso aborda **una sola tarea concreta** y debería caber en un commit pequeño y una rama enfocada. Las fases 0–9 entregan el **MVP funcional** (sobre datos simulados); las fases 10–13 lo convierten en un **producto completo**: persistencia, autenticación e integraciones reales, listo para producción.

## Fase 0: Base del proyecto

1. Crear el proyecto Next.js con App Router y TypeScript estricto.
2. Configurar el linter (ESLint) y el formateador (Prettier).
3. Añadir los scripts `dev`, `build`, `lint` y `test` al `package.json`.
4. Documentar esos scripts en la sección "Comandos" de `CLAUDE.md`.
5. Crear el árbol de carpetas base `src/` (`app`, `components`, `data`, `domain`, `lib`, `styles`).
6. Crear `src/styles/tokens.css` con los tokens OKLCH de `docs/DESIGN_SYSTEM.md`.
7. Crear `src/styles/globals.css` con reset y estilos base.
8. Cargar la fuente Inter y aplicar la escala tipográfica (12→13→14→16→20→24→30px).
9. Definir los tipos de dominio en `src/domain/` según `docs/DATA_MODEL.md` (una entidad por archivo).
10. Definir el enum de estados de `AgentAction` (`proposed → allowed | blocked | needs_approval → …`).
11. Crear `src/data/demo-data.ts` con una organización semilla.
12. Añadir agentes de demo a los datos semilla.
13. Añadir herramientas (`Tool`) de demo a los datos semilla.
14. Añadir políticas de demo a los datos semilla.
15. Añadir acciones de agente (`AgentAction`) de demo cubriendo todos los estados.

## Fase 1: Shell y navegación

16. Crear el layout raíz (`app/layout.tsx`) con el shell de aplicación.
17. Construir el componente de navegación lateral con las rutas del producto.
18. Marcar el ítem de navegación activo según la ruta actual.
19. Añadir la cabecera del shell (contexto de organización y usuario).
20. Definir el comportamiento responsive del shell (colapso de la navegación en pantallas pequeñas).

## Fase 2: Dashboard

21. Crear la ruta `/` con el layout del dashboard.
22. Añadir la tarjeta/bloque de acciones pendientes.
23. Añadir el bloque de agentes activos.
24. Añadir el bloque de riesgo agregado.
25. Añadir el bloque de políticas activadas recientemente.
26. Añadir el estado vacío del dashboard.
27. Añadir el estado de carga del dashboard.

## Fase 3: Inventario de agentes

28. Crear la ruta `/agents` con la lista de agentes.
29. Renderizar cada agente con identidad, estado y riesgo.
30. Añadir el estado vacío de la lista de agentes.
31. Añadir el estado de carga de la lista de agentes.
32. Crear la ruta `/agents/[agentId]` con el detalle de agente.
33. Mostrar en el detalle las herramientas conectadas del agente.
34. Mostrar en el detalle las acciones recientes del agente.
35. Añadir el estado de error de la ruta `/agents/[agentId]` (agente no encontrado).

## Fase 4: Revisión de acciones

36. Crear la ruta `/review` con la cola de acciones.
37. Renderizar cada fila de la cola con agente, acción, riesgo y estado.
38. Añadir el estado vacío de la cola.
39. Añadir el estado de carga de la cola.
40. Añadir el panel lateral de detalle de acción sobre la cola.
41. Crear la ruta `/review/[actionId]` como URL compartible del detalle.
42. Mostrar en el detalle el contexto y la evidencia de la acción.
43. Mostrar en el detalle la etiqueta de riesgo.
44. Mostrar en el detalle qué política se activó y por qué.
45. Añadir la acción "aprobar" con captura de autor y fecha.
46. Añadir la acción "rechazar" con motivo obligatorio.
47. Añadir la acción "pedir cambios" con motivo.
48. Reflejar en la UI la transición de estado tras cada decisión.
49. Añadir el estado de error de `/review/[actionId]` (acción no encontrada).

## Fase 5: Capa de políticas

50. Crear la ruta `/policies` con la lista de políticas.
51. Añadir el estado vacío de la lista de políticas.
52. Crear la ruta `/policies/[policyId]` con el detalle de política.
53. Editar los permisos por herramienta de una política.
54. Editar las reglas de umbral (p. ej. importe máximo sin aprobación).
55. Editar las reglas de aprobación humana.
56. Implementar la función pura de evaluación de política sobre una acción.
57. Conectar la evaluación simulada para que alimente el resultado mostrado en `/review`.

## Fase 6: Auditoría

58. Crear la ruta `/audit` con el registro de eventos.
59. Renderizar el registro como línea temporal.
60. Añadir el estado vacío del registro de auditoría.
61. Añadir filtro por agente.
62. Añadir filtro por tipo de evento.
63. Añadir filtro por rango de fechas.
64. Añadir la vista de detalle de un evento de auditoría.
65. Dejar preparada la estructura de datos para exportación (sin implementar la exportación).

## Fase 7: Ajustes

66. Crear la ruta `/settings`.
67. Añadir la gestión de usuarios y roles.
68. Añadir la gestión de herramientas conectadas.

## Fase 8: Pulido

69. Revisar el comportamiento responsive de todas las rutas.
70. Pasar una revisión de accesibilidad (foco, contraste, roles ARIA).
71. Revisar el motion: que aclare cambios de estado, no que decore.
72. Verificar que cada pantalla con datos tiene estado de error.
73. Refinar el copy visible en castellano.
74. Sustituir los datos semilla por datos de demo realistas.

## Fase 9: Control y velocidad

Funcionalidades transversales descritas en `docs/FEATURES.md`. Pueden intercalarse con las fases anteriores cuando la pantalla base ya exista.

75. Añadir los campos de parada de emergencia a la organización semilla.
76. Añadir el control de parada de emergencia en el Dashboard, con confirmación previa.
77. Mostrar el banner global mientras la parada de emergencia esté activa.
78. Impedir que las acciones pasen a `executed` mientras la parada esté activa.
79. Registrar en auditoría el activar y el liberar la parada de emergencia.
80. Añadir la acción de pausar/reanudar un agente desde su detalle.
81. Registrar en auditoría la pausa y la reanudación de un agente.
82. Calcular `approvalDueAt` al entrar una acción en `needs_approval`.
83. Mostrar el badge "Vencida" en la cola cuando se supera `approvalDueAt`.
84. Añadir el escalado manual de una acción a un responsable.
85. Añadir la selección múltiple de acciones en la cola.
86. Añadir la barra de acciones en lote (aprobar/rechazar con motivo común).
87. Crear el componente command palette con apertura por `Cmd-K`.
88. Añadir a la paleta la navegación a cada pantalla.
89. Añadir a la paleta la búsqueda de agente, acción y política.
90. Añadir a la paleta las acciones rápidas (aprobar/rechazar la acción abierta, parada de emergencia).
91. Añadir la entidad `Notification` a los datos semilla.
92. Añadir el icono de campana con contador de no leídas en la top bar.
93. Añadir el panel de notificaciones con marcar como leído.
94. Añadir el hilo de comentarios (`ActionComment`) en el detalle de acción.

## Fase 10: Persistencia real

95. Añadir Prisma y el esquema PostgreSQL de todas las entidades.
96. Crear la capa de acceso a datos que reemplaza a `demo-data.ts`.
97. Migrar cada pantalla de los datos simulados a consultas reales.
98. Sembrar la base de datos con datos realistas (script de seed).

## Fase 11: Autenticación y roles

99. Añadir autenticación de usuarios con pantalla de login.
100. Añadir el middleware que protege todas las rutas.
101. Aplicar control por rol (RBAC) sobre `admin` / `reviewer` / `auditor` / `developer`.
102. Añadir el estado de acceso denegado por rol.

## Fase 12: Integraciones reales

103. Definir el contrato de integración para recibir acciones propuestas de un agente.
104. Implementar el endpoint de ingesta de acciones de agentes.
105. Conectar la primera integración real (email), sustituyendo la simulada.
106. Ejecutar las acciones aprobadas contra la herramienta real y registrar el resultado.
107. Añadir el auto-escalado por SLA con un proceso temporal (cierra la funcionalidad 3 de `docs/FEATURES.md`).

## Fase 13: Preparación para producción

108. Implementar la exportación real del registro de auditoría.
109. Añadir notificaciones por email/Slack además de las in-app.
110. Añadir manejo de errores y reintentos en la ejecución de acciones.
111. Configurar CI (lint, test, build) como check obligatorio de cada PR.
112. Añadir observabilidad básica: logs estructurados y métricas.

## Objetivo del MVP

Un usuario puede abrir AgentGuard, ver agentes activos, revisar acciones de riesgo, aprobarlas o rechazarlas, inspeccionar por qué se activó una política y entender el rastro de auditoría. Todo funcional sobre datos simulados.

## Objetivo del producto completo

AgentGuard funciona de extremo a extremo con datos reales: agentes reales envían acciones por API, las políticas se evalúan sobre persistencia real, los usuarios se autentican con su rol, las acciones aprobadas se ejecutan contra herramientas reales y toda la actividad queda auditada y exportable.
