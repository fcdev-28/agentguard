# Despliegue a producción

Checklist para desplegar AgentGuard. Ningún secreto vive en el repo: los
valores reales se generan por entorno y se ponen en el panel del hosting
(nunca en git). Este documento solo lista **qué** hace falta y **cómo**
obtenerlo.

## 1. Variables de entorno

Se configuran en el panel del hosting (Vercel: Settings → Environment
Variables, scope Production). La plantilla completa está en `.env.example`.

| Variable | Obligatoria | Cómo obtenerla |
|---|---|---|
| `DATABASE_URL` | Sí | Connection string **pooled** de Postgres (ver §2). |
| `DIRECT_URL` | Sí (si usas pooled) | Connection string **directa**, solo para migraciones (ver §2). |
| `AUTH_SECRET` | Sí | `openssl rand -base64 48`. La app no arranca si falta o mide <32 chars. |
| `CRON_SECRET` | Sí (si usas crons) | `openssl rand -base64 48`. Protege los endpoints de cron (§3). |
| `RESEND_API_KEY` | Para email real | Panel de Resend. Sin ella, el runner cae a logging (no envía). |
| `EMAIL_FROM` | Para email real | Remitente verificado en Resend. |
| `SLACK_WEBHOOK_URL` | Opcional | Incoming webhook de Slack. Sin ella, el canal Slack se salta sin error. |
| `LOG_LEVEL` | No | `debug \| info \| warn \| error`. Default `info`. |

Genera los secretos (uno distinto por entorno):

```bash
openssl rand -base64 48   # AUTH_SECRET
openssl rand -base64 48   # CRON_SECRET
```

Regla: los secretos de producción son **distintos** de los de local. Guárdalos
en un gestor de contraseñas, no en git ni en chat.

## 2. Prisma: URL pooled + directa

Con un Postgres serverless (Neon, Supabase, Prisma Postgres) el runtime usa una
conexión **pooled** (pgBouncer) y las migraciones una conexión **directa**.

1. Añade `directUrl` al `datasource` en `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")   // pooled (runtime)
     directUrl = env("DIRECT_URL")     // directa (migraciones)
   }
   ```

2. En producción:
   - `DATABASE_URL` → la cadena **pooled** del proveedor.
   - `DIRECT_URL` → la cadena **directa** del proveedor.

3. Aplica migraciones contra la BD de producción:

   ```bash
   npx prisma migrate deploy
   ```

> Nota para local: si añades `directUrl`, Prisma exige la variable `DIRECT_URL`
> también en `.env`. En local (Postgres no pooled) puede ser idéntica a
> `DATABASE_URL`.

## 3. Schedulers de cron

Dos endpoints que un scheduler externo invoca con
`Authorization: Bearer $CRON_SECRET`. Cada minuto es un intervalo razonable.

| Endpoint | Qué hace | Fase |
|---|---|---|
| `POST /api/cron/escalate` | Auto-escalado de acciones por SLA vencido. | 12 |
| `POST /api/cron/retry-executions` | Reintentos de ejecuciones fallidas con backoff. | 13 |

Invocación manual (verificación):

```bash
curl -X POST https://TU-DOMINIO/api/cron/escalate \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST https://TU-DOMINIO/api/cron/retry-executions \
  -H "Authorization: Bearer $CRON_SECRET"
```

Con **Vercel Cron** (`vercel.json` en la raíz):

```json
{
  "crons": [
    { "path": "/api/cron/escalate", "schedule": "* * * * *" },
    { "path": "/api/cron/retry-executions", "schedule": "* * * * *" }
  ]
}
```

> Vercel Cron manda su propio header de autenticación, no un `Bearer` con tu
> `CRON_SECRET`. Si mantienes el gate por `CRON_SECRET`, usa un scheduler
> externo que sí pueda enviar `Authorization: Bearer` (GitHub Actions,
> cron-job.org), o adapta la comprobación del endpoint al header de Vercel.

## 4. Orden de despliegue

1. Provisiona la BD de producción y obtén las URLs pooled + directa.
2. Configura todas las variables de entorno en el hosting.
3. Añade `directUrl` al schema (§2) y despliega la app.
4. `npx prisma migrate deploy` contra producción.
5. Configura los dos schedulers de cron (§3) y verifícalos con `curl`.
6. (Opcional) Define `SLACK_WEBHOOK_URL` si quieres el canal Slack.
