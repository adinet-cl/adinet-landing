---
title: "@indigodb npm Organization Reference"
navTitle: npm Packages Overview
description: Complete catalog of all 11 synchronized npm packages published under @indigodb (v0.1.1) — installation profiles, runtime boundaries, and registry links.
section: packages
order: 1
badge: 11 packages
runtime: "npm @indigodb/* v0.1.1"
npmPackages:
  - "@indigodb/cli"
  - "@indigodb/client"
  - "@indigodb/react"
  - "@indigodb/studio"
---

All 11 IndigoDB modules are published to npm under the [`@indigodb`](https://www.npmjs.com/org/indigodb) organization as a **fixed-version cohort (`v0.1.1`)** requiring **Node.js >= 22** and **ESM (`"type": "module"`)**. Fixed versioning guarantees that `@indigodb/cli`, `@indigodb/studio`, `@indigodb/client`, `@indigodb/core`, and every companion library stay version-aligned.

## Choose Your Installation Profile

### Backend Application (ORM + CLI + Studio)

```bash
npm install @indigodb/client
npm install -D @indigodb/cli
```

### Frontend / React Real-Time App (Browser-Safe)

```bash
npm install @indigodb/react @indigodb/client
```

> Import only from `@indigodb/react` or `@indigodb/client/realtime` in frontend code—never the root `@indigodb/client` server entry.

### Custom Node.js Realtime Server

```bash
npm install @indigodb/realtime @indigodb/core
```

### Schema Tooling, Linting, Codegen & Custom Pipelines

```bash
npm install @indigodb/core @indigodb/migrator @indigodb/generator
```

## Complete npm Package Catalog (`@indigodb/*`)

| npm Package | Latest | Description | Subpath Exports | Reference |
| :--- | :--- | :--- | :--- | :--- |
| [`@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) | `0.1.1` | Pure `.indigo` AST interfaces, `ScalarType`, `RelationType`, `SCALAR_TYPES` | `.` | [Compiler & Core](/indigodb/packages/compiler-and-core#indigodbast) |
| [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) | `0.1.1` | Rust-to-WASM `.indigo` compiler with Node sync & Browser async entries | `.` | [Compiler & Core](/indigodb/packages/compiler-and-core#indigodbcompiler) |
| [`@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) | `0.1.1` | `parse(source)` API throwing located `IndigoParseError` | `.` | [Compiler & Core](/indigodb/packages/compiler-and-core#indigodbparser) |
| [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) | `0.1.1` | `ResolvedSchema` IR, `validate()`, `resolve()`, `printSchema()`, `parseWithSpans()` | `.` | [Compiler & Core](/indigodb/packages/compiler-and-core#indigodbcore) |
| [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) | `0.1.1` | `generateClient(resolved)` emitting typed `indigo.ts` ORM client | `.` | [Codegen & Migrator](/indigodb/packages/codegen-and-migrator#indigodbgenerator) |
| [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) | `0.1.1` | PostgreSQL DDL push, versioned diff/plan, shadow replay & `introspectResolvedSchema` | `.` | [Codegen & Migrator](/indigodb/packages/codegen-and-migrator#indigodbmigrator) |
| [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) | `0.1.1` | Server ORM runtime (`IndigoClientBase`, `pg`/`PGlite` adapters) & browser `./realtime` SDK | `.`, `./realtime` | [Runtime & UI](/indigodb/packages/runtime-and-ui#indigodbclient) |
| [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) | `0.1.1` | WAL `pgoutput` `RealtimeEngine`, signed handles, Presence/Broadcast & metrics | `.`, `./protocol` | [Runtime & UI](/indigodb/packages/runtime-and-ui#indigodbrealtime) |
| [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) | `0.1.1` | Browser-safe React 18+ hooks (`useLiveTable`, `useChannel`) via `useSyncExternalStore` | `.` | [Runtime & UI](/indigodb/packages/runtime-and-ui#indigodbreact) |
| [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) | `0.1.1` | `indigodb` CLI binary (`init`, `db`, `migrate`, `generate`, `realtime`, `studio`) | `.` (`bin: indigodb`) | [Runtime & UI](/indigodb/packages/runtime-and-ui#indigodbcli) |
| [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio) | `0.1.1` | Pre-built React 19 Visual Studio SPA served by `indigodb studio` | `dist/` SPA bundle | [Runtime & UI](/indigodb/packages/runtime-and-ui#indigodbstudio) |

## Source Repository Mapping

All packages live inside [`github.com/chechooxd/indigo`](https://github.com/chechooxd/indigo):

- `packages/{ast,compiler,parser,core,migrator,generator,client,realtime,react,cli}`
- `apps/studio` → published to npm as [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio)
- `crates/indigo-compiler` → Rust crate compiled into [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) (`wasm/indigo_compiler_bg.wasm`)

## Next Step

Dive into the API reference for each layer:
- [Schema Tooling: `@indigodb/ast`, `compiler`, `parser`, `core`](/indigodb/packages/compiler-and-core)
- [Codegen & Migrations: `@indigodb/generator` & `@indigodb/migrator`](/indigodb/packages/codegen-and-migrator)
- [Runtime, Realtime & UI: `@indigodb/client`, `realtime`, `react`, `cli`, `studio`](/indigodb/packages/runtime-and-ui)
