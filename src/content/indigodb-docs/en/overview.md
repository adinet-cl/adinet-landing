---
title: IndigoDB — Schema-First PostgreSQL Toolkit
navTitle: Introduction & Overview
description: One .indigo schema language drives a typed TypeScript ORM client, versioned shadow-replayed PostgreSQL migrations, WAL logical-replication realtime + React hooks, and a visual ER/Data/Query/Docs Studio.
section: overview
order: 1
badge: v0.1.1
runtime: "Node.js >= 22 · PostgreSQL"
npmPackages:
  - "@indigodb/cli"
  - "@indigodb/client"
  - "@indigodb/react"
---

**IndigoDB** is a schema-first, all-in-one database toolkit for PostgreSQL built around a single `.indigo` schema language. Instead of splitting your data model across an ORM schema, standalone migration scripts, ERD diagramming tools, and documentation generators, one source of truth compiles to every layer of your stack.

Define your tables, relations, constraints, native PostgreSQL types, documentation notes, Row-Level Security (`@@allow`) policies, and realtime subscriptions (`@@realtime`) once, then drive the entire workflow from [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli):

```bash
npx indigodb db push      # idempotent sync to PostgreSQL (prototyping)
npx indigodb migrate dev  # diff via shadow DB → versioned SQL migration
npx indigodb generate     # emit strongly typed TypeScript client
npx indigodb studio       # launch visual ER diagram, data browser, SQL console & docs
npx indigodb realtime     # start PostgreSQL WAL SSE + Presence/Broadcast daemon
```

## How the Pieces Fit Together

A single Rust-to-WebAssembly compiler ([`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler)) parses and validates `.indigo` files and hands a unified relational Intermediate Representation (`ResolvedSchema` in [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core)) to every downstream tool:

```text
schema.indigo
      │
      ▼
@indigodb/compiler (Rust → WASM)  ──▶  @indigodb/parser (parse / IndigoParseError)
      │
      ▼
@indigodb/core (ResolvedSchema IR + validate + printSchema)
      │
      ├──▶ @indigodb/migrator   ──▶ PostgreSQL DDL (db push, migrate dev/deploy, db pull)
      ├──▶ @indigodb/generator  ──▶ Typed IndigoClient (bound to @indigodb/client)
      ├──▶ @indigodb/realtime   ──▶ WAL pgoutput SSE wakeups, signed /log, Presence/Broadcast
      │          └──▶ @indigodb/client/realtime + @indigodb/react (browser-safe hooks)
      └──▶ @indigodb/studio     ──▶ Visual ERD, Monaco editor, Data Browser, SQL Console & Docs
```

## Published `@indigodb` npm Packages (`v0.1.1`)

All 11 IndigoDB packages are published together as a synchronized cohort under the [`@indigodb`](https://www.npmjs.com/org/indigodb) npm organization (`Node.js >= 22`, ESM-only):

| Package | Role | Environment | npm Registry | Guide |
| :--- | :--- | :--- | :--- | :--- |
| [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) | `indigodb` CLI (`init`, `db`, `migrate`, `generate`, `realtime`, `studio`) | Node.js CLI | [npm ↗](https://www.npmjs.com/package/@indigodb/cli) | [CLI Reference](/indigodb/cli/reference) |
| [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) | ORM runtime (`IndigoClientBase`, adapters) & `./realtime` browser SDK | Server + `./realtime` Browser | [npm ↗](https://www.npmjs.com/package/@indigodb/client) | [ORM Client](/indigodb/orm/queries-and-mutations) |
| [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) | `useLiveTable` & `useChannel` React 18+ hooks (`useSyncExternalStore`) | Browser / SSR-safe | [npm ↗](https://www.npmjs.com/package/@indigodb/react) | [Browser & React](/indigodb/realtime/browser-and-react) |
| [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) | WAL `pgoutput` SSE daemon, signed handles, Presence/Broadcast & metrics | Node.js Server | [npm ↗](https://www.npmjs.com/package/@indigodb/realtime) | [Realtime Engine](/indigodb/realtime/engine-and-wal) |
| [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) | PostgreSQL diff engine, DDL emitter, shadow replay & introspection | Node.js / PGlite | [npm ↗](https://www.npmjs.com/package/@indigodb/migrator) | [Migrations Guide](/indigodb/migrations/overview) |
| [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) | Generates typed `indigo.ts` client & delegates from `ResolvedSchema` | Node.js Tooling | [npm ↗](https://www.npmjs.com/package/@indigodb/generator) | [Codegen & Migrator](/indigodb/packages/codegen-and-migrator) |
| [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) | Relational IR (`ResolvedSchema`), validation & `printSchema` printer | Node.js & Browser | [npm ↗](https://www.npmjs.com/package/@indigodb/core) | [Compiler & Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) | Thin `parse()` wrapper throwing located `IndigoParseError` | Node.js & Browser | [npm ↗](https://www.npmjs.com/package/@indigodb/parser) | [Compiler & Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) | Rust-to-WASM `.indigo` lexer, parser, resolver & UTF-16 span index | Node.js & Browser | [npm ↗](https://www.npmjs.com/package/@indigodb/compiler) | [Compiler & Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) | Pure TypeScript AST, `ScalarType`, `RelationType` & attribute types | Isomorphic | [npm ↗](https://www.npmjs.com/package/@indigodb/ast) | [Compiler & Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio) | Compiled React 19 Studio SPA served by `indigodb studio` | Browser SPA | [npm ↗](https://www.npmjs.com/package/@indigodb/studio) | [Studio Guide](/indigodb/studio/workspace-and-security) |

## A Taste of `.indigo`

```indigo
datasource db {
  provider = "postgresql"
  url = env("DATABASE_URL")
}

generator client {
  provider = "indigodb-client-ts"
  output = "src/generated/indigo.ts"
}

enum UserRole {
  ADMIN
  USER
  GUEST
}

Table User {
  id        String   @id @db.Uuid @default(uuid())
  email     String   @unique @db.VarChar(255) @note("Primary login email")
  role      UserRole @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  posts     Post[]
}

Table Post {
  id       Int     @id @default(autoincrement())
  title    String
  ownerId  String  @map("owner_id") @db.Uuid
  author   User    @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  @@index([ownerId])
  @@realtime(columns: [id, title, ownerId])
  @@allow(read, auth.userId == this.ownerId)
  @@allow(write, auth.userId == this.ownerId)
}

TableGroup "Core" {
  color = "#818cf8"

  User
  Post
}
```

## Key Architectural Guarantees

- **Strict Server vs. Browser Boundary**: The root [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) entry and generated `indigo.ts` are strictly server-side (`pg` + `node:async_hooks`). Browser apps import only [`@indigodb/client/realtime`](/indigodb/packages/runtime-and-ui#indigodbclientrealtime-browser-safe) or [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react), using zero-dependency Web APIs.
- **Wake-Only Unauthenticated SSE**: Real-time SSE streams emit data-free `wake` signals (`{ table, op, lsn }`), never raw database rows. Authenticated row replay requires an HMAC-SHA256 signed handle (`mintHandle` / `verifyHandle`) paired with PostgreSQL RLS.
- **Shadow-Verified Migrations**: `indigodb migrate dev` replays your existing migration history into an isolated embedded PGlite shadow database and verifies SHA-256 checksums in `_indigo_migrations` before computing the next diff.
- **Hardened Visual Studio**: `indigodb studio` defaults to `127.0.0.1:5555`, refuses non-loopback `--host` binds without `INDIGODB_STUDIO_PASSWORD`, executes SQL Console queries inside `SET TRANSACTION READ ONLY` with statement timeouts and `DECLARE CURSOR` row caps, and emits structured stdout audit logs.

## Where to Go Next

- Start in 5 minutes with the [Quickstart Guide](/indigodb/getting-started).
- Explore the compiler pipeline and package boundaries in [Master Architecture](/indigodb/architecture).
- Master the schema syntax in [`.indigo` Language Reference](/indigodb/schema/language-reference).
- Browse all 11 npm artifacts in the [`@indigodb` Packages Overview](/indigodb/packages/overview).
