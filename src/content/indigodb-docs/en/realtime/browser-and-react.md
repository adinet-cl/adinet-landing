---
title: Browser SDK, Live Queries & React Hooks
navTitle: Browser SDK & React Hooks
description: Subscribe to wake-only table invalidations, ephemeral Presence/Broadcast channels, React 18+ useLiveTable/useChannel hooks, and server-side live queries using @indigodb/client/realtime and @indigodb/react.
section: realtime
order: 2
runtime: "Browser-safe · React >= 18"
npmPackages:
  - "@indigodb/client"
  - "@indigodb/react"
---

IndigoDB separates **server ORM code** from **browser-safe realtime primitives** by design:

- **Browser-safe**: [`@indigodb/client/realtime`](https://www.npmjs.com/package/@indigodb/client) and [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) rely exclusively on standard Web APIs (`fetch`, `ReadableStream`, `TextDecoder`, `AbortController`, `URL`, `atob`)—zero `pg` or `node:*` imports.
- **Server-only**: The root `@indigodb/client` package and generated `indigo.ts` client must never be imported in client-side bundles.

## Browser Architecture: Wake + Refetch

IndigoDB does not allow direct unauthenticated database queries from browsers:

```text
  PostgreSQL Commit ──▶ WalSource ──▶ /api/realtime (wake frame: { table, op })
                                              │
                                              ▼
  Browser (@indigodb/react / @indigodb/client/realtime)
       │  1. Receives wake signal (debounced 50ms) or resync on reconnect
       ▼
  Your Authenticated Backend API (/api/orders, tRPC, GraphQL, etc.)
       │  2. Verifies user session & runs IndigoClient ($auth / findMany)
       ▼
  Fresh Authorized Rows Returned to UI
```

## Framework-Agnostic Browser SDK (`@indigodb/client/realtime`)

### Table Invalidation (`createLiveSubscription`)

`createLiveSubscription` manages a shared refcounted SSE connection per table across subscribers, debounces rapid write bursts (`LIVE_DEBOUNCE_MS = 50` ms first-wake-armed), classifies terminal HTTP errors (`401`, `403`, `404`), and fires `onResync` on reconnect:

```ts
import { createLiveSubscription, browserTransport } from "@indigodb/client/realtime";

const sub = createLiveSubscription({
  table: "Order",
  transport: browserTransport(), // uses window.location.origin (browser-only)
  onWake: () => refetchOrders(),
  onResync: () => refetchOrders(),
});

const stopListening = sub.subscribe(() => {
  console.log("Status:", sub.getStatus()); // "idle" | "connecting" | "live" | "error" | "closed"
  console.log("Error:", sub.getError());
});

// On unmount:
stopListening();
sub.close();
```

> **SSR note**: `browserTransport()` throws an explicit error if called on the server (`window` is undefined). For Node/SSR tests or custom origins, pass `new SseTransport("https://realtime.example.com")` explicitly.

### TanStack Query Integration Recipe

Wire `onWake` and `onResync` directly to `queryClient.invalidateQueries()` so TanStack Query owns fetching, caching, and retries:

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

### Ephemeral Channels (`createChannel`)

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

// Cleanup:
await room.untrack();
unsubMsg();
unsubState();
room.close();
```

## Official React Hooks (`@indigodb/react`)

Install [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) (`react >= 18.0.0` peer dependency) alongside `@indigodb/client`:

```bash
npm install @indigodb/react @indigodb/client
```

Both hooks are built on React's `useSyncExternalStore` with stable snapshot identities and SSR server snapshots (`"idle"` / `null` / `[]`), making them safe in Next.js App Router, Remix, and StrictMode.

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
        Reconnect ({error?.message})
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
    onBroadcast: (msg) => console.log("Event:", msg.event, msg.payload),
  });

  return (
    <div>
      <span>{status} · {members.length} online</span>
      <button type="button" onClick={() => void track({ role: "editor" })}>Join</button>
      <button type="button" onClick={() => void broadcast("ping", { ts: Date.now() })}>Ping</button>
      <button type="button" onClick={() => void untrack()}>Leave</button>
    </div>
  );
}
```

## Server-Side Live Queries (`findMany().live()`)

For backend services, workers, or SSR data pushers using the generated `IndigoClient`, models declared with **both `@@realtime` and `@@allow`** receive a `LiveModelDelegate` whose `findMany()` returns an `IndigoPromise` enhanced with `.live()`:

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
    onData: (rows) => console.log("Authorized snapshot:", rows.length),
    onStatus: (status) => console.log("Live status:", status),
    onError: (err) => console.error(err),
  });

// Later:
liveDocs.unsubscribe();
```

`.live()` bootstraps inside `db.$auth({ userId }, ...)` (enforcing PostgreSQL RLS), tails SSE wakes with 50ms trailing coalesced refetches, and retries handle validation once before surfacing errors.

## Next Step

Explore the visual workspace and security guardrails in [IndigoDB Studio](/indigodb/studio/workspace-and-security) or review every CLI flag in [CLI Reference](/indigodb/cli/reference).
