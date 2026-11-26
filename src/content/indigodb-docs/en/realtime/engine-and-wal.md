---
title: Realtime Engine, WAL Replication & Channels
navTitle: Realtime Engine & WAL
description: Stream PostgreSQL logical-replication (pgoutput) changes over SSE, serve signed-handle RLS replay logs, host ephemeral Presence and Broadcast channels, and monitor live metrics with @indigodb/realtime.
section: realtime
order: 1
runtime: "PostgreSQL WAL (pgoutput) · Node.js >= 22"
npmPackages:
  - "@indigodb/realtime"
  - "@indigodb/cli"
---

[`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) powers IndigoDB's real-time layer over plain `node:http` with zero web-framework lock-in. It connects PostgreSQL's Write-Ahead Log (`pgoutput`) to lightweight HTTP Server-Sent Events (SSE), RLS-scoped replay logs, ephemeral Presence/Broadcast channels, and operational metrics.

## PostgreSQL Prerequisites (`@@realtime`)

`WalSource` (the default realtime source) reads PostgreSQL logical replication slots using `pgoutput`. Two PostgreSQL prerequisites are checked automatically by `indigodb db push` and `indigodb migrate deploy`:

1. **`wal_level = logical`**: Set in `postgresql.conf` or via `ALTER SYSTEM SET wal_level = logical;` followed by a PostgreSQL restart.
2. **`REPLICATION` privilege**: The database role must be a superuser or carry `REPLICATION` (`ALTER ROLE <user> REPLICATION;`).

Each `@@realtime` table also receives `REPLICA IDENTITY FULL` so `UPDATE` and `DELETE` events include full `old` payloads, and a publication/slot named `indigo_realtime` by default (configurable via `INDIGODB_REALTIME_SLOT`, validated against `/^[a-z0-9_]{1,63}$/`).

> Legacy v1 `LISTEN`/`NOTIFY` (`PgNotifySource`) remains exported for custom deployments, while `WalSource` is the production default because it preserves unacknowledged commits across disconnects and carries commit LSNs.

## Running the Realtime Server

### Option 1: Standalone CLI Daemon

```bash
# Require INDIGODB_REALTIME_SECRET when schema mixes @@realtime + @@allow
export INDIGODB_REALTIME_SECRET="$(openssl rand -hex 32)"

npx indigodb realtime \
  --port 4477 \
  --allow-origin https://app.example.com
```

### Option 2: Embedded in Your Node.js HTTP Server

```ts
import { createServer } from "node:http";
import { parse, resolve } from "@indigodb/core";
import { RealtimeEngine } from "@indigodb/realtime";

const schema = resolve(
  parse(`
  Table Message {
    id      Int    @id @default(autoincrement())
    body    String
    ownerId String

    @@realtime(columns: [id, body])
    @@allow(read, auth.userId == this.ownerId)
  }
  `),
);

const engine = new RealtimeEngine({
  connectionString: process.env.DATABASE_URL!,
  schema,
  allowedOrigins: ["https://app.example.com"],
  heartbeatMs: 25_000,
  maxBufferedBytes: 1_048_576, // 1 MiB backpressure eviction cap
  presenceTtlMs: 30_000,
  onTelemetry: (ev) => console.log(JSON.stringify(ev)),
  authorizeChannel: async (req, ctx) => {
    // Optional auth hook for Presence & Broadcast channels
    return Boolean(req.headers.authorization);
  },
});

await engine.start();

const server = createServer();
engine.attach(server); // mounts all 6 /api/realtime* routes
server.listen(4477);
```

## HTTP Routes & Wire Protocol

Constants are exported from both [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) and the browser-safe [`@indigodb/realtime/protocol`](/indigodb/packages/runtime-and-ui#indigodbrealtimeprotocol) subpath:

| Path Constant | Default Route | Method | Purpose |
| :--- | :--- | :--- | :--- |
| `REALTIME_PATH` | `/api/realtime` | `GET` | Unauthenticated wake-only SSE stream (`?tables=ModelA,ModelB`) |
| `REALTIME_LOG_PATH` | `/api/realtime/log` | `GET` | Signed-handle, RLS-scoped replay log (`?handle=...&offset=...`, 500 rows/page) |
| `REALTIME_CHANNELS_PATH` | `/api/realtime/channels` | `GET` | Ephemeral Presence + Broadcast SSE stream (`?channel=<name>[&clientId=<id>]`) |
| `REALTIME_BROADCAST_PATH` | `/api/realtime/channels/broadcast` | `POST` | Publish ephemeral broadcast event (`{ channel, event, payload, senderId? }`) |
| `REALTIME_PRESENCE_PATH` | `/api/realtime/channels/presence` | `POST` | Track/untrack caller state (`{ channel, clientId, action, state? }`) |
| `REALTIME_METRICS_PATH` | `/api/realtime/metrics` | `GET` | Operational metrics JSON (`Cache-Control: no-store`, zero secrets/rows) |

## Security Model: Wake-Only SSE & Signed Handles

### 1. SSE Wakes Never Carry Row Data

The `/api/realtime` SSE endpoint is deliberately unauthenticated and **never sends `new` or `old` row data** for any table. Every committed change emits:
- Initial `event: ready` with `{ tables: string[] }`
- Per-change `event: wake` with `{ table, op, lsn?, seq? }`
- Periodic `:ping` comments every `heartbeatMs` (default `25_000` ms) to stay beneath proxy idle timeouts

Clients react to `wake` frames by refetching through your authenticated backend or through `/api/realtime/log`.

### 2. Server-Side Signed Handles (`mintHandle` / `verifyHandle`)

For `@@realtime` + `@@allow` tables, your authenticated backend route mints short-lived HMAC-SHA256 handles bound to `{ table, userId, exp }` using `mintHandle`:

```ts
import { mintHandle, DEFAULT_HANDLE_TTL_SECONDS } from "@indigodb/realtime";

const handle = mintHandle(
  { table: "Message", userId: currentUser.id, ttl: DEFAULT_HANDLE_TTL_SECONDS },
  process.env.INDIGODB_REALTIME_SECRET!,
);
```

When a client calls `GET /api/realtime/log?handle=<token>&offset=0`, `RealtimeEngine` verifies the HMAC with `timingSafeEqual` (returning an opaque `401 Unauthorized` for every failure mode), sets `app.user_id` inside a `READ ONLY` transaction, and returns up to `REALTIME_LOG_PAGE_SIZE` (`500`) rows from `_indigo_realtime_log` matching that user's RLS buckets.

### 3. Closed-by-Default CORS Origin Allowlist

If `allowedOrigins` (or `--allow-origin` / `INDIGODB_REALTIME_ALLOWED_ORIGINS`) is empty or omitted, **cross-origin browser requests are rejected with `403`** (`realtime: origin not allowed`). Requests without an `Origin` header (server-to-server callers, `curl`, same-origin Studio) are always admitted. Matching is exact lowercase string equality (`scheme://host[:port]`).

## Ephemeral Presence & Broadcast Channels

Channels run wholly in memory (no Postgres writes required) with channel identifiers validated against `/^[A-Za-z0-9_.:-]{1,128}$/` and POST body caps of `MAX_CHANNEL_BODY_BYTES` (`65_536` bytes):

- **Presence**: Tracks online members per channel with automatic `presenceTtlMs` (`30_000` ms default) expiry and immediate `presence_leave` on SSE disconnect.
- **Broadcast**: Fans out `{ channel, event, payload, senderId, ts }` to active SSE subscribers and in-process `engine.onBroadcast(...)` listeners.
- **Channel Auth**: Provide `authorizeChannel(req, { channel, action, clientId })` to enforce JWT/session cookies before admitting subscribe, broadcast, or presence requests.

## Observability & Backpressure

- **Slow-Consumer Eviction**: Before writing to any SSE socket, `RealtimeEngine` checks `socket.writableLength`. If it exceeds `maxBufferedBytes` (default `1_048_576` bytes = 1 MiB), the slow subscriber is evicted, `subscribers.totalEvicted` increments, and a `subscriber_evicted` telemetry event fires.
- **Structured Telemetry**: `onTelemetry` emits typed events (`subscriber_connect`, `subscriber_disconnect`, `subscriber_evicted`, `event_dispatched`, `log_page`, `broadcast`, `presence_change`, `error`) with zero row payloads or secrets.
- **Metrics Snapshot**: `engine.getMetrics()` and `GET /api/realtime/metrics` expose `uptimeMs`, `subscribers`, `events.byTable`, `events.byOp`, `events.lastLsn`, `log`, and `channels` counters.

## Next Step

Learn how browser apps and React components consume these streams safely in [Browser SDK & React Hooks](/indigodb/realtime/browser-and-react).
