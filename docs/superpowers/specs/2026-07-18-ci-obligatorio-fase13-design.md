# Diseño — Fase 13 · Tarea 111: CI obligatorio (lint + test + build)

**Fecha:** 2026-07-18
**Fase:** 13 (Preparación para producción)
**Tarea del roadmap:** 111 — «Configurar CI (lint, test, build) como check obligatorio de cada PR.»

## Contexto

La fase 13 son cinco tareas independientes (108 export de auditoría, 109 email/Slack,
110 reintentos de ejecución, 111 CI, 112 observabilidad). Se abordan por separado, una
PR cada una, en orden de dependencia. **111 va primero**: es la más barata y protege
la calidad de todas las PRs siguientes.

Hoy no existe ningún workflow en `.github/workflows/`. Los checks de calidad
(`lint`, `format:check`, `test`, `build`) solo se corren en local, a criterio de quien
programa. No hay red de seguridad en las PRs.

### Hallazgos relevantes del repo

- **Node 24** en local (`v24.18.0`); no hay campo `engines` en `package.json`.
- **Los tests no necesitan base de datos.** Los 4 tests que tocan repositorios
  (`review-actions`, `notification-actions`, `runtime-actions`, `policy-actions`)
  **mockean `@/lib/prisma`** con `vi.mock`. `npm test` pasa sin `DATABASE_URL`
  (251 tests verdes offline).
- **El `build` no conecta a la BD.** No hay `generateStaticParams` ni prerenders que
  consulten Prisma; `src/lib/prisma.ts` solo guarda `process.env.DATABASE_URL` en el
  adapter (`new PrismaPg({ connectionString })`) sin abrir conexión en carga de módulo.
  Aun así el build evalúa módulos, por lo que conviene pasar dummies de env para que
  nada lance por variable ausente.
- **`postinstall` corre `prisma generate`**, así que `npm ci` deja el cliente Prisma
  generado antes de lint/test/build. `src/generated` está en `.prettierignore` y
  `.gitignore`, no ensucia checks.
- **`format:check` en local** solo se queja de `.claude/settings.local.json`, que está
  **gitignored** → no llega al checkout de CI, así que **CI pasará `format:check`**. Se
  añade `.claude` a `.prettierignore` como limpieza para que el run local tampoco falle.
- Variables de entorno del proyecto (`.env.example`): `DATABASE_URL`, `AUTH_SECRET`,
  `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`. Solo las dos primeras podrían leerse en
  carga de módulo durante el build; el resto tienen fallback (sin `RESEND_API_KEY` la
  ejecución cae a `LoggingTransport`).

## Objetivo

Un workflow de GitHub Actions que, en cada PR a `main` y en cada push a `main`, corra
`format:check`, `lint`, `test` y `build`, y falle la PR si cualquiera falla. Rápido
(sin servicio de Postgres, porque no hace falta).

Fuera de alcance (decidido): servicio de Postgres + `prisma migrate` en CI. No hay
tests de integración que lo justifiquen todavía; se añadirá cuando los haya.

## Diseño

### Fichero: `.github/workflows/ci.yml`

**Disparadores:**
- `pull_request` con base `main`
- `push` a `main`

**Un único job `verify`:**
- Runner: `ubuntu-latest`
- Node: 24, vía `actions/setup-node` con `cache: npm`
- Env del job (dummies, para que el build no lance por variable ausente):
  - `DATABASE_URL: postgresql://ci:ci@localhost:5432/ci`
  - `AUTH_SECRET: ci-dummy-secret-para-build-no-usar-en-prod`
  - (RESEND/CRON se omiten a propósito → fallback a logging)

**Pasos, en orden:**
1. `actions/checkout`
2. `actions/setup-node` (node-version 24, cache npm)
3. `npm ci`  → dispara `postinstall` (`prisma generate`)
4. `npm run format:check`
5. `npm run lint`
6. `npm test`
7. `npm run build`

Se ejecutan como pasos separados para que el log señale con precisión cuál falló.
`format:check` va primero por ser el más rápido (fail-fast en estilo).

### Acompañante: `.prettierignore`

Añadir la línea `.claude` para que `format:check` en local ignore
`.claude/settings.local.json` (fichero de settings locales, ya gitignored). No cambia
el comportamiento en CI (donde ese fichero ni existe), pero elimina el falso fallo en
local.

### Fijar la versión de Node (opcional, incluido)

Añadir `"engines": { "node": ">=24" }` a `package.json` para documentar y alinear la
versión que usa CI con la de desarrollo. Cambio de una línea; sin efecto en runtime.

## Hacer el check «obligatorio» (paso manual del repo)

El workflow **provee** el check `verify`; convertirlo en **requisito de merge** es
configuración de GitHub que no se toca desde el código:

> Settings → Branches → Branch protection rule para `main` → *Require status checks to
> pass before merging* → seleccionar `verify`.

Se recuerda al usuario tras el merge de esta PR. (Hasta que exista una ejecución del
workflow, el check no aparece como opción seleccionable en la UI de GitHub; por eso el
orden es: mergear la PR → el workflow corre una vez → activar la protección.)

## Testing / verificación

No hay código de aplicación que testear (es infra de CI). Verificación:

1. **Local, antes de la PR:** correr los cuatro comandos exactamente como el workflow
   (`format:check`, `lint`, `test`, `build`) y confirmar que pasan. Es la misma
   secuencia que ejecutará CI.
2. **En la PR:** confirmar que el job `verify` aparece y termina en verde sobre la
   propia PR que introduce el workflow (GitHub Actions corre el workflow del branch en
   PRs, así que se auto-verifica).
3. **Prueba negativa (opcional):** no se fuerza; basta con confirmar que un fallo real
   (p. ej. un lint error introducido a propósito en local) rompe el paso correspondiente.

## Riesgos y mitigaciones

- **El build lanza por env ausente en CI** → mitigado con los dummies de `DATABASE_URL`
  y `AUTH_SECRET` en el env del job.
- **Deriva de versión de Node** entre CI y local → mitigado fijando Node 24 en el
  workflow y `engines` en `package.json`.
- **`format:check` rojo por churn de Prettier** → verificado: en CI pasa (el único
  fichero conflictivo está gitignored). El acompañante `.prettierignore` limpia el
  local.

## Entregable

Una PR con:
- `.github/workflows/ci.yml` (nuevo)
- `.prettierignore` (+ línea `.claude`)
- `package.json` (+ `engines.node`)
- Actualización del Kanban marcando la tarea 111 de la fase 13.
