---
title: "Codegen & Migrations: @indigodb/generator & @indigodb/migrator"
navTitle: Generator & Migrator
description: Programmatic TypeScript API reference for @indigodb/generator and @indigodb/migrator on npm — emit typed ORM clients, render idempotent push DDL, plan diff migrations, replay shadow DBs, and introspect PostgreSQL.
section: packages
order: 3
npmPackages:
  - "@indigodb/generator"
  - "@indigodb/migrator"
---

Use [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) and [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) programmatically to build custom codegen pipelines, CI schema validators, or automated migration tooling on top of `ResolvedSchema`.

## `@indigodb/generator`

- **npm**: [`https://www.npmjs.com/package/@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) (`v0.1.1`)
- **Source**: [`packages/generator`](https://github.com/chechooxd/indigo/tree/main/packages/generator)

```bash
npm install @indigodb/generator @indigodb/core
```

### Usage & Exports

`generateClient(schema: ResolvedSchema): string` produces the complete TypeScript source file defining:
- Enums and model `Row`, `CreateInput`, `CreateManyInput`, `UpdateInput`, `WhereInput`, `WhereUniqueInput`, `CursorInput`, `NumericFields`, `Relations`, and `IncludeInput` types
- Runtime `__meta` metadata (`db`, `pk`, `json`, `numeric`, `uniqueGroups`, `indexes`, `relations`)
- `TransactionClient` interface and `IndigoClient extends IndigoClientBase` wiring `ModelDelegate`, `RealtimeModelDelegate`, or `LiveModelDelegate` per model

```ts
import { writeFileSync } from "node:fs";
import { parse, resolve } from "@indigodb/core";
import { generateClient } from "@indigodb/generator";

const ir = resolve(parse(`Table Item { id Int @id @default(autoincrement()) name String }`));
const source = generateClient(ir);
writeFileSync("src/generated/indigo.ts", source, "utf8");
```

---

## `@indigodb/migrator`

- **npm**: [`https://www.npmjs.com/package/@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) (`v0.1.1`)
- **Source**: [`packages/migrator`](https://github.com/chechooxd/indigo/tree/main/packages/migrator)

```bash
npm install @indigodb/migrator @indigodb/core
```

### `db push` & DDL Builders

```ts
import { parse, resolve } from "@indigodb/core";
import { renderPushSql, renderReplicationPreSql } from "@indigodb/migrator";

const ir = resolve(parse(schemaText));
const preSql = renderReplicationPreSql(ir); // logical replication slot pre-tx SQL
const pushSql = renderPushSql(ir);          // idempotent DDL script
```

Additional exported SQL builders and helpers:
- `mapScalarToPg(indigoType)` / `columnSqlType(col)` / `renderColumn(col, enums)` / `renderDefaultClause(col, enums)` / `quoteIdent(name)`
- `indexName(table, idx)` / `renderIndexDdl(table, idx, { ifNotExists? })`
- `namedAllowRules(table)` / `policyName(table, rule, idx)` / `renderPolicy(table, rule, idx)` / `renderRlsBlock(table)` / `renderDisableRls(table)` / `AUTH_SETTING`
- `REALTIME_LOG_TABLE` / `renderRealtimeLogSql()` / `renderPublicationSql(resolved)` / `renderReplicaIdentity(table)` / `resolveSlotName()` / `computeBuckets(table, row)`

### Versioned Migration Planning & Phase Markers

```ts
import {
  planMigration,
  renderMigrationSql,
  splitMigrationSql,
  scanRequiresForce,
} from "@indigodb/migrator";

const plan = planMigration(prevResolved, nextResolved);
if (plan.diagnostics.length > 0) {
  throw new Error(plan.diagnostics.map((d) => d.message).join("\n"));
}

const sql = renderMigrationSql(plan);
const { preTransaction, transactional } = splitMigrationSql(sql);
const destructiveImpacts = scanRequiresForce(sql);
```

- **Phase markers**: `NO_TRANSACTION_BEGIN` (`-- indigo:begin no-transaction`), `NO_TRANSACTION_END` (`-- indigo:end no-transaction`)
- **Safety marker**: `REQUIRES_FORCE_MARKER` (`-- indigo:requires-force `)
- **Diagnostic codes** (`MigrationDiagnosticCode`): `"ambiguous-column-remap"`, `"enum-value-removed"`, `"required-column-without-default"`

### Shadow-Database Replay & Catalog Introspection

```ts
import {
  buildShadowSchema,
  ShadowReplayError,
  introspectResolvedSchema,
} from "@indigodb/migrator";
```

- **`buildShadowSchema(source: MigrationSource, options?: BuildShadowSchemaOptions)`**: Spins up an in-memory embedded `@electric-sql/pglite` database, validates migration ledger order and SHA-256 checksums, replays `migration.sql` files, and returns the introspected `ResolvedSchema` (or throws `ShadowReplayError`).
- **`introspectResolvedSchema(query: IntrospectionQuery, options?: IntrospectOptions)`**: Queries PostgreSQL system catalogs (`pg_class`, `pg_attribute`, `pg_index`, `pg_constraint`, `pg_type`, `pg_policy`, `pg_publication`) to produce a `ResolvedSchema` ready for diffing or `printSchema`.

## Next Step

Explore the runtime, realtime, React, CLI, and Studio packages in [Runtime & Visual Packages](/indigodb/packages/runtime-and-ui).
