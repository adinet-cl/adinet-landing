---
title: Quickstart Guide (Node.js & TypeScript)
navTitle: Quickstart
description: Install @indigodb/cli and @indigodb/client, scaffold schema.indigo, push to PostgreSQL, generate a strongly typed ORM client, and inspect your schema in IndigoDB Studio.
section: overview
order: 2
runtime: "Node.js >= 22 · PostgreSQL 16+"
npmPackages:
  - "@indigodb/cli"
  - "@indigodb/client"
---

This guide takes you from an empty Node.js / TypeScript backend (NestJS, Express, Fastify, or plain Node) to a working PostgreSQL schema, generated ORM client, and live visual workspace in Studio.

## Prerequisites

- **Node.js 22 or newer** (`engines.node: ">=22"` across all `@indigodb/*` packages)
- **ESM project configuration** (`"type": "module"` in `package.json`, or TypeScript compiled for Node ESM)
- **A reachable PostgreSQL instance** (PostgreSQL 14+ recommended; PostgreSQL 16+ for `@@realtime` WAL logical replication)

If you need a disposable local PostgreSQL database via Docker:

```bash
docker run -d \
  --name indigodb-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  postgres:16 -c wal_level=logical
```

> Adding `-c wal_level=logical` enables PostgreSQL logical replication upfront so `@@realtime` models work immediately without restarting the container later.

## 1. Install the Packages

Install [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) as a dev dependency (for schema management, codegen, and Studio) and [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) as a runtime dependency:

```bash
npm install -D @indigodb/cli
npm install @indigodb/client
```

Or with `pnpm`:

```bash
pnpm add -D @indigodb/cli
pnpm add @indigodb/client
```

## 2. Scaffold `schema.indigo` and `.env`

```bash
npx indigodb init
```

This creates two files in your current directory (and aborts safely if `schema.indigo` already exists):

- `schema.indigo`: Starter schema with `datasource db`, `generator client`, `enum UserRole`, `Table User`, `Table Post`, and `TableGroup "Core"`.
- `.env`: Template containing `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb"`.

## 3. Sync the Schema to PostgreSQL

During early prototyping, use `db push` to apply your `.indigo` schema idempotently without creating migration files:

```bash
# Preview the generated SQL first (optional)
npx indigodb db push --print

# Apply tables, enums, indexes, and foreign keys
npx indigodb db push
```

> For staging and production workflows with history tracking, checksum verification, and shadow-DB replay, switch to [`indigodb migrate dev` and `indigodb migrate deploy`](/indigodb/migrations/overview).

## 4. Generate the Typed TypeScript Client

```bash
npx indigodb generate
```

By default, `generate` writes to the `output` path configured in your `generator client` block (`src/generated/indigo.ts`). Every time you edit `schema.indigo`, re-run `npx indigodb generate` to update types and model delegates.

## 5. Run Typed Queries from Your Backend

Import `IndigoClient` from your generated file. By default it reads `process.env.DATABASE_URL` and manages a `pg.Pool` automatically:

```ts
import { IndigoClient } from "./generated/indigo.js";

const db = new IndigoClient();

// Create a record with typed input and automatic DB defaults
const user = await db.user.create({
  data: {
    email: "alice@acme.dev",
    name: "Alice",
    role: "ADMIN",
  },
});

// Query with filtering, relation includes, and type-safe select narrowing
const recentAdmins = await db.user.findMany({
  where: {
    role: "ADMIN",
    email: { contains: "acme.dev" },
  },
  include: {
    posts: {
      select: { id: true, title: true },
    },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});

console.log({ user, recentAdmins });

await db.$disconnect();
```

## 6. Explore Visually in IndigoDB Studio

Launch the built-in Studio workspace wired directly to your `schema.indigo` and PostgreSQL database:

```bash
npx indigodb studio
```

Studio starts on `http://127.0.0.1:5555` and opens automatically in your browser with four integrated tools:

- **ER Designer**: Interactive React Flow diagram grouped by `TableGroup` colors alongside a live Monaco `.indigo` editor.
- **Data Browser**: Primary-key cursor-paginated table viewer and row editor (`POST`/`PATCH`/`DELETE`).
- **SQL Query Console**: Read-only SQL runner (`SET TRANSACTION READ ONLY`) with statement timeout and row-cap guardrails.
- **Schema Documentation**: Auto-generated documentation browser showing columns, `@note` metadata, constraints, indexes, and relations.

## Next Step

Understand how the Rust/WASM compiler and 11 npm packages fit together in [Master Architecture](/indigodb/architecture), or read the full [`.indigo` Language Reference](/indigodb/schema/language-reference).
