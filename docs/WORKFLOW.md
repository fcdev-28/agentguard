# Flujo de Trabajo del Producto

## Cómo construiremos

Seguiremos un flujo de trabajo realista de producto, no saltaremos directamente a pantallas.

El proyecto **empieza como un MVP funcional y termina como un producto completo y totalmente funcional**. Las fases reflejan esa trayectoria: primero el MVP con datos simulados, después persistencia, autenticación e integraciones reales.

## Fase 1: Definición de producto

Decidir exactamente qué es AgentGuard, a quién sirve y qué problema resuelve primero.

Entregables:

- Resumen de producto.
- Alcance del MVP.
- Roles principales de usuario.
- Flujos clave.
- No objetivos.

## Fase 2: Arquitectura UX

Mapear los flujos reales antes de diseñar la interfaz.

Flujos principales:

- Conectar un agente.
- Definir a qué puede acceder el agente.
- Revisar una acción propuesta.
- Aprobar, rechazar o escalar una acción.
- Investigar comportamiento pasado.
- Ajustar reglas de política después de ver actividad real.

Entregables:

- Arquitectura de información.
- Recorrido de usuario.
- Lista de pantallas.
- Modelo de estados.
- Documento de arquitectura UX.

## Fase 3: Sistema visual

Crear el lenguaje visual del producto antes de construir demasiada interfaz.

Entregables:

- Tokens de color.
- Escala tipográfica.
- Sistema de espaciado.
- Componentes.
- Estados vacíos, de carga, error, aviso y éxito.

## Fase 4: Base técnica

Preparar la aplicación como si fuese a crecer.

Entregables:

- Framework frontend.
- Plan de backend/API.
- Modelo de datos.
- Enfoque de autenticación.
- Datos semilla.
- Estrategia de testing.
- Repositorio privado en GitHub.
- Rama `main` protegida.
- Flujo de pull requests.

## Fase 5: Construcción del MVP

Construir la superficie de producto más pequeña que tenga valor real.

Primeras pantallas:

- Dashboard.
- Detalle de agente.
- Cola de revisión de acciones.
- Constructor de políticas.
- Registro de auditoría.

## Fase 6: Validación

Comprobar si el producto se siente útil y creíble.

Preguntas:

- ¿El usuario entiende el riesgo rápidamente?
- ¿El flujo de aprobación se siente ágil?
- ¿Los registros son claros para investigar?
- ¿La interfaz transmite software operacional serio?

## Fase 7: Iteración

Refinar según el uso.

Mejoras probables:

- Mejores explicaciones de riesgo.
- Integraciones más realistas.
- Permisos basados en roles.
- Reglas de notificación.
- Modo de revisión de incidentes.

## Disciplina Git

Trabajaremos como si fuese un repositorio real de producción:

- `main` se mantiene estable.
- El trabajo de producto se hace en ramas cortas.
- Los cambios pasan por pull requests.
- Los commits son intencionales y acotados.
- Los cambios de riesgo incluyen notas de validación.
- No se fuerza push sobre trabajo compartido salvo razón explícita.
- No se fusionan builds rotas en `main`.
