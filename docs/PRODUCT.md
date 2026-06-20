# Resumen de Producto de AgentGuard

## Frase corta

AgentGuard es una capa de gobierno y operaciones para agentes de IA dentro de empresas.

## Problema

Los agentes de IA pueden leer datos, redactar mensajes, disparar automatizaciones, modificar registros, aprobar flujos de trabajo o interactuar con herramientas externas. Eso crea una brecha de confianza: los equipos quieren la productividad, pero necesitan control antes de permitir que los agentes actúen en producción.

La mayoría de equipos no necesitarán "más IA". Necesitarán responder con claridad:

- ¿Qué hizo el agente?
- ¿Por qué lo hizo?
- ¿Quién lo permitió?
- ¿A qué datos accedió?
- ¿La acción cumplía la política definida?
- ¿Podemos detener, aprobar, repetir o investigar la acción?

## Usuarios objetivo

- Equipos de operaciones que están adoptando automatización con IA.
- Empresas SaaS que integran agentes dentro de su producto.
- Equipos con sensibilidad de cumplimiento en finanzas, legal, salud-adjacent, educación o herramientas internas.
- Fundadores y CTOs que necesitan observabilidad de agentes antes de lanzar flujos autónomos.

## Caso de uso principal

Una empresa conecta uno o varios agentes a AgentGuard. Cada acción propuesta aparece en una línea temporal con riesgo, contexto, acceso a herramientas, resultado de políticas y estado de aprobación.

Ejemplo: un agente quiere enviar un email de devolución, actualizar un registro en el CRM y emitir un reembolso de 480 EUR. AgentGuard permite el borrador del email, permite la actualización del CRM, pero exige aprobación humana para el reembolso porque supera el umbral definido por política.

## Pilares del producto

- Visibilidad: mostrar cada acción del agente con claridad.
- Control: definir permisos, límites y reglas de aprobación.
- Auditoría: conservar evidencia para revisión y cumplimiento.
- Confianza: explicar el riesgo sin saturar al usuario.
- Velocidad: permitir que las acciones seguras avancen sin cuellos de botella manuales.

## Alcance del MVP

La primera versión debe incluir:

- Registro de agentes.
- Permisos por herramienta.
- Línea temporal de acciones.
- Etiquetas de riesgo.
- Cola de aprobación.
- Reglas de política.
- Auditoría básica.
- Integraciones simuladas para email, CRM, facturación y tareas internas.

La primera versión no debe incluir:

- Una interfaz general de chatbot.
- SSO empresarial complejo.
- Decenas de integraciones.
- Automatización completa de cumplimiento.
- Funciones de marketplace.

## Criterio de foco

La documentación principal de AgentGuard debe describir solo AgentGuard. Otras ideas de producto no forman parte de este repositorio ni de este MVP.
