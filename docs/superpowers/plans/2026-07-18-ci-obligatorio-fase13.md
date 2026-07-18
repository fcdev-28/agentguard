# CI obligatorio (Fase 13 · Tarea 111) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un workflow de GitHub Actions que corra `format:check`, `lint`, `test` y `build` en cada PR a `main` y en cada push a `main`, fallando la PR si algún check falla.

**Architecture:** Un único fichero de workflow con un job `verify` en `ubuntu-latest`, Node 24, sin servicio de Postgres (los tests mockean Prisma y el build no conecta a la BD). Dos cambios acompañantes menores: `.prettierignore` para silenciar un falso fallo local y `engines.node` en `package.json` para fijar la versión.

**Tech Stack:** GitHub Actions, `actions/checkout`, `actions/setup-node`, npm, Next.js, Prisma (solo `generate`, vía `postinstall`).

## Global Constraints

- **Node 24** — el runner y `engines` deben usar Node 24 (local es `v24.18.0`).
- **Sin servicio de Postgres en CI** — decisión de alcance: los tests mockean `@/lib/prisma`; el build no abre conexión.
- **Env dummy en CI** — `DATABASE_URL` y `AUTH_SECRET` con valores placeholder para que el build no lance por variable ausente; nunca valores reales.
- **Copy visible en castellano, rutas/YAML keys en inglés** (convención del repo).
- **Commits en español tras el tipo convencional** (`feat:`, `docs:`, `chore:`…), terminando con la línea `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Sin commits directos a `main`** — el trabajo va en `feature/ci-obligatorio` (ya creada).

---

### Task 1: Workflow de CI + acompañantes

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `.prettierignore` (añadir línea `.claude`)
- Modify: `package.json` (añadir bloque `engines`)
- Modify: `kanban.html` (marcar tarea 111 de la fase 13 como hecha)

**Interfaces:**
- Produces: un check de estado llamado `verify` en GitHub Actions, que ejecutará la protección de rama de `main` (activación manual posterior, fuera de este plan).
- Consumes: los scripts npm existentes `format:check`, `lint`, `test`, `build` y el `postinstall` (`prisma generate`) — no se modifican.

- [ ] **Step 1: Verificar la secuencia de checks en local (baseline)**

Correr exactamente lo que correrá CI, para confirmar que parte de verde:

```bash
npm run format:check
npm run lint
npm test
npm run build
```

Esperado: `lint`, `test` (251 tests) y `build` en verde. `format:check` puede quejarse **solo** de `.claude/settings.local.json` (gitignored) — se resuelve en el Step 2. Si algo más falla, parar y reportar antes de seguir: el objetivo del plan es que CI refleje un `main` sano, no arreglar deuda preexistente aquí.

- [ ] **Step 2: Añadir `.claude` a `.prettierignore`**

Editar `.prettierignore` para que Prettier ignore la carpeta de settings locales. Contenido final del fichero:

```
.next
node_modules
src/generated
package-lock.json
public
kanban.html
docs
*.md
.claude
```

Verificar:

```bash
npm run format:check
```

Esperado: PASS (ya sin el warning de `.claude/settings.local.json`).

- [ ] **Step 3: Fijar la versión de Node en `package.json`**

Añadir un bloque `engines` justo después de `"private": true,` (o del campo de nivel superior equivalente, antes de `"scripts"`). El bloque exacto a insertar:

```json
  "engines": {
    "node": ">=24"
  },
```

Verificar que el JSON sigue siendo válido:

```bash
node -e "require('./package.json'); console.log('package.json OK')"
```

Esperado: imprime `package.json OK` sin error de parseo.

- [ ] **Step 4: Crear el workflow `.github/workflows/ci.yml`**

Crear el fichero con este contenido exacto:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    env:
      # Dummies: el build evalúa módulos pero no conecta a la BD, y los tests
      # mockean Prisma. Nunca usar valores reales aquí.
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
      AUTH_SECRET: ci-dummy-secret-para-build-no-usar-en-prod
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configurar Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Instalar dependencias
        run: npm ci

      - name: Comprobar formato
        run: npm run format:check

      - name: Lint
        run: npm run lint

      - name: Tests
        run: npm test

      - name: Build
        run: npm run build
```

- [ ] **Step 5: Validar la sintaxis YAML del workflow**

```bash
node -e "const f=require('fs').readFileSync('.github/workflows/ci.yml','utf8'); if(!/jobs:\s/.test(f)||!/verify:/.test(f)) throw new Error('workflow mal formado'); console.log('ci.yml OK')"
```

Esperado: imprime `ci.yml OK`. (No hay parser YAML en dependencias; esta comprobación mínima confirma que las claves esperadas están presentes. La validación real la hará GitHub al recibir el push.)

- [ ] **Step 6: Marcar la tarea 111 en el Kanban**

Localizar en `kanban.html` la tarjeta de la tarea 111 de la fase 13 («Configurar CI…») y marcarla como hecha siguiendo el mismo patrón visual que las tareas ya completadas de fases anteriores (misma clase/atributo que usan las demás tarjetas cerradas — inspeccionar una tarjeta hecha adyacente y replicar).

```bash
grep -n "CI\|111" kanban.html | head
```

Aplicar el cambio replicando el marcado de una tarjeta ya cerrada. Si el Kanban no lista aún la fase 13 / tarea 111, añadir la entrada como hecha con el mismo formato que el resto.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml .prettierignore package.json kanban.html
git commit -m "feat: CI obligatorio con lint, test y build (fase 13, tarea 111)

Workflow de GitHub Actions (job verify) que corre format:check, lint,
test y build en cada PR a main y push a main. Sin servicio de Postgres:
los tests mockean Prisma y el build no conecta a la BD; DATABASE_URL y
AUTH_SECRET van con dummies solo para que el build no lance.

Acompañantes: .claude en .prettierignore (silencia falso fallo local) y
engines.node>=24 en package.json.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 8: Push y verificación en la PR**

```bash
git push -u origin feature/ci-obligatorio
```

Tras abrir la PR (paso de cierre, con confirmación del usuario), confirmar que el check `verify` aparece en la PR y termina en verde. GitHub Actions corre el workflow del propio branch en la PR, así que el workflow se auto-verifica sobre los cambios que lo introducen.

---

## Cierre (fuera de los tasks, requiere al usuario)

1. **Abrir la PR** — mostrar mensaje y confirmar antes de `gh pr create` (sin atribución a Claude Code en el cuerpo de la PR).
2. **Tras el merge:** activar la protección de rama en GitHub — Settings → Branches → regla para `main` → *Require status checks to pass before merging* → seleccionar `verify`. Recordárselo al usuario; no se puede hacer desde el código. El check solo aparece como seleccionable después de que el workflow haya corrido al menos una vez.
3. **Churn de Prettier:** confirmar antes de cerrar que no quedan cambios de formato sin commitear que dejarían `main` fallando `format:check` en el siguiente PR.

## Self-Review

- **Cobertura del spec:** workflow (ci.yml) ✓, `.prettierignore` ✓, `engines.node` ✓, paso manual de branch protection documentado ✓, actualización de Kanban ✓, verificación local + en PR ✓. Sin lagunas.
- **Placeholders:** ninguno — todo el contenido de ficheros es literal (YAML completo, líneas exactas de `.prettierignore` y `engines`). El único punto no-literal es el marcado del Kanban, inherentemente dependiente de su HTML actual; se instruye replicar el patrón de una tarjeta cerrada adyacente.
- **Consistencia de tipos/nombres:** el job y el check se llaman `verify` de forma consistente en el workflow, el spec y el paso de branch protection.
