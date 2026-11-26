---
title: Transacciones, Sesiones RLS, Extensiones y Adaptadores
navTitle: Transacciones, RLS y Adaptadores
description: Ejecuta transacciones interactivas o en arreglo, aplica Row-Level Security con $auth(), añade middleware QueryExtension, integra adaptadores pg/PGlite y maneja la taxonomía de errores tipados.
section: orm
order: 2
runtime: "Solo Servidor (Node.js >= 22)"
npmPackages:
  - "@indigodb/client"
---

[`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) proporciona límites transaccionales y de seguridad por sesión, middleware composable alrededor del ejecutor SQL y adaptadores intercambiables para PostgreSQL.

## Transacciones Interactivas y en Arreglo (`$transaction`)

El cliente `IndigoClient` generado soporta tanto callbacks interactivos como arreglos de operaciones diferidas.

### Forma Interactiva con Callback

```ts
const order = await db.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Usuario no encontrado");

  const created = await tx.order.create({
    data: { userId: user.id, totalCents: 4900 },
  });

  await tx.$queryRaw(`UPDATE "Inventory" SET qty = qty - 1 WHERE sku = $1`, ["SKU-1"]);
  return created;
});
```

> Las llamadas `$transaction` anidadas se rechazan explícitamente (`"IndigoClient: $transaction cannot be nested."`) para evitar ambigüedades de savepoints.

### Forma Secuencial en Arreglo

Cada método de delegado devuelve un `IndigoPromise<T>` diferido. Pasa un arreglo de operaciones sin `await` a `$transaction([...])` para ejecutarlas en una sola transacción conservando el tipado de tupla:

```ts
const [alice, bob, totalUsers] = await db.$transaction([
  db.user.create({ data: { email: "alice@acme.dev" } }),
  db.user.create({ data: { email: "bob@acme.dev" } }),
  db.user.count(),
]);
```

> `IndigoPromise` es de un solo uso: reutilizar o esperar dos veces la misma instancia lanza `IndigoTransactionError` (`code: "OPERATION_REUSED"`).

## Row-Level Security con `$auth()`

Cuando los modelos declaran reglas `@@allow(...)`, envuelve las consultas de usuario en `db.$auth({ userId }, async (tx) => ...)`:

```ts
const myDocs = await db.$auth({ userId: currentUser.id }, async (tx) => {
  return tx.document.findMany({
    orderBy: { id: "desc" },
  });
});
```

### Cómo Evita `$auth` Fugas en el Pool de Conexiones

1. `$auth` adquiere una transacción exclusiva a través de `$withSession`.
2. Antes de invocar tu callback, ejecuta de forma parametrizada `SELECT set_config('app.user_id', $1, true)`.
3. El parámetro `true` limita `app.user_id` estrictamente a esa transacción: al ejecutarse `COMMIT` o `ROLLBACK`, la configuración desaparece antes de devolver la conexión a `pg.Pool`.

## Middleware de Consultas (`QueryExtension`)

Intercepta todas las sentencias SQL ejecutadas (`db.<modelo>.*`, `$queryRaw` y sesiones dentro de `$transaction` / `$auth`) mediante `extensions`:

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
  extensions: [timingExtension], // extensions[0] es la capa más externa
});
```

- Las extensiones pueden inspeccionar o reescribir `(sql, params)`, devolver resultados en caché sin llamar a `next` u observar errores sin envoltura adicional.
- Los comandos de control `BEGIN`, `COMMIT` y `ROLLBACK` se ejecutan en el adaptador y omiten `extensions` intencionalmente.

## Adaptadores de Driver (`DriverAdapter`)

Por defecto, `IndigoClient` construye y gestiona un `pg.Pool` mediante `createPgAdapter`. Pasa la opción `db` para inyectar tu propio driver o pool:

### Reutilizar un `pg.Pool` Existente

```ts
import { createPgAdapter } from "@indigodb/client";
import { Pool } from "pg";
import { IndigoClient } from "./generated/indigo.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 20 });
const db = new IndigoClient({
  db: createPgAdapter({ pool }), // $disconnect() NO llamará a pool.end() porque el pool es tuyo
});
```

### PostgreSQL Embebido con PGlite (`createPGliteAdapter`)

Ideal para pruebas rápidas, entornos locales o herramientas embebidas sin levantar un daemon PostgreSQL:

```ts
import { createPGliteAdapter } from "@indigodb/client";
import { PGlite } from "@electric-sql/pglite";
import { IndigoClient } from "./generated/indigo.js";

const pglite = new PGlite();
const db = new IndigoClient({
  db: createPGliteAdapter(pglite), // pasa { close: true } para cerrar PGlite en $disconnect()
});
```

`createPGliteAdapter` delega `$transaction` y `$auth` a la API nativa `pglite.transaction(...)`.

### Drivers HTTP Serverless (ej. Neon)

Los drivers HTTP sin sesión persistente (como `neon(...)` de `@neondatabase/serverless`) ejecutan cada consulta en una petición HTTP aislada y no pueden garantizar transacciones multi-sentencia. Por ello IndigoDB no incluye un `createNeonAdapter` y falla explícitamente si se invoca `$transaction` / `$auth`:

```ts
import { neon } from "@neondatabase/serverless";
import { IndigoClient } from "./generated/indigo.js";

const sql = neon(process.env.DATABASE_URL!);

const db = new IndigoClient({
  db: {
    exec: async (query, params) => sql(query, params) as Promise<Record<string, unknown>[]>,
    // Sin `transaction`: `$transaction`/`$auth` rechazan de forma explícita
  },
});
```

Para cargas transaccionales sobre Neon, utiliza la cadena de conexión TCP con pooling junto a `createPgAdapter`.

## Jerarquía de Errores Tipados

| Clase de Error | Paquete | Códigos / Propiedades | Cuándo se Lanza |
| :--- | :--- | :--- | :--- |
| `IndigoDatabaseError` | `@indigodb/client` | `code`: `"UNIQUE_VIOLATION" \| "UNKNOWN"`, `sqlstate` | Errores SQLSTATE del driver PostgreSQL (ej. `23505`) |
| `IndigoNotFoundError` | `@indigodb/client` | `code`: `"RECORD_NOT_FOUND"`, `model`, `operation` | `update` o `delete` no encuentra filas |
| `IndigoWhereError` | `@indigodb/client` | `UNKNOWN_WHERE_KEY`, `NOT_MUST_BE_OBJECT`, `PATH_ON_NON_JSON_FIELD`, `EMPTY_WHERE` | Filtro `where` inválido o `where` vacío en `updateMany`/`deleteMany` |
| `IndigoArgumentError` | `@indigodb/client` | `EMPTY_BATCH`, `CURSOR_COMPOSITE_PK`, `CURSOR_NO_PK`, `NON_NUMERIC_AGGREGATE`, `UNKNOWN_AGGREGATE_FIELD`, `EMPTY_AGGREGATE`, `NO_MATCHING_UNIQUE_CONSTRAINT`, `EMPTY_UPDATE_DATA` | Forma de argumentos inválida detectada antes de emitir SQL |
| `IndigoNestedWriteError` | `@indigodb/client` | `UNKNOWN_FIELD`, `COMPOSITE_RELATION`, `CONNECT_NOT_FOUND`, `REQUIRED_RELATION_DISCONNECT`, `UNKNOWN_RELATION_OP`, `AMBIGUOUS_UPDATE_TARGET`, `NO_ATOMIC_SEAM` | Operación relacional anidada inválida (extiende `IndigoRelationError`) |
| `IndigoTransactionError` | `@indigodb/client` | `ARRAY_FORM_REQUIRES_GENERATED_CLIENT`, `NOT_A_DEFERRED_OPERATION`, `OPERATION_REUSED` | Uso inválido de `$transaction` o reutilización de `IndigoPromise` |

## Siguiente Paso

Conoce cómo evoluciona el esquema de base de datos con shadow replay y checksums en [Migraciones e Introspección](/indigodb/migrations/overview).
