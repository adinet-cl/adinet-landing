---
title: Migraciones, Shadow Replay e Introspección
navTitle: Migraciones e Introspección
description: Sincroniza esquemas con db push, introspecciona bases PostgreSQL existentes con db pull y ejecuta migraciones versionadas verificadas por SHA-256 y shadow DB mediante @indigodb/migrator y @indigodb/cli.
section: migrations
order: 1
runtime: "PostgreSQL · Shadow DB PGlite"
npmPackages:
  - "@indigodb/migrator"
  - "@indigodb/cli"
---

IndigoDB ofrece dos flujos complementarios para gestionar la evolución del esquema sobre [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) y [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli):

| Comando | Registra Historial | Caso de Uso |
| :--- | :--- | :--- |
| `indigodb db push` | No | Prototipado rápido; emite DDL idempotente (`CREATE ... IF NOT EXISTS`) |
| `indigodb db pull` | No | Introspecciona un esquema PostgreSQL existente hacia `schema.indigo` |
| `indigodb migrate dev` | Sí | Calcula diff contra shadow DB, genera SQL versionado y lo aplica localmente |
| `indigodb migrate deploy` | Sí | Ejecución en CI/producción con advisory lock, verificación SHA-256 y guardas destructivas |
| `indigodb migrate status` | Sí | Lista migraciones aplicadas, pendientes, fallidas o alteradas (`⚠ modified`) |
| `indigodb migrate resolve` | Sí | Reconcilia manualmente `_indigo_migrations` (`--applied` / `--rolled-back`) sin ejecutar SQL |

## Prototipado con `db push`

`db push` genera DDL idempotente directamente desde `ResolvedSchema` (`renderPushSql`):

```bash
npx indigodb db push --print   # imprime el SQL en stdout sin ejecutar
npx indigodb db push           # aplica tablas, enums, índices, FKs, RLS y DDL @@realtime
```

Si el esquema incluye alguna tabla `@@realtime`, `db push` ejecuta primero una verificación de solo lectura (`SHOW wal_level` y privilegio `REPLICATION` en `pg_roles`) y crea el slot de replicación fuera de la transacción principal.

## Migraciones Versionadas (`migrate dev` y `migrate deploy`)

Las migraciones viven en `migrations/<YYYYMMDDHHMMSS>_<slug>/migration.sql` y su estado se registra en PostgreSQL dentro de `_indigo_migrations` (`id`, `name`, `applied_at`, `checksum`, `success`, `installed_by`, `execution_time_ms`).

### Crear Migraciones en Desarrollo

```bash
# Generar y aplicar una nueva migración
npx indigodb migrate dev --name add_orders

# Generar migration.sql sin aplicarla todavía (para revisión o edición manual)
npx indigodb migrate dev --name add_orders --create-only

# Crear plantilla de migración solo de datos (migration.sql + data.sql transaccional)
npx indigodb migrate dev --name backfill_roles --create-only --empty
```

### Reproducción en Shadow DB (`Shadow Replay`)

Por defecto, `indigodb migrate dev` **no confía** en el archivo local `.snapshot.json`. Se conecta a PostgreSQL para leer `_indigo_migrations`, reproduce cada archivo `migration.sql` aplicado dentro de una base **PGlite** aislada en memoria (`buildShadowSchema`), introspecciona el catálogo resultante y calcula el diff contra tu nuevo `schema.indigo`.

Si falta un archivo registrado, fue editado en disco (drift de checksum) o el orden diverge, `migrate dev` aborta con `ShadowReplayError`.

> **Adoptar una base gestionada con `db push`**: Si partes de tablas ya creadas por `db push` con `_indigo_migrations` vacío, puedes usar temporalmente `INDIGODB_MIGRATE_PREV=snapshot` para comparar contra `migrations/.snapshot.json`, o inicializar una línea base con `--create-only` + `migrate resolve --applied`.

### Despliegue en CI / Producción

```bash
npx indigodb migrate deploy
```

`migrate deploy` aplica cinco garantías antes de modificar el esquema productivo:

1. **Advisory Lock de PostgreSQL**: Toma `pg_try_advisory_lock(80600501929807)` (`0x494E4449474F`) para serializar despliegues concurrentes sobre la misma base.
2. **Preflight de Checksums SHA-256**: Recalcula el hash de cada `migration.sql` (+ `data.sql` opcional con separador de dominio) ya aplicado y rechaza el despliegue si algún archivo histórico cambió.
3. **Bloqueo por Fallos Previos**: Rechaza el avance si existe una migración pendiente registrada previamente con `success = false`.
4. **División de Fase Pre-Transacción**: Las sentencias marcadas con `-- indigo:begin no-transaction` / `-- indigo:end no-transaction` (como `ALTER TYPE ... ADD VALUE`) se ejecutan fuera de `BEGIN`/`COMMIT`.
5. **Guarda de Cambios Destructivos**: Inspecciona todas las migraciones pendientes buscando `-- indigo:requires-force <impact>`. Sin `--force`, `migrate deploy` aborta antes de aplicar **ninguna** migración del lote.

## Migraciones de Datos Transaccionales (`data.sql`)

```bash
npx indigodb migrate dev --name backfill_slugs --create-only --empty
```

Genera:
- `migrations/<id>/migration.sql`
- `migrations/<id>/data.sql` (sentencias DML ejecutadas dentro de la misma transacción inmediatamente después de `migration.sql`, incluidas en el checksum SHA-256).

## Diagnóstico y Reconciliación Manual

```bash
# Ver estado (siempre sale con código 0; reporta ✓ applied, · pending, ✗ failed, ⚠ modified)
npx indigodb migrate status

# Reconciliar el historial sin ejecutar SQL
npx indigodb migrate resolve --applied 20261125120000_init
npx indigodb migrate resolve --rolled-back 20261125120000_failed_step
```

- `--applied <id>` rechaza si existe una fila con checksum distinto (nunca oculta archivos modificados).
- `--rolled-back <id>` elimina el registro de `_indigo_migrations` para permitir reintentar la migración.

## Introspección de Base Existente (`db pull`)

```bash
npx indigodb db pull --url "$DATABASE_URL"
npx indigodb db pull --db-schema analytics --print
```

- Sintetiza `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`: nunca escribe credenciales literales en `schema.indigo`.
- **Advertencia sobre claves foráneas**: Las FKs introspectadas del catálogo se imprimen como comentarios estructurados `// @fk(fields: [...], references: [...], model: ...)`. Antes de ejecutar `migrate dev` sobre un esquema extraído con `db pull`, añade manualmente los campos `@relation(...)` correspondientes para que `migrate dev` no planifique eliminar esas claves foráneas.

## Siguiente Paso

Configura replicación lógica WAL, SSE wake-only, handles firmados y canales efímeros en [Motor Tiempo Real y WAL](/indigodb/realtime/engine-and-wal).
