---
title: Migrations, Shadow Replay & Introspection
navTitle: Migrations & Introspection
description: Sync schemas with db push, introspect existing PostgreSQL databases with db pull, and run checksum-verified, shadow-replayed versioned migrations with @indigodb/migrator and @indigodb/cli.
section: migrations
order: 1
runtime: "PostgreSQL · PGlite Shadow DB"
npmPackages:
  - "@indigodb/migrator"
  - "@indigodb/cli"
---

IndigoDB provides two complementary schema-management workflows built on [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) and [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli):

| Command | History Tracked | Use Case |
| :--- | :--- | :--- |
| `indigodb db push` | No | Local prototyping; idempotent DDL (`CREATE ... IF NOT EXISTS`) |
| `indigodb db pull` | No | Introspect an existing PostgreSQL `public` (or custom) schema into `schema.indigo` |
| `indigodb migrate dev` | Yes | Diff via shadow DB, write versioned SQL, validate safety, apply locally |
| `indigodb migrate deploy` | Yes | CI/production runner with advisory lock, checksum gate, and force guard |
| `indigodb migrate status` | Yes | Inspect applied, pending, failed, and checksum-drifted (`⚠ modified`) migrations |
| `indigodb migrate resolve` | Yes | Manually reconcile `_indigo_migrations` (`--applied` / `--rolled-back`) without running SQL |

## Prototyping with `db push`

`db push` renders idempotent PostgreSQL DDL directly from `ResolvedSchema` (`renderPushSql`):

```bash
npx indigodb db push --print   # dry-run SQL to stdout
npx indigodb db push           # apply tables, enums, indexes, FKs, RLS, and @@realtime DDL
```

If your schema declares any `@@realtime` table, `db push` runs a read-only replication preflight first (`SHOW wal_level` and `pg_roles` check for `REPLICATION`) and creates the replication slot outside the main transaction.

## Versioned Migrations (`migrate dev` & `migrate deploy`)

Migrations are stored on disk under `migrations/<YYYYMMDDHHMMSS>_<slug>/migration.sql` and recorded in PostgreSQL inside `_indigo_migrations` (`id`, `name`, `applied_at`, `checksum`, `success`, `installed_by`, `execution_time_ms`).

### Creating Migrations in Development

```bash
# Generate and apply a new migration
npx indigodb migrate dev --name add_orders

# Write migration.sql without applying it (useful for review or manual SQL edits)
npx indigodb migrate dev --name add_orders --create-only

# Scaffold a data-only migration (migration.sql + transactional data.sql)
npx indigodb migrate dev --name backfill_roles --create-only --empty
```

### Shadow-Database Replay

By default, `indigodb migrate dev` does **not** trust a local `.snapshot.json` file. Instead, it connects to PostgreSQL to read `_indigo_migrations`, replays every recorded migration file in order into an isolated embedded **PGlite shadow database** (`buildShadowSchema`), introspects the resulting shadow catalog, and diffs your new `schema.indigo` against that true state.

If a recorded migration file is missing, edited (`checksum` mismatch), or recorded out of order, `migrate dev` aborts with `ShadowReplayError`.

> **Adopting a `db push` database**: When migrating an existing `db push`-managed database that has tables but an empty `_indigo_migrations` table, set `INDIGODB_MIGRATE_PREV=snapshot` once if you need to diff from `migrations/.snapshot.json`, or baseline with `--create-only` + `migrate resolve --applied`.

### Deploying in CI / Production

```bash
npx indigodb migrate deploy
```

`migrate deploy` enforces five production safety guarantees before modifying data:

1. **PostgreSQL Advisory Lock**: Acquires `pg_try_advisory_lock(80600501929807)` (`0x494E4449474F`) so two concurrent CI/CD runners never race on the same database.
2. **SHA-256 Checksum Preflight**: Re-hashes every already-applied `migration.sql` (+ optional `data.sql` using a domain separator) and refuses if any historical file drifted on disk.
3. **Failed-Migration Gate**: Refuses if any pending migration has a `success = false` ledger row until an operator resolves it.
4. **Pre-Transaction Phase Split**: Statements wrapped in `-- indigo:begin no-transaction` / `-- indigo:end no-transaction` (such as `ALTER TYPE ... ADD VALUE`) execute outside `BEGIN`/`COMMIT` so PostgreSQL permits them.
5. **Destructive Change Guard**: Scans all pending files for `-- indigo:requires-force <impact>` markers (such as `DROP TABLE`, `DROP COLUMN`, `SET NOT NULL`). Without `--force`, `migrate deploy` refuses before applying **any** pending file in the batch.

## Transactional Data Backfills (`data.sql`)

```bash
npx indigodb migrate dev --name backfill_slugs --create-only --empty
```

This creates:
- `migrations/<id>/migration.sql` (DDL comments or schema edits)
- `migrations/<id>/data.sql` (DML statements executed inside the exact same transaction right after `migration.sql`, included in the SHA-256 checksum).

## Checking Status & Reconciling History

```bash
# Inspect ledger vs. disk (always exits 0, flags ⚠ modified / ✗ failed / · pending)
npx indigodb migrate status

# Reconcile an out-of-band fix or failed deploy without executing SQL
npx indigodb migrate resolve --applied 20261125120000_init
npx indigodb migrate resolve --rolled-back 20261125120000_failed_step
```

- `--applied <id>` refuses if a previously recorded row has a mismatched checksum (`resolve` never launders drifted files).
- `--rolled-back <id>` removes the row from `_indigo_migrations` so the next `migrate deploy` can re-attempt it.

## Introspecting an Existing Database (`db pull`)

Reverse-engineer an existing PostgreSQL database into `schema.indigo`:

```bash
npx indigodb db pull --url "$DATABASE_URL"
npx indigodb db pull --db-schema analytics --print
```

- Synthesizes `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`—database credentials are never written to `schema.indigo`.
- **Important FK caveat**: Foreign keys introspected from the PostgreSQL catalog are currently emitted as structured `// @fk(fields: [...], references: [...], model: ...)` comments rather than synthetic `@relation(...)` field names. Before running `migrate dev` on a pulled schema, convert those `// @fk(...)` annotations into `@relation(...)` fields so `migrate dev` does not plan to drop existing foreign keys.

## Next Step

Set up PostgreSQL logical replication, wake-only SSE streams, signed handles, and ephemeral channels in [Realtime Engine & WAL](/indigodb/realtime/engine-and-wal).
