---
title: IndigoDB Studio & Production Guardrails
navTitle: Studio & Security
description: Inspect ER diagrams, edit schema.indigo safely, browse cursor-paginated PostgreSQL rows, run guarded read-only SQL queries, and harden remote Studio deployments with @indigodb/studio and @indigodb/cli.
section: studio
order: 1
runtime: "Visual SPA (@indigodb/studio) + HTTP API"
npmPackages:
  - "@indigodb/studio"
  - "@indigodb/cli"
---

**IndigoDB Studio** ([`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio)) is the built-in React 19 + Vite visual workspace launched by `npx indigodb studio` ([`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli)). Rather than maintaining separate ERD and HTML doc generators, Studio unifies everything visual against your live schema and PostgreSQL database.

```bash
npx indigodb studio
# Opens http://127.0.0.1:5555 automatically
```

## Workspaces Inside Studio

### 1. ER Diagram & Live `.indigo` Editor

- Renders models, columns, primary/foreign keys, cardinality edges, and color-coded `TableGroup` containers with **React Flow** (`@xyflow/react`).
- Includes an embedded **Monaco Editor** powered in-browser by `@indigodb/core` (`@indigodb/compiler` WASM) for instant syntax and validation diagnostics.
- Persists dragged node positions into a server-side `schema.layout.json` sidecar in the schema's directory (`GET`/`PUT /api/schema/layout`) with optimistic content-hash concurrency checks (`409` on stale write).
- Supports schema write-back (`PUT /api/schema/source`) with **mandatory datasource redaction**: the `datasource { ... }` block never leaves the server; the client keeps `// datasource redacted by Studio`, and the server reattaches the on-disk block, validates with `@indigodb/core`, and atomically writes via temp file + `rename(2)`.

### 2. Cursor-Paginated Data Browser

- Queries `/api/tables/:name` using composite-PK-safe keyset cursor pagination (`limit` in `{25, 50, 100, 200}`, `direction` `forward` | `backward`, base64url cursors).
- Aliases physical `dbName` columns back to schema field names.
- Allows row creation, editing, and deletion (`/api/rows/:table` `POST`/`PATCH`/`DELETE`), gated by primary-key identity and auto-increment column protections (`resolveWriteTarget`).
- Subscribes to the embedded `RealtimeEngine` (`@@realtime` tables) for live table refreshes while browsing.

### 3. Guarded SQL Query Console

- Executes ad-hoc read queries through `POST /api/query` inside an isolated read-only pool (`max: 4`).
- Enforces `BEGIN; SET TRANSACTION READ ONLY; SET LOCAL statement_timeout = <ms>; ...; ROLLBACK` at the PostgreSQL transaction boundary—PostgreSQL itself rejects any disguised write (`INSERT`/`UPDATE`/`DELETE`/CTE mutations).
- Caps eligible `SELECT`/`WITH`/`TABLE`/`VALUES` result sets via `DECLARE _indigo_query_cursor NO SCROLL CURSOR FOR <sql>` + `FETCH FORWARD <cap + 1>` (returning `truncated: true` when more rows exist).

### 4. Auto-Generated Schema Documentation Browser

- Renders table hero cards, column specs (types, defaults, nullability, PK/FK/unique badges, `@note` / `@@note` descriptions), relation panels, and PostgreSQL DDL previews directly from `ResolvedSchema`.

## Hardening & Guardrails for Shared / Staging Hosts

By default, `indigodb studio` binds only to loopback (`127.0.0.1:5555`) with strict `Host`-header validation. When exposing Studio on a shared network or staging box, use IndigoDB's built-in guardrails:

```bash
INDIGODB_STUDIO_PASSWORD="strong-operator-secret" \
npx indigodb studio \
  --host 0.0.0.0 \
  --port 5555 \
  --read-only \
  --env staging \
  --query-timeout 15000 \
  --query-row-cap 500 \
  --no-open
```

### Security Controls Matrix

| Control | Flag / Env Var | Default | Behavior |
| :--- | :--- | :--- | :--- |
| **Loopback-First Bind** | `--host` / `INDIGODB_STUDIO_HOST` | `127.0.0.1` | Non-loopback binds (`0.0.0.0`, LAN IP) **exit 1 at startup** unless `INDIGODB_STUDIO_PASSWORD` is set |
| **Session Auth Gate** | `INDIGODB_STUDIO_PASSWORD` | Unset (off on loopback) | Gates all `/api/*` routes (except `/api/auth/status` and `/api/auth/login`) with `HttpOnly`, `SameSite=Strict` signed session cookies |
| **Read-Only Mode** | `--read-only` / `INDIGODB_STUDIO_READONLY` | `false` | Rejects all writes to `/api/rows/*`, `PUT /api/schema/source`, and `PUT /api/schema/layout` with `403`. Rejects invalid env values (`"1"\|"0"\|"true"\|"false"` only) at startup |
| **Statement Timeout** | `--query-timeout <ms>` / `INDIGODB_STUDIO_QUERY_TIMEOUT_MS` | `30000` (30s) | Applied via `SET LOCAL statement_timeout` on `/api/query` and `/api/tables/:name` (`0` disables) |
| **Result Row Cap** | `--query-row-cap <n>` / `INDIGODB_STUDIO_QUERY_ROW_CAP` | `1000` | Cursor-enforced max rows returned by `/api/query` (`0` disables) |
| **Environment Badge** | `--env <name>` / `INDIGODB_ENV` | Unset | Informational header badge (`development`, `staging`, `production`, or custom label ≤ 32 chars); gates nothing |
| **Write Audit Log** | `--audit-log` / `--no-audit-log` / `INDIGODB_STUDIO_AUDIT_LOG` | Enabled (`true`) | Logs one JSON line (`kind: "studio.audit.write"`) per attempted write (`insert`/`update`/`delete`/`schema-write`/`layout-write`) with column names, stringified PKs, and HMAC session correlator—**never row values or secrets** |

## Next Step

See every command, flag, and environment variable in the [CLI Reference](/indigodb/cli/reference).
