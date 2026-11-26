---
title: Consultas, Relaciones, Mutaciones y Agregaciones ORM
navTitle: Consultas y Mutaciones
description: Utiliza el cliente IndigoClient generado (@indigodb/client + @indigodb/generator) para consultas con tipos estrictos, composición lógica/JSON/relacional, paginación por cursor, escrituras anidadas, lotes, upsert, aggregate, groupBy y explain().
section: orm
order: 1
runtime: "Solo Servidor (Node.js >= 22)"
npmPackages:
  - "@indigodb/client"
  - "@indigodb/generator"
---

Al ejecutar `npx indigodb generate`, [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) genera un archivo `indigo.ts` autocontenido que extiende `IndigoClientBase` de [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) con un delegado tipado por cada modelo (`db.user`, `db.post`, etc.).

> **Runtime exclusivo de servidor**: El punto de entrada raíz `@indigodb/client` y tu cliente generado `indigo.ts` importan `pg` y `node:async_hooks` estáticamente. Nunca los importes en código de navegador; usa [`@indigodb/client/realtime` o `@indigodb/react`](/indigodb/realtime/browser-and-react) en el frontend.

## Inicializar `IndigoClient`

```ts
import { IndigoClient } from "./generated/indigo.js";

const db = new IndigoClient({
  connectionString: process.env.DATABASE_URL, // opcional: lee DATABASE_URL por defecto
  log: process.env.NODE_ENV === "development", // imprime SQL con $1=<redacted>
});
```

Todas las consultas utilizan parámetros posicionales `$1, $2, ...`. Con `log: true`, los valores vinculados nunca se imprimen en consola: solo se muestra su aridad como `$1=<redacted>`.

## Lecturas (`findMany`, `findFirst`, `findUnique`)

```ts
// Listado con filtros, orden y paginación
const posts = await db.post.findMany({
  where: { published: true },
  orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  take: 20,
  skip: 0,
});

// Primer registro coincidente o null
const latest = await db.post.findFirst({
  where: { authorId: user.id },
  orderBy: { createdAt: "desc" },
});

// Búsqueda única
const byEmail = await db.user.findUnique({
  where: { email: "alice@acme.dev" },
});
```

### Tipado Automático con `select` e `include`

`Payload<Row, Rel, Args>` ajusta el tipo de retorno en tiempo de compilación exactamente a los campos seleccionados y relaciones incluidas:

```ts
const users = await db.user.findMany({
  select: { id: true, email: true },
  include: {
    posts: {
      select: { id: true, title: true },
    },
  },
});
// Tipo inferido: { id: string; email: string; posts: { id: number; title: string }[] }[]
```

- Las relaciones se cargan mediante consultas agrupadas por clave (`WHERE fk = ANY($1)`), evitando multiplicación cartesiana de filas.
- `include` admite un nivel de profundidad sobre claves foráneas de una sola columna (las relaciones con clave compuesta se rechazan en compilación y ejecución con `IndigoRelationError`).

## Filtros Avanzados en `where`

### Operadores Escalares y de Cadena

```ts
const matches = await db.user.findMany({
  where: {
    age: { gte: 18, lt: 65 },
    role: { in: ["ADMIN", "USER"] },
    deletedAt: { equals: null }, // compila a IS NULL
    status: { not: "BANNED" },   // conserva filas NULL: (status <> $1 OR status IS NULL)
    email: { contains: "100%" }, // ILIKE literal — %, _ y \ se escapan automáticamente
  },
});
```

Operadores admitidos en `WhereFilter<T>`:
- `equals`, `not` (`not: null` → `IS NOT NULL`; `not: val` conserva filas `NULL` al estilo Prisma)
- `in`, `notIn` (`= ANY($1)` / `(<> ALL($1) OR IS NULL)`)
- `lt`, `lte`, `gt`, `gte`
- `contains`, `startsWith`, `endsWith` (`ILIKE` insensible a mayúsculas con escape literal automático de `%`, `_`, `\`)

### Composición Lógica (`AND`, `OR`, `NOT`)

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

### Filtros sobre Relaciones To-Many (`some`, `every`, `none`)

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

Se compilan como subconsultas correlacionadas `EXISTS` / `NOT EXISTS`.

### Filtros de Ruta JSON (`JsonFilter`)

En columnas `Json` (`jsonb`), filtra mediante rutas `path` con operadores `#>` y `#>>`:

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
      gte: 10, // castea automáticamente (#>> ...)::numeric al comparar con number
    },
  },
});

const tagged = await db.account.findMany({
  where: {
    metadata: {
      path: [],
      jsonContains: { verified: true }, // contención @> jsonb
    },
  },
});
```

## Paginación por Cursor y `distinct`

Los modelos con clave primaria de una columna exponen paginación tipada por `cursor` (`{ <pk>: valor }`):

```ts
const page2 = await db.post.findMany({
  cursor: { id: lastSeenId },
  take: 25,
  // `skip` toma valor 1 por defecto cuando hay `cursor` para saltar el registro ancla
});
```

Usa `distinct` (`SELECT DISTINCT ON (...)`) para obtener como máximo una fila por combinación única:

```ts
const latestPerAuthor = await db.post.findMany({
  distinct: ["authorId"],
  orderBy: [{ authorId: "asc" }, { createdAt: "desc" }],
});
```

## Escrituras Simples y Anidadas (`create`, `update`, `upsert`, `delete`)

### Escrituras Relacionales Anidadas

`create` y `update` admiten suboperaciones transaccionales sobre relaciones (`create`, `connect`, `connectOrCreate`, además de `disconnect` y `set` en relaciones opcionales al actualizar). Las escrituras anidadas de nivel superior ejecutan todos los pasos dentro de `$transaction` automáticamente:

```ts
const newUser = await db.user.create({
  data: {
    email: "bob@acme.dev",
    profile: {
      create: { bio: "Staff Architect" },
    },
    posts: {
      create: [{ title: "Hola IndigoDB" }],
    },
  },
});
```

### `update`, `delete` y `upsert`

`update` y `delete` restringen `where` a selectores únicos declarados (`<Model>WhereUniqueInput`) y lanzan `IndigoNotFoundError` (`code: "RECORD_NOT_FOUND"`) si no existe fila coincidente:

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

## Mutaciones por Lotes (`createMany`, `updateMany`, `deleteMany`)

Ejecutan en una única sentencia SQL y devuelven `{ count: number }`. Para prevenir borrados o actualizaciones accidentales de toda la tabla, `updateMany` y `deleteMany` rechazan un filtro `where: {}` vacío con `IndigoWhereError` (`code: "EMPTY_WHERE"`).

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

## Agregaciones (`count`, `aggregate`, `groupBy`)

Las columnas numéricas (`Int`, `Float`, `Decimal`, `BigInt`) habilitan `_sum` y `_avg` en compilación (`<Model>NumericFields`), mientras que `_min` y `_max` aceptan cualquier escalar:

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

## Análisis de Planes de Ejecución (`explain`)

Inspecciona el plan real en PostgreSQL (`EXPLAIN (FORMAT JSON)`) para verificar uso de índices en cualquier consulta `findMany`:

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

## SQL Parametrizado Directo (`$queryRaw`)

```ts
const rows = await db.$queryRaw<{ count: string }>(
  `SELECT count(*) AS count FROM "Post" WHERE author_id = $1`,
  [newUser.id],
);
```

## Siguiente Paso

Aprende a gestionar `$transaction`, sesiones `$auth` RLS, middleware `QueryExtension`, adaptadores `pg`/`PGlite` y la jerarquía de errores en [Transacciones, RLS y Adaptadores](/indigodb/orm/transactions-rls-and-adapters).
