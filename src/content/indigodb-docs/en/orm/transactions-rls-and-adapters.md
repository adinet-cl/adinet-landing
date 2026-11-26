---
title: Transactions, RLS Sessions, Extensions & Adapters
navTitle: Transactions, RLS & Adapters
description: Run interactive or array-form transactions, scope PostgreSQL Row-Level Security with $auth(), add QueryExtension middleware, plug in pg/PGlite DriverAdapters, and handle IndigoDB's typed error hierarchy.
section: orm
order: 2
runtime: "Server-only (Node.js >= 22)"
npmPackages:
  - "@indigodb/client"
---

[`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) gives you composable session boundaries for transactions and Row-Level Security, middleware around the SQL executor, and pluggable PostgreSQL driver adapters.

## Interactive & Array Transactions (`$transaction`)

The generated `IndigoClient` supports both interactive callbacks and sequential deferred operation arrays.

### Interactive Callback Form

```ts
const order = await db.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const created = await tx.order.create({
    data: { userId: user.id, totalCents: 4900 },
  });

  await tx.$queryRaw(`UPDATE "Inventory" SET qty = qty - 1 WHERE sku = $1`, ["SKU-1"]);
  return created;
});
```

> Nested `$transaction` calls are rejected with `"IndigoClient: $transaction cannot be nested."` to avoid silent savepoint surprises.

### Sequential Array Form

Delegate methods return a lazy `IndigoPromise<T>`. Pass an array of unawaited operations to `$transaction([...])` to execute them sequentially inside a single transaction and preserve tuple return types:

```ts
const [alice, bob, totalUsers] = await db.$transaction([
  db.user.create({ data: { email: "alice@acme.dev" } }),
  db.user.create({ data: { email: "bob@acme.dev" } }),
  db.user.count(),
]);
```

> `IndigoPromise` is single-use: awaiting or reusing the same operation instance twice throws `IndigoTransactionError` (`code: "OPERATION_REUSED"`). Passing non-deferred values to `$transaction([...])` throws `NOT_A_DEFERRED_OPERATION`.

## Row-Level Security with `$auth()`

When models declare `@@allow(...)` rules, wrap user-scoped queries in `db.$auth({ userId }, async (tx) => ...)`:

```ts
const myDocs = await db.$auth({ userId: currentUser.id }, async (tx) => {
  return tx.document.findMany({
    orderBy: { id: "desc" },
  });
});
```

### How `$auth` Prevents Connection-Pool Leaks

1. `$auth` acquires an exclusive transaction via `$withSession` (enforcing the same single-transaction nesting guard).
2. Before running your callback, it executes a **parameterized** `SELECT set_config('app.user_id', $1, true)`.
3. The third argument `true` scopes `app.user_id` strictly to the current PostgreSQL transaction—when `COMMIT` or `ROLLBACK` runs, the setting disappears automatically before the connection returns to `pg.Pool`.

## Query Extensions Middleware (`QueryExtension`)

Wrap every executed SQL query (`db.<model>.*`, `$queryRaw`, and session queries inside `$transaction` / `$auth`) by passing `extensions` to `IndigoClient`:

```ts
import type { QueryExtension } from "@indigodb/client";
import { currentQueryContext } from "@indigodb/client";

const timingExtension: QueryExtension = (next) => async (sql, params) => {
  const ctx = currentQueryContext(); // { model: "User", operation: "findMany" } | undefined
  const start = performance.now();
  try {
    return await next(sql, params);
  } finally {
    const ms = (performance.now() - start).toFixed(2);
    console.debug(`[${ctx?.model ?? "raw"}.${ctx?.operation ?? "sql"}] ${ms}ms`);
  }
};

const db = new IndigoClient({
  extensions: [timingExtension], // extensions[0] is outermost
});
```

- Extensions can inspect/rewrite `(sql, params)`, short-circuit and return cached rows without calling `next`, or observe errors unwrapped.
- `BEGIN`, `COMMIT`, and `ROLLBACK` lifecycle statements are issued by the driver adapter directly and intentionally bypass `extensions`.

## Driver Adapters (`DriverAdapter`)

By default, `IndigoClient` constructs and owns a `pg.Pool` via `createPgAdapter`. Pass `db` to plug in your own driver or pool lifecycle:

### Reusing an Existing `pg.Pool`

```ts
import { createPgAdapter } from "@indigodb/client";
import { Pool } from "pg";
import { IndigoClient } from "./generated/indigo.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const db = new IndigoClient({
  db: createPgAdapter({ pool }), // $disconnect() will NOT call pool.end() since you own the pool
});
```

### Embedded PostgreSQL via PGlite (`createPGliteAdapter`)

Ideal for fast unit tests, local sandboxes, or embedded tools without running a Postgres daemon:

```ts
import { createPGliteAdapter } from "@indigodb/client";
import { PGlite } from "@electric-sql/pglite";
import { IndigoClient } from "./generated/indigo.js";

const pglite = new PGlite();
const db = new IndigoClient({
  db: createPGliteAdapter(pglite), // pass { close: true } to close PGlite on $disconnect()
});
```

`createPGliteAdapter` delegates `$transaction` and `$auth` to PGlite's native `pglite.transaction(...)` concurrency-safe mechanism.

### Serverless HTTP Drivers (e.g. Neon)

HTTP single-request drivers (such as `@neondatabase/serverless`'s `neon(...)` function) do not maintain persistent sessions and cannot honor `DriverAdapter.transaction`. IndigoDB deliberately omits a built-in HTTP adapter so `$transaction` / `$auth` fail loudly instead of silently dropping ACID guarantees:

```ts
import { neon } from "@neondatabase/serverless";
import { IndigoClient } from "./generated/indigo.js";

const sql = neon(process.env.DATABASE_URL!);

const db = new IndigoClient({
  db: {
    exec: async (query, params) => sql(query, params) as Promise<Record<string, unknown>[]>,
    // No `transaction` hook: $transaction/$auth will reject explicitly
  },
});
```

For transactional workloads on serverless Postgres, use a pooled TCP connection string with `createPgAdapter`.

## Typed Error Hierarchy

Handle failures programmatically using IndigoDB's exported error classes:

| Error Class | Package | `code` Values / Properties | When Thrown |
| :--- | :--- | :--- | :--- |
| `IndigoDatabaseError` | `@indigodb/client` | `code`: `"UNIQUE_VIOLATION" \| "UNKNOWN"`, `sqlstate` | PostgreSQL driver SQLSTATE errors (e.g. `23505`) |
| `IndigoNotFoundError` | `@indigodb/client` | `code`: `"RECORD_NOT_FOUND"`, `model`, `operation` | `update` or `delete` matches zero rows |
| `IndigoWhereError` | `@indigodb/client` | `UNKNOWN_WHERE_KEY`, `NOT_MUST_BE_OBJECT`, `PATH_ON_NON_JSON_FIELD`, `EMPTY_WHERE` | Invalid `where` shape or empty `updateMany`/`deleteMany` filter |
| `IndigoArgumentError` | `@indigodb/client` | `EMPTY_BATCH`, `CURSOR_COMPOSITE_PK`, `CURSOR_NO_PK`, `NON_NUMERIC_AGGREGATE`, `UNKNOWN_AGGREGATE_FIELD`, `EMPTY_AGGREGATE`, `NO_MATCHING_UNIQUE_CONSTRAINT`, `EMPTY_UPDATE_DATA` | Invalid method argument shape caught before SQL execution |
| `IndigoNestedWriteError` | `@indigodb/client` | `UNKNOWN_FIELD`, `COMPOSITE_RELATION`, `CONNECT_NOT_FOUND`, `REQUIRED_RELATION_DISCONNECT`, `UNKNOWN_RELATION_OP`, `AMBIGUOUS_UPDATE_TARGET`, `NO_ATOMIC_SEAM` | Invalid nested relation operation (extends `IndigoRelationError`) |
| `IndigoTransactionError` | `@indigodb/client` | `ARRAY_FORM_REQUIRES_GENERATED_CLIENT`, `NOT_A_DEFERRED_OPERATION`, `OPERATION_REUSED` | Invalid `$transaction` invocation or reused `IndigoPromise` |

## Next Step

Learn how IndigoDB manages schema evolution, shadow replay, checksums, and introspections in [Migrations & Introspection](/indigodb/migrations/overview).
