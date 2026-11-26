---
title: Master Architecture & Compiler Pipeline
navTitle: Master Architecture
description: Understand IndigoDB's Rust-to-WASM compiler pipeline, the central ResolvedSchema IR contract, the 11-package dependency graph, and server vs. browser security boundaries.
section: overview
order: 3
runtime: "Rust/WASM + ESM TypeScript"
npmPackages:
  - "@indigodb/compiler"
  - "@indigodb/parser"
  - "@indigodb/core"
---

IndigoDB is architected as a strictly layered monorepo where **one Intermediate Representation (`ResolvedSchema`)** bridges a Rust WebAssembly schema compiler and a modular TypeScript/React ecosystem.

## Compiler & IR Pipeline

Rather than letting the migrator, client generator, realtime engine, and visual Studio each re-parse raw `.indigo` text independently, all schema semantics are resolved once into `ResolvedSchema`:

```text
  .indigo source text
         │
         ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ crates/indigo-compiler (Rust → wasm32-unknown-unknown via wasm-pack)│
  │   lexer.rs (logos) → parser.rs → validate.rs → resolve.rs           │
  └──────────────────────────────┬──────────────────────────────────────┘
                                 │ JSON envelopes ({ ok } / { errors })
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ @indigodb/compiler (Node sync initSync / Browser async initCompiler)│
  └──────────────────────────────┬──────────────────────────────────────┘
                                 │ Schema AST + UTF-16 SpanIndex
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ @indigodb/parser (throws located IndigoParseError)                  │
  └──────────────────────────────┬──────────────────────────────────────┘
                                 │
                                 ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │ @indigodb/core (ResolvedSchema IR, validate(), resolve(), printSchema)
  └───────┬──────────────────┬──────────────────┬───────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
  @indigodb/migrator  @indigodb/generator  @indigodb/realtime  @indigodb/studio
  (PostgreSQL DDL)    (indigo.ts codegen)  (WAL pgoutput SSE)  (ERD/Docs/Data)
```

### Why Rust + WASM?

- **Multi-error recovery per pass**: The hand-written recursive descent parser in `crates/indigo-compiler/src/parser.rs` recovers at declaration boundaries and returns multiple located diagnostics (`line`, `column`, `endLine`, `endColumn`) in one pass.
- **Identical semantics in CLI and Browser**: Both `indigodb` on Node.js and the Monaco editor inside `@indigodb/studio` execute the exact same compiled compiler artifact (`indigo_compiler_bg.wasm`), eliminating client/server parser drift.
- **Zero-dependency UTF-16 source spans**: `parseSchemaWithSpans()` returns a side-channel `SpanIndex` using UTF-16 code-unit offsets that slice directly onto JavaScript strings (`text.slice(span.start, span.end)`) without mutating the AST contract.

## Package Dependency Layering

Every package in the `@indigodb` organization compiles to strict ESM (`"type": "module"`) targeting `Node >= 22`:

| Layer | Packages | Dependencies | Purpose |
| :--- | :--- | :--- | :--- |
| **0 · Contract** | [`@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) | None | Pure AST interfaces (`Schema`, `Model`, `Field`, `Attribute`, `ScalarType`) |
| **1 · Compiler** | [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) | `@indigodb/ast` | WASM compiler wrapper with Node sync & Browser async conditional exports |
| **2 · Parser** | [`@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) | `@indigodb/ast`, `@indigodb/compiler` | Throws `IndigoParseError` with 1-based line/column diagnostics |
| **3 · IR Hub** | [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) | `ast`, `compiler`, `parser` | `ResolvedSchema` IR, `validate()`, `resolve()`, `printSchema()`, `parseWithSpans()` |
| **4 · Engines** | [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator), [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) | `@indigodb/ast`, `@indigodb/core` (+ `@electric-sql/pglite` in migrator) | PostgreSQL DDL diff/push/shadow/introspect and TS client codegen |
| **5 · Realtime Server** | [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) | `core`, `migrator`, `pg`, `pg-logical-replication` | `WalSource` (`pgoutput`), SSE fan-out, HMAC handles, Presence/Broadcast |
| **6 · Runtime & React** | [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client), [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) | `client` depends on `realtime` + `pg`; `react` depends on `@indigodb/client/realtime` | Server ORM delegates + browser-safe `./realtime` subpath & React hooks |
| **7 · Visual & CLI** | [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio), [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) | `cli` bundles `core`, `parser`, `generator`, `migrator`, `realtime`, `studio` | End-user `indigodb` binary and compiled React 19 Studio SPA |

## Security & Bundle Boundaries

IndigoDB enforces three strict security boundaries by package structure rather than documentation warnings alone:

### 1. Server-Only ORM vs. Browser-Safe Realtime

- **Server-only**: `@indigodb/client` (root entry) and your generated `src/generated/indigo.ts` statically import `pg` and `node:async_hooks`. Attempting to bundle them into a frontend Vite/Webpack/Next.js client build fails immediately by design.
- **Browser-safe**: `@indigodb/client/realtime`, `@indigodb/realtime/protocol`, and `@indigodb/react` use only standard Web APIs (`fetch`, `ReadableStream`, `TextDecoder`, `AbortController`, `URL`, `atob`) and contain zero `pg` or `node:*` imports.

### 2. Wake-Only SSE vs. Signed Handle Replay

The SSE endpoint (`GET /api/realtime`) is unauthenticated and **never transmits row payloads** (`new` or `old` records), whether a table has `@@allow` rules or not. It emits data-free wake frames (`{ table, op, lsn }`) that instruct clients to refetch through your authenticated API or use server-minted HMAC-SHA256 handles (`mintHandle` / `verifyHandle`).

### 3. Datasource Redaction in Studio

When `indigodb studio` serves your `.indigo` source to the browser editor (`GET /api/schema/source`), it strips the entire `datasource { ... }` block (which may hold credentials or `env()` references) and replaces it with `// datasource redacted by Studio`. On write-back (`PUT /api/schema/source`), the server verifies an optimistic SHA-256 `X-Indigo-Schema-Version` header, refuses any submitted literal `datasource` block, splices the real on-disk `datasource` block back in, parses + validates via `@indigodb/core`, and writes atomically via temp file + `rename(2)`.

## Next Step

Explore the complete [`.indigo` Language Reference](/indigodb/schema/language-reference) or jump to [ORM Queries & Mutations](/indigodb/orm/queries-and-mutations).
