---
title: ORM Queries, Relations, Mutations & Aggregations
navTitle: Queries & Mutations
description: Use the generated TypeScript IndigoClient (@indigodb/client + @indigodb/generator) for type-narrowed queries, logical/JSON/relation filtering, cursor pagination, nested writes, batch mutations, upsert, aggregate, groupBy, and explain().
section: orm
order: 1
runtime: "Server-only (Node.js >= 22)"
npmPackages:
  - "@indigodb/client"
  - "@indigodb/generator"
---

When you run `npx indigodb generate`, [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) emits a self-contained `indigo.ts` client that extends `IndigoClientBase` from [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) and exposes one typed delegate per model (`db.user`, `db.post`, etc.).

> **Server-only runtime**: `@indigodb/client` (root entry) and your generated `indigo.ts` client statically import `pg` and `node:async_hooks`. Never import them in browser bundles—use [`@indigodb/client/realtime` or `@indigodb/react`](/indigodb/realtime/browser-and-react) for frontend code.

## Initializing `IndigoClient`

```ts
import { IndigoClient } from "./generated/indigo.js";

const db = new IndigoClient({
  connectionString: process.env.DATABASE_URL, // optional: defaults to DATABASE_URL
  log: process.env.NODE_ENV === "development", // logs SQL with $1=<redacted>
});
```

Every SQL query uses positional `$1, $2, ...` bind parameters. When `log: true` is enabled, parameter values are never printed—only `$1=<redacted>` arity placeholders.

## Reading Data (`findMany`, `findFirst`, `findUnique`)

```ts
// List with filtering, sorting, and pagination
const posts = await db.post.findMany({
  where: { published: true },
  orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  take: 20,
  skip: 0,
});

// First matching record or null
const latest = await db.post.findFirst({
  where: { authorId: user.id },
  orderBy: { createdAt: "desc" },
});

// Unique lookup
const byEmail = await db.user.findUnique({
  where: { email: "alice@acme.dev" },
});
```

### Type-Safe `select` and `include`

`Payload<Row, Rel, Args>` narrows the TypeScript return type at compile time to match the exact fields you `select` and relations you `include`:

```ts
const users = await db.user.findMany({
  select: { id: true, email: true },
  include: {
    posts: {
      select: { id: true, title: true },
    },
  },
});
// Inferred element type: { id: string; email: string; posts: { id: number; title: string }[] }
```

- Relations are loaded via batched-by-key follow-up queries (`WHERE fk = ANY($1)`), avoiding SQL join row multiplication.
- `include` is one level deep and supports single-column foreign keys (composite-key relations are rejected at both compile time and runtime with `IndigoRelationError`).

## Expressive `where` Filtering

### Scalar & String Operators

```ts
const matches = await db.user.findMany({
  where: {
    age: { gte: 18, lt: 65 },
    role: { in: ["ADMIN", "USER"] },
    deletedAt: { equals: null }, // compiles to IS NULL
    status: { not: "BANNED" },   // preserves NULL rows: (status <> $1 OR status IS NULL)
    email: { contains: "100%" }, // literal ILIKE match — %, _, \ are automatically escaped
  },
});
```

Supported scalar operators on `WhereFilter<T>`:
- `equals`, `not` (`not: null` → `IS NOT NULL`; `not: val` includes `NULL` rows like Prisma)
- `in`, `notIn` (compiled to `= ANY($1)` / `(<> ALL($1) OR IS NULL)`)
- `lt`, `lte`, `gt`, `gte`
- `contains`, `startsWith`, `endsWith` (case-insensitive `ILIKE` with automatic `%`, `_`, `\` escaping)

### Logical Composition (`AND`, `OR`, `NOT`)

```ts
const filtered = await db.post.findMany({
  where: {
    AND: [
      { published: true },
      {
        OR: [
          { title: { startsWith: "Release" } },
          { views: { gte: 1000 } },
        ],
      },
    ],
    NOT: { archived: true },
  },
});
```

### To-Many Relation Filters (`some`, `every`, `none`)

```ts
const activeAuthors = await db.user.findMany({
  where: {
    posts: {
      some: { published: true },
      none: { flagged: true },
    },
  },
});
```

Compiles to correlated `EXISTS` / `NOT EXISTS` subqueries against the target table.

### JSON Path Filters (`JsonFilter`)

For `Json` (`jsonb`) columns, filter by `path` segments with `#>` and `#>>` operators:

```ts
const proAccounts = await db.account.findMany({
  where: {
    metadata: {
      path: ["plan", "tier"],
      equals: "enterprise",
    },
  },
});

const highUsage = await db.account.findMany({
  where: {
    metadata: {
      path: ["limits", "seats"],
      gte: 10, // automatically casts (#>> ...)::numeric when operand is a number
    },
  },
});

const tagged = await db.account.findMany({
  where: {
    metadata: {
      path: [],
      jsonContains: { verified: true }, // @> jsonb containment
    },
  },
});
```

## Keyset Cursor Pagination & `distinct`

Single-column-PK models expose typed `cursor` pagination (`{ <pk>: value }`):

```ts
const page2 = await db.post.findMany({
  cursor: { id: lastSeenId },
  take: 25,
  // `skip` defaults to 1 when `cursor` is provided so the cursor row itself is skipped
});
```

Use `distinct` (`SELECT DISTINCT ON (...)`) to return at most one row per distinct field tuple:

```ts
const latestPerAuthor = await db.post.findMany({
  distinct: ["authorId"],
  orderBy: [{ authorId: "asc" }, { createdAt: "desc" }],
});
```

## Single-Row & Nested Writes (`create`, `update`, `upsert`, `delete`)

### Nested Relation Writes

`create` and `update` support transactional nested relation operations (`create`, `connect`, `connectOrCreate`, plus `disconnect` and `set` on optional relations during `update`). Top-level nested writes automatically wrap all steps inside `$transaction`:

```ts
const newUser = await db.user.create({
  data: {
    email: "bob@acme.dev",
    profile: {
      create: { bio: "Staff Architect" },
    },
    posts: {
      create: [{ title: "Hello IndigoDB" }],
    },
  },
});
```

### `update`, `delete`, and `upsert`

`update` and `delete` restrict `where` to declared unique selectors (`<Model>WhereUniqueInput`) and throw `IndigoNotFoundError` (`code: "RECORD_NOT_FOUND"`) when zero rows match:

```ts
const updated = await db.user.update({
  where: { id: newUser.id },
  data: { name: "Bob Ross" },
});

const upserted = await db.user.upsert({
  where: { email: "bob@acme.dev" },
  create: { email: "bob@acme.dev", name: "Bob" },
  update: { name: "Bob Updated" },
});
```

## Batch Mutations (`createMany`, `updateMany`, `deleteMany`)

Batch mutations execute in a single SQL statement and return `{ count: number }`. To prevent accidental whole-table mutations, `updateMany` and `deleteMany` reject empty `{}` `where` objects with `IndigoWhereError` (`code: "EMPTY_WHERE"`).

```ts
const inserted = await db.post.createMany({
  data: [
    { title: "Post 1", authorId: newUser.id },
    { title: "Post 2", authorId: newUser.id },
  ],
});

const archived = await db.post.updateMany({
  where: { authorId: newUser.id },
  data: { published: false },
});
```

## Aggregations (`count`, `aggregate`, `groupBy`)

Numeric fields (`Int`, `Float`, `Decimal`, `BigInt`) unlock `_sum` and `_avg` at compile time (`<Model>NumericFields`), while `_min` and `_max` work on any scalar field:

```ts
const total = await db.order.count({ where: { status: "PAID" } });

const stats = await db.order.aggregate({
  where: { status: "PAID" },
  _count: true,
  _sum: { amountCents: true },
  _avg: { amountCents: true },
  _max: { createdAt: true },
});

const byStatus = await db.order.groupBy({
  by: ["status"],
  _count: true,
  _sum: { amountCents: true },
});
```

## Query Plan Analysis (`explain`)

Inspect the live PostgreSQL execution plan (`EXPLAIN (FORMAT JSON)`) for any `findMany` query to verify index usage before shipping:

```ts
const plan = await db.post.explain({
  where: { authorId: newUser.id },
  orderBy: { createdAt: "desc" },
});

console.log({
  usesIndex: plan.usesIndex,
  indexNames: plan.indexNames,
  scanTypes: plan.scanTypes,
  totalCost: plan.totalCost,
});
```

## Raw Parameterized SQL (`$queryRaw`)

```ts
const rows = await db.$queryRaw<{ count: string }>(
  `SELECT count(*) AS count FROM "Post" WHERE author_id = $1`,
  [newUser.id],
);
```

## Next Step

Learn how to compose `$transaction`, `$auth` Row-Level Security sessions, `QueryExtension` middleware, PGlite/pg driver adapters, and typed error handling in [Transactions, RLS & Driver Adapters](/indigodb/orm/transactions-rls-and-adapters).
