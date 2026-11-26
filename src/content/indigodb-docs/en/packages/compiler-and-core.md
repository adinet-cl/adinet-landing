---
title: "Schema Tooling: @indigodb/ast, compiler, parser, core"
navTitle: Compiler, Parser & Core
description: API reference for @indigodb/ast, @indigodb/compiler, @indigodb/parser, and @indigodb/core on npm — parse .indigo schemas, initialize WASM in Node/browsers, validate, resolve IR, and print schemas.
section: packages
order: 2
npmPackages:
  - "@indigodb/ast"
  - "@indigodb/compiler"
  - "@indigodb/parser"
  - "@indigodb/core"
---

These four foundational packages power `.indigo` language parsing, diagnostics, semantic validation, relational IR resolution, and deterministic schema printing.

## `@indigodb/ast`

- **npm**: [`https://www.npmjs.com/package/@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) (`v0.1.1`)
- **Source**: [`packages/ast`](https://github.com/chechooxd/indigo/tree/main/packages/ast)
- **Zero dependencies** — pure TypeScript AST types and scalar constants.

```bash
npm install @indigodb/ast
```

### Main Exports

- **Enums & Sets**: `ScalarType` (`String`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`, `BigInt`, `Bytes`, `Decimal`), `RelationType` (`OneToOne`, `OneToMany`, `ManyToMany`), `SCALAR_TYPES` (`ReadonlySet<string>`).
- **AST Interfaces**: `Schema`, `Datasource`, `Generator`, `Model`, `Field`, `FieldType`, `Attribute`, `AttributeArg`, `AttributeValue`, `Enum`, `EnumValue`, `Relation`, `TableGroup`.

---

## `@indigodb/compiler`

- **npm**: [`https://www.npmjs.com/package/@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) (`v0.1.1`)
- **Source**: [`packages/compiler`](https://github.com/chechooxd/indigo/tree/main/packages/compiler) (wraps [`crates/indigo-compiler`](https://github.com/chechooxd/indigo/tree/main/crates/indigo-compiler))

```bash
npm install @indigodb/compiler
```

### Node vs. Browser Conditional Exports

`@indigodb/compiler` exposes conditional `exports`:
- **`node` entry (`index.node.ts`)**: Calls `initSync()` eagerly at module load; every compiler function runs synchronously with no `await` needed.
- **`default` / browser entry (`index.browser.ts`)**: Exposes async `initCompiler()` (fetches `indigo_compiler_bg.wasm` via `new URL(..., import.meta.url)`). You **must** `await initCompiler()` once before calling any compiler, parser, or core function in browser environments.

```ts
import { initCompiler, compileSchema, parseSchemaWithSpans } from "@indigodb/compiler";

await initCompiler(); // no-op in Node.js; required in browsers

const compiled = compileSchema(`
Table User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`);
```

### Main Exports

- `initCompiler(): Promise<void>`
- `parseSchema(source: string): ParseResult`
- `parseSchemaWithSpans(source: string): ParseWithSpansResult` — returns `{ schema, spans: SpanIndex }` with UTF-16 code-unit offsets (`ModelSpan`, `FieldSpan`, `AttributeSpan`, `SourceSpan`).
- `validateSchema(schema: Schema): unknown[]`
- `resolveSchema(schema: Schema): unknown`
- `compileSchema(source: string): CompileResult` — single WASM boundary crossing for parse + validate + resolve.

---

## `@indigodb/parser`

- **npm**: [`https://www.npmjs.com/package/@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) (`v0.1.1`)
- **Source**: [`packages/parser`](https://github.com/chechooxd/indigo/tree/main/packages/parser)

```bash
npm install @indigodb/parser
```

Wraps `@indigodb/compiler`'s `parseSchema` and throws a typed `IndigoParseError` carrying located 1-based `ParseErrorDetail[]` diagnostics (`message`, `line`, `column`, `endLine?`, `endColumn?`).

```ts
import { parse, IndigoParseError } from "@indigodb/parser";

try {
  const ast = parse(`Table User { id Int @id }`);
} catch (err) {
  if (err instanceof IndigoParseError) {
    console.error(err.errors);
  }
}
```

---

## `@indigodb/core`

- **npm**: [`https://www.npmjs.com/package/@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) (`v0.1.1`)
- **Source**: [`packages/core`](https://github.com/chechooxd/indigo/tree/main/packages/core)

```bash
npm install @indigodb/core
```

`@indigodb/core` is the central schema hub—re-exporting `parse`, `IndigoParseError`, `initCompiler`, and `parseWithSpans` alongside `validate`, `resolve`, `printSchema`, attribute helpers, and all `ResolvedSchema` IR types.

```ts
import { initCompiler, parse, validate, resolve, printSchema } from "@indigodb/core";

await initCompiler();

const ast = parse(`
Table User {
  id    Int    @id @default(autoincrement())
  email String @unique @note("User email")
}
`);

const errors = validate(ast);
if (errors.length === 0) {
  const ir = resolve(ast); // ResolvedSchema
  const formatted = printSchema(ir);
  console.log(formatted);
}
```

### Main Exports

- **Lifecycle & Parsing**: `initCompiler`, `parse`, `parseWithSpans`, `IndigoParseError`
- **Validation & Resolution**: `validate(schema): ValidationError[]`, `resolve(schema): ResolvedSchema`
- **Printing**: `printSchema(schema, options?: PrintOptions): string`, `IndigoPrintError`
- **Attribute Helpers**: `getAttr`, `hasAttr`, `positionalArg`, `namedArg`, `asString`, `asReferenceList`, `firstString`
- **IR & Span Types**: `ResolvedSchema`, `ResolvedTable`, `ResolvedColumn`, `ResolvedIndex`, `ResolvedRelation`, `ResolvedEnum`, `ResolvedEnumMember`, `ResolvedTableGroup`, `ResolvedDefault`, `ForeignKey`, `AllowRule`, `AllowAction`, `AllowOperand`, `ValidationError`, `SpanIndex`, `ModelSpan`, `FieldSpan`, `AttributeSpan`, `SourceSpan`

## Next Step

Inspect the code generator and PostgreSQL migration engine in [Codegen & Migrator Packages](/indigodb/packages/codegen-and-migrator).
