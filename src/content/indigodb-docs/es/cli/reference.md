---
title: Referencia CLI (indigodb)
navTitle: Referencia CLI
description: Referencia completa de comandos, subcomandos, flags y variables de entorno para @indigodb/cli (v0.1.1).
section: studio
order: 2
runtime: "Node.js >= 22"
npmPackages:
  - "@indigodb/cli"
---

El binario `indigodb` se distribuye mediante [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) (`npm install -D @indigodb/cli` o `npx indigodb <comando>`). Cada comando carga automáticamente `.env` del directorio actual sin sobrescribir variables ya presentes en el entorno.

## Resumen de Comandos

| Comando | Descripción |
| :--- | :--- |
| `indigodb init` | Genera `schema.indigo` y `.env` iniciales en el directorio actual |
| `indigodb generate` | Genera el cliente ORM tipado en TypeScript desde `schema.indigo` |
| `indigodb db push` | Sincroniza `schema.indigo` directamente con PostgreSQL (idempotente, sin historial) |
| `indigodb db pull` | Introspecciona un esquema PostgreSQL existente hacia `.indigo` |
| `indigodb migrate dev` | Calcula diff mediante shadow DB en PGlite, genera migración SQL y la aplica |
| `indigodb migrate deploy` | Aplica migraciones pendientes con advisory lock y verificación SHA-256 |
| `indigodb migrate status` | Muestra migraciones aplicadas, pendientes, fallidas y modificadas |
| `indigodb migrate resolve` | Reconcilia `_indigo_migrations` manualmente sin ejecutar SQL |
| `indigodb realtime` | Inicia el servidor HTTP independiente para WAL SSE, `/log`, canales y métricas |
| `indigodb studio` | Inicia el SPA visual de Studio y su API JSON |

---

## `indigodb init`

Crea `schema.indigo` y `.env` iniciales (aborta con código `1` si el archivo de esquema destino ya existe).

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta de salida para el archivo de esquema |

## `indigodb generate`

Analiza, valida y resuelve el esquema, emitiendo el `IndigoClient` tipado mediante `@indigodb/generator`.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |
| `-o, --output <path>` | `generator.output` o `src/generated/indigo.ts` | Archivo destino del cliente TypeScript |

## `indigodb db push`

Sincroniza cambios de esquema de forma idempotente hacia PostgreSQL sin generar archivos de migración.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |
| `--print` | `false` | Imprime el SQL pre-transacción de replicación y el DDL de push sin ejecutarlos |

## `indigodb db pull`

Introspecciona una base PostgreSQL existente y escribe un archivo `.indigo` formateado (nunca escribe credenciales literales; emite `url = env("DATABASE_URL")`).

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `./schema.indigo` | Ruta del archivo `.indigo` resultante (sobrescribe si existe) |
| `--url <connectionString>` | `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `--db-schema <name>` | `public` | Esquema/namespace de PostgreSQL a introspeccionar |
| `--print` | `false` | Imprime el esquema en stdout en lugar de escribir a disco |

## `indigodb migrate dev`

Calcula el diff respecto al shadow replay en PGlite de `_indigo_migrations` y crea `migrations/<timestamp>_<name>/migration.sql`.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-n, --name <name>` | *(obligatorio)* | Nombre descriptivo de la migración |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |
| `--force` | `false` | Permite aplicar sentencias destructivas (`requires-force`) |
| `--create-only` | `false` | Escribe `migration.sql` sin aplicarla ni actualizar `_indigo_migrations` |
| `--empty` | `false` | Crea migración solo de datos (`migration.sql` + `data.sql`); exige `--create-only` |

## `indigodb migrate deploy`

Aplica migraciones pendientes en CI/producción bajo el bloqueo `pg_try_advisory_lock(80600501929807)`.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |
| `--force` | `false` | Aplica migraciones pendientes con marcadores `-- indigo:requires-force` |

## `indigodb migrate status`

Compara `migrations/` en disco con `_indigo_migrations` en PostgreSQL (`✓ applied`, `· pending`, `✗ failed`, `⚠ modified`). Siempre finaliza con código `0`.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |

## `indigodb migrate resolve`

Reconcilia manualmente `_indigo_migrations` sin ejecutar SQL ni modificar `.snapshot.json`.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |
| `--applied <id>` | — | Registra `<id>` con `success = true` (rechaza si hay drift de checksum) |
| `--rolled-back <id>` | — | Elimina el registro `<id>` de `_indigo_migrations` (mutuamente excluyente con `--applied`) |

## `indigodb realtime`

Inicia el servidor HTTP independiente para streams SSE WAL de modelos `@@realtime`, `/api/realtime/log`, canales Presence/Broadcast y `/api/realtime/metrics`.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` (requiere al menos una tabla `@@realtime`) |
| `-p, --port <port>` | `4477` | Puerto de escucha HTTP |
| `--allow-origin <origin>` | Cerrado (`[]`) | Origen CORS permitido (repetible); se combina con `INDIGODB_REALTIME_ALLOWED_ORIGINS` |

## `indigodb studio`

Inicia el servidor del SPA visual Studio y su API JSON.

| Opción | Por Defecto | Descripción |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Ruta al esquema `.indigo` |
| `-p, --port <port>` | `5555` | Puerto HTTP |
| `--host <host>` | `INDIGODB_STUDIO_HOST` o `127.0.0.1` | Dirección de enlace (no-loopback exige `INDIGODB_STUDIO_PASSWORD`) |
| `--no-open` | Abre el navegador | Evita abrir el navegador automáticamente |
| `--read-only` | `INDIGODB_STUDIO_READONLY` o `false` | Rechaza escrituras de filas, esquema y layout con `403` |
| `--query-timeout <ms>` | `INDIGODB_STUDIO_QUERY_TIMEOUT_MS` o `30000` | Timeout de sentencia en ms (`0` desactiva) |
| `--query-row-cap <n>` | `INDIGODB_STUDIO_QUERY_ROW_CAP` o `1000` | Límite de filas para `/api/query` (`0` desactiva) |
| `--env <name>` | `INDIGODB_ENV` o sin definir | Etiqueta visual informativa de entorno (máx. 32 caracteres) |
| `--allow-origin <origin>` | Cerrado (`[]`) | Orígenes CORS admitidos para las rutas realtime embebidas |
| `--audit-log` / `--no-audit-log` | `INDIGODB_STUDIO_AUDIT_LOG` o `true` | Habilita o deshabilita logs de auditoría JSON en stdout |

## Variables de Entorno

| Variable | Utilizada Por | Descripción |
| :--- | :--- | :--- |
| `DATABASE_URL` | CLI, `IndigoClient`, `RealtimeEngine` | Cadena de conexión PostgreSQL por defecto |
| `INDIGO_REALTIME_URL` | `IndigoClient` | URL base del servidor `indigodb realtime` para `.subscribe()` / `.live()` |
| `INDIGODB_REALTIME_SECRET` | `indigodb realtime`, `mintHandle` | Secreto HMAC-SHA256 (obligatorio si el esquema combina `@@realtime` + `@@allow`) |
| `INDIGODB_REALTIME_SLOT` | `migrator`, `WalSource` | Nombre del slot y publicación (por defecto `indigo_realtime`, `[a-z0-9_]{1,63}`) |
| `INDIGODB_REALTIME_ALLOWED_ORIGINS` | `indigodb realtime`, `studio` | Lista CORS separada por comas |
| `INDIGODB_STUDIO_HOST` | `indigodb studio` | Host de enlace por defecto para Studio |
| `INDIGODB_STUDIO_PASSWORD` | `indigodb studio` | Contraseña compartida que activa autenticación por sesión en `/api/*` |
| `INDIGODB_STUDIO_READONLY` | `indigodb studio` | `"1"`/`"true"` o `"0"`/`"false"` |
| `INDIGODB_STUDIO_QUERY_TIMEOUT_MS` | `indigodb studio` | Entero no negativo (timeout en ms) |
| `INDIGODB_STUDIO_QUERY_ROW_CAP` | `indigodb studio` | Entero no negativo (tope de filas) |
| `INDIGODB_STUDIO_AUDIT_LOG` | `indigodb studio` | `"1"`/`"true"` o `"0"`/`"false"` |
| `INDIGODB_STUDIO_DIST` | `studio-server` | Ruta alternativa opcional al bundle `dist/` de Studio |
| `INDIGODB_ENV` | `indigodb studio` | Etiqueta informativa de entorno |
| `INDIGODB_MIGRATE_PREV` | `migrate dev` | Usa `snapshot` para comparar contra `.snapshot.json` en vez de shadow replay |

## Siguiente Paso

Explora los 11 paquetes publicados en npm dentro del [Catálogo de Paquetes `@indigodb`](/indigodb/packages/overview).
