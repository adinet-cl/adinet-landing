---
title: "Runtime, Realtime & UI: client, realtime, react, cli, studio"
navTitle: Runtime, Realtime & UI
description: Subpath exports and programmatic APIs for @indigodb/client, @indigodb/client/realtime, @indigodb/realtime, @indigodb/realtime/protocol, @indigodb/react, @indigodb/cli, and @indigodb/studio.
section: packages
order: 4
npmPackages:
  - "@indigodb/client"
  - "@indigodb/realtime"
  - "@indigodb/react"
  - "@indigodb/cli"
  - "@indigodb/studio"
---

Detailed API reference for IndigoDB's runtime, realtime, React, CLI, and Studio packages on npm (`v0.1.1`, `Node >= 22`).

## `@indigodb/client`

- **npm**: [`https://www.npmjs.com/package/@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) (`v0.1.1`)
- **Source**: [`packages/client`](https://github.com/chechooxd/indigo/tree/main/packages/client)

```bash
npm install @indigodb/client
```

### Root Entry (Server-Only)

Statically imports `pg` and `node:async_hooks`. Exports:
- **Client & Delegates**: `IndigoClientBase`, `ModelDelegate`, `RealtimeModelDelegate`, `LiveModelDelegate`, `currentQueryContext`
- **Adapters**: `createPgAdapter`, `createPGliteAdapter`, `DriverAdapter`, `Executor`, `TransactionHook`
- **Deferred Transactions**: `IndigoPromise`, `isIndigoPromise`, `defer`, `runDeferred`, `DeferredResults`
- **Errors**: `IndigoDatabaseError`, `withDatabaseErrors`, `IndigoRelationError`, `IndigoNestedWriteError`, `IndigoNotFoundError`, `IndigoTransactionError`, `IndigoLiveHandleError`
- **Query & Meta Types**: `IndigoClientOptions`, `RealtimeOptions`, `QueryExtension`, `QueryContext`, `FindManyArgs`, `FindFirstArgs`, `FindUniqueArgs`, `CreateArgs`, `UpdateArgs`, `DeleteArgs`, `CountArgs`, `CreateManyArgs`, `UpdateManyArgs`, `DeleteManyArgs`, `AggregateArgs`, `GroupByArgs`, `UpsertArgs`, `WhereFilter`, `JsonFilter`, `RelationFilter`, `Payload`, `ExplainResult`, `ModelMeta`, `FieldMeta`, `RelationMeta`, `IndexMeta`

### `@indigodb/client/realtime` (Browser-Safe)

Imports zero Node built-ins or `pg`; consumes only Web APIs and `@indigodb/realtime/protocol`. Exports:
- **Subscriptions & Channels**: `createLiveSubscription`, `createWakeDebouncer`, `browserTransport`, `createChannel`, `RealtimeConnectionManager`, `SseTransport`
- **Constants & Types**: `REALTIME_PATH`, `REALTIME_LOG_PATH`, `REALTIME_CHANNELS_PATH`, `REALTIME_BROADCAST_PATH`, `REALTIME_PRESENCE_PATH`, `REALTIME_METRICS_PATH`, `LIVE_DEBOUNCE_MS`, `LiveSubscription`, `LiveSubscriptionOptions`, `LiveSubscriptionStatus`, `LiveSubscriptionError`, `RealtimeChannel`, `ChannelOptions`, `ChannelStatus`, `PresenceMember`, `PresenceEvent`, `ChannelReady`, `BroadcastMessage`, `RealtimeMetrics`, `RealtimeTelemetryEvent`

---

## `@indigodb/realtime`

- **npm**: [`https://www.npmjs.com/package/@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) (`v0.1.1`)
- **Source**: [`packages/realtime`](https://github.com/chechooxd/indigo/tree/main/packages/realtime)

```bash
npm install @indigodb/realtime
```

### Root Entry (Server-Only)

- **Engine**: `RealtimeEngine`, `DEFAULT_MAX_BUFFERED_BYTES`, `RealtimeEngineOptions`, `RealtimeLogDb`, `ChannelAuthContext`
- **Event Sources**: `WalSource` (default `pgoutput` logical replication), `WalSourceOptions`, `PgNotifySource`, `resolveSlotName`
- **Signed Handles & Projection**: `mintHandle`, `verifyHandle`, `DEFAULT_HANDLE_TTL_SECONDS`, `HandlePayload`, `project`, `projectionSet`

### `@indigodb/realtime/protocol`

Dependency-free wire protocol types and HTTP route constants (`REALTIME_*_PATH`, `REALTIME_LOG_PAGE_SIZE`, `DEFAULT_PRESENCE_TTL_MS`, `MAX_CHANNEL_BODY_BYTES`, `RealtimeEvent`, `RealtimeWakeEvent`, `RealtimeLogPage`, `PresenceMember`, `BroadcastMessage`, `RealtimeMetrics`, `RealtimeTelemetryEvent`). Safe to import in browser code.

---

## `@indigodb/react`

- **npm**: [`https://www.npmjs.com/package/@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) (`v0.1.1`)
- **Source**: [`packages/react`](https://github.com/chechooxd/indigo/tree/main/packages/react)
- **Peer Dependency**: `react >= 18.0.0`

```bash
npm install @indigodb/react @indigodb/client
```

Exports:
- **Hooks**: `useLiveTable`, `useChannel` (`UseLiveTableOptions`, `UseLiveTableResult`, `UseChannelOptions`, `UseChannelResult`)
- **Re-exported Browser Primitives**: `createLiveSubscription`, `browserTransport`, `createChannel`, `LiveSubscription`, `RealtimeChannel`, `PresenceMember`, `BroadcastMessage`

---

## `@indigodb/cli`

- **npm**: [`https://www.npmjs.com/package/@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) (`v0.1.1`)
- **Source**: [`packages/cli`](https://github.com/chechooxd/indigo/tree/main/packages/cli)
- **Binary**: `indigodb` (`./dist/index.js`)

```bash
npm install -D @indigodb/cli
```

Ships all CLI commands (`init`, `generate`, `db push`, `db pull`, `migrate dev/deploy/status/resolve`, `realtime`, `studio`) and embeds `@indigodb/studio` as a runtime dependency so `npx indigodb studio` works out of the box.

---

## `@indigodb/studio`

- **npm**: [`https://www.npmjs.com/package/@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio) (`v0.1.1`)
- **Source**: [`apps/studio`](https://github.com/chechooxd/indigo/tree/main/apps/studio)

Packages the compiled React 19 + React Flow + Monaco Editor Studio SPA (`dist/`). Installed automatically with `@indigodb/cli` and resolved via `require.resolve("@indigodb/studio/package.json")` (overridable via `INDIGODB_STUDIO_DIST`).

## Next Step

Start building with the [Quickstart Guide](/indigodb/getting-started) or inspect the [CLI Reference](/indigodb/cli/reference).
