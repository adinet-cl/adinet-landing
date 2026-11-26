---
title: "Runtime, Tiempo Real y UI: client, realtime, react, cli, studio"
navTitle: Runtime, Realtime y UI
description: Subrutas exportadas y APIs programáticas de @indigodb/client, @indigodb/client/realtime, @indigodb/realtime, @indigodb/realtime/protocol, @indigodb/react, @indigodb/cli y @indigodb/studio.
section: packages
order: 4
npmPackages:
  - "@indigodb/client"
  - "@indigodb/realtime"
  - "@indigodb/react"
  - "@indigodb/cli"
  - "@indigodb/studio"
---

Referencia detallada de los paquetes de runtime, tiempo real, React, CLI y Studio publicados en npm (`v0.1.1`, `Node >= 22`).

## `@indigodb/client`

- **npm**: [`https://www.npmjs.com/package/@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) (`v0.1.1`)
- **Fuente**: [`packages/client`](https://github.com/chechooxd/indigo/tree/main/packages/client)

```bash
npm install @indigodb/client
```

### Entrada Raíz (Solo Servidor)

Importa estáticamente `pg` y `node:async_hooks`. Exporta:
- **Cliente y Delegados**: `IndigoClientBase`, `ModelDelegate`, `RealtimeModelDelegate`, `LiveModelDelegate`, `currentQueryContext`
- **Adaptadores**: `createPgAdapter`, `createPGliteAdapter`, `DriverAdapter`, `Executor`, `TransactionHook`
- **Transacciones Diferidas**: `IndigoPromise`, `isIndigoPromise`, `defer`, `runDeferred`, `DeferredResults`
- **Errores**: `IndigoDatabaseError`, `withDatabaseErrors`, `IndigoRelationError`, `IndigoNestedWriteError`, `IndigoNotFoundError`, `IndigoTransactionError`, `IndigoLiveHandleError`
- **Tipos de Consulta y Metadatos**: `IndigoClientOptions`, `RealtimeOptions`, `QueryExtension`, `QueryContext`, `FindManyArgs`, `FindFirstArgs`, `FindUniqueArgs`, `CreateArgs`, `UpdateArgs`, `DeleteArgs`, `CountArgs`, `CreateManyArgs`, `UpdateManyArgs`, `DeleteManyArgs`, `AggregateArgs`, `GroupByArgs`, `UpsertArgs`, `WhereFilter`, `JsonFilter`, `RelationFilter`, `Payload`, `ExplainResult`, `ModelMeta`, `FieldMeta`, `RelationMeta`, `IndexMeta`

### `@indigodb/client/realtime` (Seguro en Navegador)

No importa módulos de Node ni `pg`; consume solo Web APIs y `@indigodb/realtime/protocol`. Exporta:
- **Suscripciones y Canales**: `createLiveSubscription`, `createWakeDebouncer`, `browserTransport`, `createChannel`, `RealtimeConnectionManager`, `SseTransport`
- **Constantes y Tipos**: `REALTIME_PATH`, `REALTIME_LOG_PATH`, `REALTIME_CHANNELS_PATH`, `REALTIME_BROADCAST_PATH`, `REALTIME_PRESENCE_PATH`, `REALTIME_METRICS_PATH`, `LIVE_DEBOUNCE_MS`, `LiveSubscription`, `LiveSubscriptionOptions`, `LiveSubscriptionStatus`, `LiveSubscriptionError`, `RealtimeChannel`, `ChannelOptions`, `ChannelStatus`, `PresenceMember`, `PresenceEvent`, `ChannelReady`, `BroadcastMessage`, `RealtimeMetrics`, `RealtimeTelemetryEvent`

---

## `@indigodb/realtime`

- **npm**: [`https://www.npmjs.com/package/@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) (`v0.1.1`)
- **Fuente**: [`packages/realtime`](https://github.com/chechooxd/indigo/tree/main/packages/realtime)

```bash
npm install @indigodb/realtime
```

### Entrada Raíz (Solo Servidor)

- **Motor**: `RealtimeEngine`, `DEFAULT_MAX_BUFFERED_BYTES`, `RealtimeEngineOptions`, `RealtimeLogDb`, `ChannelAuthContext`
- **Fuentes de Eventos**: `WalSource` (replicación lógica `pgoutput` por defecto), `WalSourceOptions`, `PgNotifySource`, `resolveSlotName`
- **Handles Firmados y Proyección**: `mintHandle`, `verifyHandle`, `DEFAULT_HANDLE_TTL_SECONDS`, `HandlePayload`, `project`, `projectionSet`

### `@indigodb/realtime/protocol`

Constantes de rutas HTTP y tipos de protocolo sin dependencias externas (`REALTIME_*_PATH`, `REALTIME_LOG_PAGE_SIZE`, `DEFAULT_PRESENCE_TTL_MS`, `MAX_CHANNEL_BODY_BYTES`, `RealtimeEvent`, `RealtimeWakeEvent`, `RealtimeLogPage`, `PresenceMember`, `BroadcastMessage`, `RealtimeMetrics`, `RealtimeTelemetryEvent`). Segura para importar en el navegador.

---

## `@indigodb/react`

- **npm**: [`https://www.npmjs.com/package/@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) (`v0.1.1`)
- **Fuente**: [`packages/react`](https://github.com/chechooxd/indigo/tree/main/packages/react)
- **Peer Dependency**: `react >= 18.0.0`

```bash
npm install @indigodb/react @indigodb/client
```

Exporta:
- **Hooks**: `useLiveTable`, `useChannel` (`UseLiveTableOptions`, `UseLiveTableResult`, `UseChannelOptions`, `UseChannelResult`)
- **Primitivas reexportadas seguras para navegador**: `createLiveSubscription`, `browserTransport`, `createChannel`, `LiveSubscription`, `RealtimeChannel`, `PresenceMember`, `BroadcastMessage`

---

## `@indigodb/cli`

- **npm**: [`https://www.npmjs.com/package/@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) (`v0.1.1`)
- **Fuente**: [`packages/cli`](https://github.com/chechooxd/indigo/tree/main/packages/cli)
- **Binario**: `indigodb` (`./dist/index.js`)

```bash
npm install -D @indigodb/cli
```

Incluye todos los subcomandos (`init`, `generate`, `db push`, `db pull`, `migrate dev/deploy/status/resolve`, `realtime`, `studio`) e incluye `@indigodb/studio` como dependencia de runtime para que `npx indigodb studio` funcione de inmediato.

---

## `@indigodb/studio`

- **npm**: [`https://www.npmjs.com/package/@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio) (`v0.1.1`)
- **Fuente**: [`apps/studio`](https://github.com/chechooxd/indigo/tree/main/apps/studio)

Empaqueta el SPA precompilado React 19 + React Flow + Monaco Editor (`dist/`). Se instala junto a `@indigodb/cli` y se resuelve vía `require.resolve("@indigodb/studio/package.json")` (personalizable con `INDIGODB_STUDIO_DIST`).

## Siguiente Paso

Comienza con la [Guía de Inicio Rápido](/indigodb/getting-started) o consulta la [Referencia CLI](/indigodb/cli/reference).
