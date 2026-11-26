---
title: "Codegen y Migraciones: @indigodb/generator y @indigodb/migrator"
navTitle: Generator y Migrator
description: Referencia programática TypeScript para @indigodb/generator y @indigodb/migrator en npm — genera clientes ORM tipados, emite DDL push, planifica diffs, ejecuta shadow replay e introspecciona PostgreSQL.
section: packages
order: 3
npmPackages:
  - "@indigodb/generator"
  - "@indigodb/migrator"
---

Utiliza [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) y [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) de forma programática para construir pipelines de generación, validadores en CI o automatizaciones de migración sobre `ResolvedSchema`.

## `@indigodb/generator`

- **npm**: [`https://www.npmjs.com/package/@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) (`v0.1.1`)
- **Fuente**: [`packages/generator`](https://github.com/chechooxd/indigo/tree/main/packages/generator)

```bash
npm install @indigodb/generator @indigodb/core
```

### Uso y Exportaciones

`generateClient(schema: ResolvedSchema): string` genera el código TypeScript completo que declara:
- Enums y tipos por modelo (`Row`, `CreateInput`, `CreateManyInput`, `UpdateInput`, `WhereInput`, `WhereUniqueInput`, `CursorInput`, `NumericFields`, `Relations`, `IncludeInput`)
- Metadatos en tiempo de ejecución `__meta` (`db`, `pk`, `json`, `numeric`, `uniqueGroups`, `indexes`, `relations`)
- Interfaz `TransactionClient` y clase `IndigoClient extends IndigoClientBase` con `ModelDelegate`, `RealtimeModelDelegate` o `LiveModelDelegate` según el modelo

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
- **Fuente**: [`packages/migrator`](https://github.com/chechooxd/indigo/tree/main/packages/migrator)

```bash
npm install @indigodb/migrator @indigodb/core
```

### Generadores `db push` y DDL

```ts
import { parse, resolve } from "@indigodb/core";
import { renderPushSql, renderReplicationPreSql } from "@indigodb/migrator";

const ir = resolve(parse(schemaText));
const preSql = renderReplicationPreSql(ir); // SQL pre-transacción para slot lógico
const pushSql = renderPushSql(ir);          // DDL idempotente
```

Constructores SQL exportados adicionales:
- `mapScalarToPg(indigoType)` / `columnSqlType(col)` / `renderColumn(col, enums)` / `renderDefaultClause(col, enums)` / `quoteIdent(name)`
- `indexName(table, idx)` / `renderIndexDdl(table, idx, { ifNotExists? })`
- `namedAllowRules(table)` / `policyName(table, rule, idx)` / `renderPolicy(table, rule, idx)` / `renderRlsBlock(table)` / `renderDisableRls(table)` / `AUTH_SETTING`
- `REALTIME_LOG_TABLE` / `renderRealtimeLogSql()` / `renderPublicationSql(resolved)` / `renderReplicaIdentity(table)` / `resolveSlotName()` / `computeBuckets(table, row)`

### Planificación de Migraciones Versionadas y Marcadores

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

- **Marcadores de fase**: `NO_TRANSACTION_BEGIN` (`-- indigo:begin no-transaction`), `NO_TRANSACTION_END` (`-- indigo:end no-transaction`)
- **Marcador de seguridad**: `REQUIRES_FORCE_MARKER` (`-- indigo:requires-force `)
- **Códigos diagnósticos** (`MigrationDiagnosticCode`): `"ambiguous-column-remap"`, `"enum-value-removed"`, `"required-column-without-default"`

### Shadow DB Replay e Introspección del Catálogo

```ts
import {
  buildShadowSchema,
  ShadowReplayError,
  introspectResolvedSchema,
} from "@indigodb/migrator";
```

- **`buildShadowSchema(source: MigrationSource, options?: BuildShadowSchemaOptions)`**: Levanta una base `@electric-sql/pglite` en memoria, valida el orden y checksums SHA-256 de las migraciones registradas, ejecuta cada `migration.sql` y devuelve el `ResolvedSchema` introspeccionado (o lanza `ShadowReplayError`).
- **`introspectResolvedSchema(query: IntrospectionQuery, options?: IntrospectOptions)`**: Consulta catálogos del sistema PostgreSQL (`pg_class`, `pg_attribute`, `pg_index`, `pg_constraint`, `pg_type`, `pg_policy`, `pg_publication`) para construir un `ResolvedSchema`.

## Siguiente Paso

Explora los paquetes de runtime, tiempo real, React, CLI y Studio en [Paquetes Runtime y UI](/indigodb/packages/runtime-and-ui).
