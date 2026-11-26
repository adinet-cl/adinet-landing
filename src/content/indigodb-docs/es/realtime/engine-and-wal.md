---
title: Motor Tiempo Real, Replicación WAL y Canales
navTitle: Motor Tiempo Real y WAL
description: Transmite cambios por replicación lógica PostgreSQL (pgoutput) sobre SSE, sirve logs RLS con handles firmados, aloja canales Presence/Broadcast y supervisa métricas con @indigodb/realtime.
section: realtime
order: 1
runtime: "PostgreSQL WAL (pgoutput) · Node.js >= 22"
npmPackages:
  - "@indigodb/realtime"
  - "@indigodb/cli"
---

[`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) impulsa la capa en tiempo real de IndigoDB directamente sobre `node:http` sin acoplarse a ningún framework HTTP. Conecta el Write-Ahead Log de PostgreSQL (`pgoutput`) con streams SSE livianos, logs de reproducción filtrados por RLS, canales efímeros de Presence/Broadcast y métricas operativas.

## Prerrequisitos en PostgreSQL (`@@realtime`)

`WalSource` (la fuente por defecto) consume un slot de replicación lógica usando `pgoutput`. Tanto `indigodb db push` como `indigodb migrate deploy` validan automáticamente dos requisitos en PostgreSQL:

1. **`wal_level = logical`**: Configurado en `postgresql.conf` o con `ALTER SYSTEM SET wal_level = logical;` seguido de reinicio de PostgreSQL.
2. **Privilegio `REPLICATION`**: El rol de conexión debe ser superusuario o poseer `REPLICATION` (`ALTER ROLE <usuario> REPLICATION;`).

Cada tabla `@@realtime` recibe además `REPLICA IDENTITY FULL` (para incluir el registro `old` completo en `UPDATE` y `DELETE`) y una publicación/slot llamado `indigo_realtime` por defecto (personalizable con `INDIGODB_REALTIME_SLOT`, validado contra `/^[a-z0-9_]{1,63}$/`).

> La fuente heredada v1 basada en `LISTEN`/`NOTIFY` (`PgNotifySource`) sigue exportada para casos especiales, mientras que `WalSource` es el estándar por defecto porque conserva eventos confirmados durante desconexiones e incluye el LSN de commit.

## Ejecutar el Servidor en Tiempo Real

### Opción 1: Daemon Independiente por CLI

```bash
# Requerido cuando el esquema combina @@realtime + @@allow
export INDIGODB_REALTIME_SECRET="$(openssl rand -hex 32)"

npx indigodb realtime \
  --port 4477 \
  --allow-origin https://app.example.com
```

### Opción 2: Embebido en Tu Servidor HTTP Node.js

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
  maxBufferedBytes: 1_048_576, // límite de expulsión por contrapresión (1 MiB)
  presenceTtlMs: 30_000,
  onTelemetry: (ev) => console.log(JSON.stringify(ev)),
  authorizeChannel: async (req, ctx) => {
    // Hook opcional para autenticar canales Presence / Broadcast
    return Boolean(req.headers.authorization);
  },
});

await engine.start();

const server = createServer();
engine.attach(server); // monta las 6 rutas /api/realtime*
server.listen(4477);
```

## Rutas HTTP y Protocolo de Red

Las constantes están exportadas tanto en [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) como en la subruta segura para navegador [`@indigodb/realtime/protocol`](/indigodb/packages/runtime-and-ui#indigodbrealtimeprotocol):

| Constante | Ruta por Defecto | Método | Propósito |
| :--- | :--- | :--- | :--- |
| `REALTIME_PATH` | `/api/realtime` | `GET` | Stream SSE wake-only sin autenticación (`?tables=ModeloA,ModeloB`) |
| `REALTIME_LOG_PATH` | `/api/realtime/log` | `GET` | Log paginado bajo RLS con handle firmado (`?handle=...&offset=...`, 500 filas/página) |
| `REALTIME_CHANNELS_PATH` | `/api/realtime/channels` | `GET` | Stream SSE de canales efímeros Presence + Broadcast (`?channel=<nombre>[&clientId=<id>]`) |
| `REALTIME_BROADCAST_PATH` | `/api/realtime/channels/broadcast` | `POST` | Publicar evento broadcast efímero (`{ channel, event, payload, senderId? }`) |
| `REALTIME_PRESENCE_PATH` | `/api/realtime/channels/presence` | `POST` | Registrar/retirar estado de presencia (`{ channel, clientId, action, state? }`) |
| `REALTIME_METRICS_PATH` | `/api/realtime/metrics` | `GET` | Métricas operativas JSON (`Cache-Control: no-store`, cero secretos ni filas) |

## Modelo de Seguridad: SSE Wake-Only y Handles Firmados

### 1. Los Eventos SSE Nunca Contienen Datos de Filas

El endpoint `/api/realtime` no requiere autenticación y **nunca envía datos `new` ni `old`** para ninguna tabla. Cada transacción confirmada emite:
- `event: ready` inicial con `{ tables: string[] }`
- `event: wake` por cambio con `{ table, op, lsn?, seq? }`
- Comentarios `:ping` cada `heartbeatMs` (`25_000` ms por defecto) para evitar cortes por inactividad de proxies

Los clientes reaccionan a `wake` consultando tu backend autenticado o `/api/realtime/log`.

### 2. Handles Firmados en Servidor (`mintHandle` / `verifyHandle`)

Para modelos con `@@realtime` + `@@allow`, tu backend autenticado emite handles de vida corta firmados con HMAC-SHA256 vinculados a `{ table, userId, exp }` mediante `mintHandle`:

```ts
import { mintHandle, DEFAULT_HANDLE_TTL_SECONDS } from "@indigodb/realtime";

const handle = mintHandle(
  { table: "Message", userId: currentUser.id, ttl: DEFAULT_HANDLE_TTL_SECONDS },
  process.env.INDIGODB_REALTIME_SECRET!,
);
```

Al consultar `GET /api/realtime/log?handle=<token>&offset=0`, `RealtimeEngine` verifica el HMAC con `timingSafeEqual` (devolviendo `401 Unauthorized` opaco ante cualquier fallo), fija `app.user_id` dentro de una transacción `READ ONLY` y retorna hasta `REALTIME_LOG_PAGE_SIZE` (`500`) filas de `_indigo_realtime_log` autorizadas para ese usuario.

### 3. Lista Blanca CORS Cerrada por Defecto

Si `allowedOrigins` (o `--allow-origin` / `INDIGODB_REALTIME_ALLOWED_ORIGINS`) se omite o queda vacío, **toda petición cross-origin desde navegador se rechaza con `403`** (`realtime: origin not allowed`). Las peticiones sin cabecera `Origin` (backends, `curl`, Studio mismo origen) siempre se admiten. La comparación es igualdad exacta en minúsculas (`scheme://host[:port]`).

## Canales Efímeros de Presence y Broadcast

Los canales operan completamente en memoria (sin escrituras en Postgres), validan nombres contra `/^[A-Za-z0-9_.:-]{1,128}$/` y limitan el cuerpo POST a `MAX_CHANNEL_BODY_BYTES` (`65_536` bytes):

- **Presence**: Mantiene miembros en línea por canal con expiración automática `presenceTtlMs` (`30_000` ms por defecto) y emisión inmediata de `presence_leave` al desconectar el SSE.
- **Broadcast**: Distribuye `{ channel, event, payload, senderId, ts }` hacia todos los suscriptores SSE del canal y listeners locales `engine.onBroadcast(...)`.
- **Autorización**: Configura `authorizeChannel(req, { channel, action, clientId })` para validar JWT o cookies antes de admitir suscripciones, envíos o trackeo.

## Observabilidad y Contrapresión

- **Expulsión de consumidores lentos**: Antes de escribir en cualquier socket SSE, `RealtimeEngine` evalúa `socket.writableLength`. Si supera `maxBufferedBytes` (`1_048_576` bytes = 1 MiB por defecto), expulsa al suscriptor lento, incrementa `subscribers.totalEvicted` y emite un evento `subscriber_evicted`.
- **Telemetría estructurada**: `onTelemetry` emite eventos tipados (`subscriber_connect`, `subscriber_disconnect`, `subscriber_evicted`, `event_dispatched`, `log_page`, `broadcast`, `presence_change`, `error`) sin payloads ni secretos.
- **Métricas**: `engine.getMetrics()` y `GET /api/realtime/metrics` exponen `uptimeMs`, `subscribers`, `events.byTable`, `events.byOp`, `events.lastLsn`, `log` y `channels`.

## Siguiente Paso

Aprende cómo consumen estos streams los navegadores y componentes React en [SDK Navegador y Hooks React](/indigodb/realtime/browser-and-react).
