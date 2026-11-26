---
title: CLI Reference (indigodb)
navTitle: CLI Reference
description: Complete command, subcommand, flag, and environment variable reference for @indigodb/cli (v0.1.1).
section: studio
order: 2
runtime: "Node.js >= 22"
npmPackages:
  - "@indigodb/cli"
---

The `indigodb` binary is distributed via [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) (`npm install -D @indigodb/cli` or `npx indigodb <command>`). Every command automatically loads `.env` from the current working directory without overriding already-set process environment variables.

## Commands Overview

| Command | Summary |
| :--- | :--- |
| `indigodb init` | Scaffold `schema.indigo` and `.env` in the current directory |
| `indigodb generate` | Generate the typed TypeScript ORM client from `schema.indigo` |
| `indigodb db push` | Sync `schema.indigo` directly to PostgreSQL (idempotent, no history) |
| `indigodb db pull` | Introspect an existing PostgreSQL schema into `.indigo` |
| `indigodb migrate dev` | Diff via PGlite shadow DB, write SQL migration, and apply locally |
| `indigodb migrate deploy` | Apply pending migrations with advisory lock and checksum verification |
| `indigodb migrate status` | Report applied, pending, failed, and drifted migrations |
| `indigodb migrate resolve` | Reconcile `_indigo_migrations` without executing SQL |
| `indigodb realtime` | Start standalone WAL SSE, signed-handle replay, channels & metrics server |
| `indigodb studio` | Launch the visual Studio SPA and JSON API server |

---

## `indigodb init`

Scaffolds a starter `schema.indigo` and `.env` (aborts with exit code `1` if the target schema file already exists).

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Destination path for the schema file |

## `indigodb generate`

Parses, validates, and resolves the schema, then emits the typed `IndigoClient` via `@indigodb/generator`.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |
| `-o, --output <path>` | `generator.output` or `src/generated/indigo.ts` | Output file path for generated TypeScript client |

## `indigodb db push`

Pushes schema changes idempotently to PostgreSQL without creating migration files.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |
| `--print` | `false` | Print pre-transaction replication SQL and push DDL to stdout without executing |

## `indigodb db pull`

Introspects an existing PostgreSQL database and writes a formatted `.indigo` file (never writes raw credentials; emits `url = env("DATABASE_URL")`).

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `./schema.indigo` | Output schema file path (overwrites if present) |
| `--url <connectionString>` | `DATABASE_URL` | PostgreSQL connection string override |
| `--db-schema <name>` | `public` | PostgreSQL namespace/schema to introspect |
| `--print` | `false` | Print `.indigo` output to stdout instead of writing a file |

## `indigodb migrate dev`

Diffs your schema against a PGlite shadow replay of `_indigo_migrations` and writes `migrations/<timestamp>_<name>/migration.sql`.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-n, --name <name>` | *(required)* | Migration name slug |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |
| `--force` | `false` | Apply `requires-force` destructive statements |
| `--create-only` | `false` | Write `migration.sql` without applying or updating `_indigo_migrations` |
| `--empty` | `false` | Scaffold data-only `migration.sql` + `data.sql` (requires `--create-only`) |

## `indigodb migrate deploy`

Applies pending migrations in CI/production under PostgreSQL advisory lock `pg_try_advisory_lock(80600501929807)`.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |
| `--force` | `false` | Apply pending migrations containing `-- indigo:requires-force` markers |

## `indigodb migrate status`

Compares `migrations/` on disk against `_indigo_migrations` in PostgreSQL (`✓ applied`, `· pending`, `✗ failed`, `⚠ modified`). Always exits `0`.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |

## `indigodb migrate resolve`

Manually reconciles `_indigo_migrations` without running SQL or modifying `.snapshot.json`.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |
| `--applied <id>` | — | Record `<id>` as `success = true` (refuses on checksum drift) |
| `--rolled-back <id>` | — | Delete `<id>` from `_indigo_migrations` (mutually exclusive with `--applied`) |

## `indigodb realtime`

Starts the standalone HTTP server for `@@realtime` WAL SSE streams, `/api/realtime/log`, Presence/Broadcast channels, and `/api/realtime/metrics`.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema (must contain at least one `@@realtime` table) |
| `-p, --port <port>` | `4477` | HTTP listen port |
| `--allow-origin <origin>` | Closed (`[]`) | Repeatable allowed CORS origin; merges with `INDIGODB_REALTIME_ALLOWED_ORIGINS` |

## `indigodb studio`

Starts the Studio SPA and JSON API server.

| Option | Default | Description |
| :--- | :--- | :--- |
| `-s, --schema <path>` | `schema.indigo` | Path to `.indigo` schema |
| `-p, --port <port>` | `5555` | HTTP listen port |
| `--host <host>` | `INDIGODB_STUDIO_HOST` or `127.0.0.1` | Bind host (non-loopback requires `INDIGODB_STUDIO_PASSWORD`) |
| `--no-open` | Opens browser | Skip opening the browser automatically |
| `--read-only` | `INDIGODB_STUDIO_READONLY` or `false` | Reject all row, schema, and layout writes with `403` |
| `--query-timeout <ms>` | `INDIGODB_STUDIO_QUERY_TIMEOUT_MS` or `30000` | Statement timeout in ms (`0` disables) |
| `--query-row-cap <n>` | `INDIGODB_STUDIO_QUERY_ROW_CAP` or `1000` | Row cap for `/api/query` (`0` disables) |
| `--env <name>` | `INDIGODB_ENV` or unset | Informational environment badge label (max 32 chars) |
| `--allow-origin <origin>` | Closed (`[]`) | Allowed CORS origin for Studio's embedded realtime routes |
| `--audit-log` / `--no-audit-log` | `INDIGODB_STUDIO_AUDIT_LOG` or `true` | Enable/disable structured stdout write audit logs |

## Environment Variables Matrix

| Variable | Used By | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | CLI, `IndigoClient`, `RealtimeEngine` | Default PostgreSQL connection string |
| `INDIGO_REALTIME_URL` | `IndigoClient` | Base URL of `indigodb realtime` for backend `.subscribe()` / `.live()` |
| `INDIGODB_REALTIME_SECRET` | `indigodb realtime`, `mintHandle` | HMAC-SHA256 secret (required by CLI when schema has `@@realtime` + `@@allow`) |
| `INDIGODB_REALTIME_SLOT` | `migrator`, `WalSource` | Replication slot & publication name (default `indigo_realtime`, `[a-z0-9_]{1,63}`) |
| `INDIGODB_REALTIME_ALLOWED_ORIGINS` | `indigodb realtime`, `studio` | Comma-separated CORS allowlist |
| `INDIGODB_STUDIO_HOST` | `indigodb studio` | Default Studio bind host |
| `INDIGODB_STUDIO_PASSWORD` | `indigodb studio` | Shared password enabling session auth for `/api/*` |
| `INDIGODB_STUDIO_READONLY` | `indigodb studio` | `"1"`/`"true"` or `"0"`/`"false"` |
| `INDIGODB_STUDIO_QUERY_TIMEOUT_MS` | `indigodb studio` | Non-negative integer timeout in ms |
| `INDIGODB_STUDIO_QUERY_ROW_CAP` | `indigodb studio` | Non-negative integer row cap |
| `INDIGODB_STUDIO_AUDIT_LOG` | `indigodb studio` | `"1"`/`"true"` or `"0"`/`"false"` |
| `INDIGODB_STUDIO_DIST` | `studio-server` | Optional filesystem override for built Studio SPA `dist/` |
| `INDIGODB_ENV` | `indigodb studio` | Informational badge label |
| `INDIGODB_MIGRATE_PREV` | `migrate dev` | Set to `snapshot` to diff against `.snapshot.json` instead of shadow replay |

## Next Step

Explore all 11 published npm packages in the [`@indigodb` npm Organization Overview](/indigodb/packages/overview).
