# Flujo Git

## Repositorio

Cuando empiece la implementación, AgentGuard debe vivir en un repositorio privado de GitHub.

Ese repositorio contendrá únicamente código y documentación específica de AgentGuard. Si más adelante iniciamos otro producto, tendrá su propio repositorio y su propia documentación.

Ajustes por defecto del repositorio:

- Visibilidad privada.
- `main` como rama estable.
- Protección de rama para `main`.
- Pull requests obligatorias antes de fusionar.
- Checks obligatorios cuando exista CI.
- Historial lineal preferido.

## Estrategia de ramas

El trabajo debe hacerse en ramas enfocadas:

- `feature/setup-proyecto`
- `feature/sistema-diseno`
- `feature/dashboard-control`
- `feature/revision-acciones`
- `feature/constructor-politicas`
- `bugfix/estado-aprobacion`
- `hotfix/error-produccion`

No se debe commitear trabajo de feature, bugfix u hotfix directamente en `main`.

## Reglas de commits

Los commits deben ser lo bastante pequeños para revisarlos y lo bastante claros para entenderlos después.

Buenos ejemplos:

- `docs: definir flujo de producto`
- `feat: añadir cola de revisión de acciones`
- `fix: corregir estado de aprobación rechazada`
- `style: refinar espaciado del dashboard`
- `test: cubrir evaluación de umbral de política`

## Reglas de pull request

Cada PR debe incluir:

- Qué cambió.
- Por qué cambió.
- Cómo se validó.
- Capturas o grabaciones para cambios de UI.
- Limitaciones conocidas cuando aplique.

## Reglas de merge

Antes de fusionar:

- La rama debe estar actualizada.
- Tests y checks deben pasar.
- Los cambios de UI deben revisarse visualmente.
- No debe haber cambios no relacionados.

## Ritmo de releases

Para el MVP podemos usar releases ligeras:

- Trabajo por hitos en ramas.
- PR hacia `main`.
- Tags para versiones demo relevantes más adelante.

Ejemplos de tags:

- `v0.1-dashboard-demo`
- `v0.2-action-review`
- `v0.3-policy-layer`
