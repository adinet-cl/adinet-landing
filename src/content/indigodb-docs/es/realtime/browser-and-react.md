---
title: SDK Navegador, Live Queries y Hooks de React
navTitle: SDK Navegador y React
description: Suscríbete a invalidaciones wake-only, canales efímeros Presence/Broadcast, hooks useLiveTable/useChannel para React 18+ y live queries en servidor con @indigodb/client/realtime y @indigodb/react.
section: realtime
order: 2
runtime: "Seguro en Navegador · React >= 18"
npmPackages:
  - "@indigodb/client"
  - "@indigodb/react"
---

IndigoDB separa estrictamente el **código ORM de servidor** de las **primitivas en tiempo real seguras para navegador**:

- **Seguro en navegador**: [`@indigodb/client/realtime`](https://www.npmjs.com/package/@indigodb/client) y [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) usan exclusivamente Web APIs estándar (`fetch`, `ReadableStream`, `TextDecoder`, `AbortController`, `URL`, `atob`), sin ninguna dependencia de `pg` ni `node:*`.
- **Solo servidor**: El paquete raíz `@indigodb/client` y el cliente generado `indigo.ts` nunca deben importarse en bundles de cliente.

## Arquitectura en Navegador: Despertar + Refetch

IndigoDB no permite consultas directas sin autenticación desde el navegador hacia PostgreSQL:

```text
  Commit PostgreSQL ──▶ WalSource ──▶ /api/realtime (wake frame: { table, op })
                                              │
                                              ▼
  Navegador (@indigodb/react / @indigodb/client/realtime)
       │  1. Recibe señal wake (debounce 50ms) o resync al reconectar
       ▼
  Tu API Backend Autenticada (/api/orders, tRPC, GraphQL, etc.)
       │  2. Valida sesión y ejecuta IndigoClient ($auth / findMany)
       ▼
  Filas Autorizadas Devueltas a la UI
```

## SDK Agnostico de Framework (`@indigodb/client/realtime`)

### Invalidación de Tablas (`createLiveSubscription`)

`createLiveSubscription` comparte una conexión SSE con conteo de referencias por tabla entre todos los suscriptores, aplica debounce sobre ráfagas (`LIVE_DEBOUNCE_MS = 50` ms desde el primer wake), clasifica errores HTTP terminales (`401`, `403`, `404`) y dispara `onResync` tras una reconexión:

```ts
import { createLiveSubscription, browserTransport } from "@indigodb/client/realtime";

const sub = createLiveSubscription({
  table: "Order",
  transport: browserTransport(), // lee window.location.origin (solo navegador)
  onWake: () => refetchOrders(),
  onResync: () => refetchOrders(),
});

const stopListening = sub.subscribe(() => {
  console.log("Estado:", sub.getStatus()); // "idle" | "connecting" | "live" | "error" | "closed"
  console.log("Error:", sub.getError());
});

// Al desmontar:
stopListening();
sub.close();
```

> **Nota SSR**: `browserTransport()` lanza un error explícito si se invoca en el servidor (`window` indefinido). Para pruebas en Node/SSR u orígenes personalizados, pasa `new SseTransport("https://realtime.example.com")`.

### Receta con TanStack Query

Conecta `onWake` y `onResync` a `queryClient.invalidateQueries()` para que TanStack Query gestione caché, reintentos y refetch:

```tsx
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createLiveSubscription, browserTransport } from "@indigodb/client/realtime";

export function useOrderInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const sub = createLiveSubscription({
      table: "Order",
      transport: browserTransport(),
      onWake: () => void queryClient.invalidateQueries({ queryKey: ["orders"] }),
      onResync: () => void queryClient.invalidateQueries({ queryKey: ["orders"] }),
    });
    const unsub = sub.subscribe(() => {});
    return () => {
      unsub();
      sub.close();
    };
  }, [queryClient]);
}
```

### Canales Efímeros (`createChannel`)

```ts
import { createChannel } from "@indigodb/client/realtime";

const room = createChannel({
  baseUrl: window.location.origin,
  channel: "doc:42",
  clientId: "user-alice",
  headers: { Authorization: `Bearer ${token}` },
});

const unsubState = room.subscribe(() => {
  console.log(room.getStatus(), room.getMembers());
});

const unsubMsg = room.onBroadcast<{ cursor: [number, number] }>("cursor", (msg) => {
  console.log(msg.senderId, msg.payload);
});

await room.track({ name: "Alice", color: "#59B0C8" });
await room.broadcast("cursor", { cursor: [120, 340] });

// Limpieza:
await room.untrack();
unsubMsg();
unsubState();
room.close();
```

## Hooks Oficiales para React (`@indigodb/react`)

Instala [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) (`react >= 18.0.0` peer dependency) junto a `@indigodb/client`:

```bash
npm install @indigodb/react @indigodb/client
```

Ambos hooks utilizan `useSyncExternalStore` con identidades de snapshot estables y valores de servidor seguros para SSR (`"idle"` / `null` / `[]`), compatibles con Next.js App Router, Remix y React StrictMode.

### `useLiveTable(table, options)`

```tsx
import { useLiveTable, browserTransport } from "@indigodb/react";

const transport = typeof window !== "undefined" ? browserTransport() : undefined;

export function OrdersStatusBadge({ refetch }: { refetch: () => void }) {
  const { status, error, retry } = useLiveTable("Order", {
    transport: transport!,
    enabled: Boolean(transport),
    onWake: refetch,
    onResync: refetch,
  });

  if (status === "error") {
    return (
      <button type="button" onClick={retry}>
        Reconectar ({error?.message})
      </button>
    );
  }

  return <span>Live: {status}</span>;
}
```

### `useChannel(channelName, options)`

```tsx
import { useChannel } from "@indigodb/react";

export function CollaborationBar({ docId, userId }: { docId: string; userId: string }) {
  const { status, members, track, untrack, broadcast } = useChannel(`doc:${docId}`, {
    baseUrl: typeof window !== "undefined" ? window.location.origin : "",
    clientId: userId,
    enabled: typeof window !== "undefined",
    onBroadcast: (msg) => console.log("Evento:", msg.event, msg.payload),
  });

  return (
    <div>
      <span>{status} · {members.length} en línea</span>
      <button type="button" onClick={() => void track({ role: "editor" })}>Entrar</button>
      <button type="button" onClick={() => void broadcast("ping", { ts: Date.now() })}>Ping</button>
      <button type="button" onClick={() => void untrack()}>Salir</button>
    </div>
  );
}
```

## Live Queries en Servidor (`findMany().live()`)

Para servicios backend o workers que usan el `IndigoClient` generado, los modelos que declaran **tanto `@@realtime` como `@@allow`** exponen `LiveModelDelegate`, cuyo `findMany()` añade `.live()`:

```ts
import { mintHandle } from "@indigodb/realtime";
import { IndigoClient } from "./generated/indigo.js";

const db = new IndigoClient({
  realtime: {
    url: process.env.INDIGO_REALTIME_URL ?? "http://localhost:4477",
    getHandle: async (table) =>
      mintHandle({ table, userId: currentUserId }, process.env.INDIGODB_REALTIME_SECRET!),
  },
});

const liveDocs = db.document
  .findMany({ where: { archived: false }, orderBy: { id: "desc" } })
  .live({
    onData: (rows) => console.log("Snapshot autorizado:", rows.length),
    onStatus: (status) => console.log("Estado live:", status),
    onError: (err) => console.error(err),
  });

// Más tarde:
liveDocs.unsubscribe();
```

`.live()` carga el snapshot inicial dentro de `db.$auth({ userId }, ...)` (aplicando RLS en PostgreSQL), escucha señales wake SSE con refetch coalescido cada 50 ms y reintenta la validación del handle una vez antes de reportar errores.

## Siguiente Paso

Explora el entorno visual y sus controles de seguridad en [IndigoDB Studio y Guardas](/indigodb/studio/workspace-and-security) o consulta todas las opciones en la [Referencia CLI](/indigodb/cli/reference).
