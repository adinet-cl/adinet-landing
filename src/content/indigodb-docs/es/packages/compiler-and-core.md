---
title: "Tooling de Esquema: @indigodb/ast, compiler, parser, core"
navTitle: Compiler, Parser y Core
description: Referencia de API para @indigodb/ast, @indigodb/compiler, @indigodb/parser y @indigodb/core en npm — parsear esquemas .indigo, inicializar WASM en Node o navegador, validar, resolver IR e imprimir esquemas.
section: packages
order: 2
npmPackages:
  - "@indigodb/ast"
  - "@indigodb/compiler"
  - "@indigodb/parser"
  - "@indigodb/core"
---

Estos cuatro paquetes base implementan el análisis léxico/sintáctico de `.indigo`, diagnósticos ubicados, validación semántica, resolución a IR relacional e impresión determinista de esquemas.

## `@indigodb/ast`

- **npm**: [`https://www.npmjs.com/package/@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) (`v0.1.1`)
- **Fuente**: [`packages/ast`](https://github.com/chechooxd/indigo/tree/main/packages/ast)
- **Cero dependencias** — tipos AST puros y constantes escalares en TypeScript.

```bash
npm install @indigodb/ast
```

### Exportaciones Principales

- **Enums y Conjuntos**: `ScalarType` (`String`, `Int`, `Float`, `Boolean`, `DateTime`, `Json`, `BigInt`, `Bytes`, `Decimal`), `RelationType` (`OneToOne`, `OneToMany`, `ManyToMany`), `SCALAR_TYPES` (`ReadonlySet<string>`).
- **Interfaces AST**: `Schema`, `Datasource`, `Generator`, `Model`, `Field`, `FieldType`, `Attribute`, `AttributeArg`, `AttributeValue`, `Enum`, `EnumValue`, `Relation`, `TableGroup`.

---

## `@indigodb/compiler`

- **npm**: [`https://www.npmjs.com/package/@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) (`v0.1.1`)
- **Fuente**: [`packages/compiler`](https://github.com/chechooxd/indigo/tree/main/packages/compiler) (envuelve [`crates/indigo-compiler`](https://github.com/chechooxd/indigo/tree/main/crates/indigo-compiler))

```bash
npm install @indigodb/compiler
```

### Exports Condicionales Node vs. Navegador

`@indigodb/compiler` expone `exports` condicionales:
- **Entrada `node` (`index.node.ts`)**: Llama `initSync()` al cargar el módulo; todas las funciones son síncronas sin necesidad de `await`.
- **Entrada `default` / navegador (`index.browser.ts`)**: Expone `initCompiler()` asíncrono (carga `indigo_compiler_bg.wasm` vía `new URL(..., import.meta.url)`). En navegador **debes** ejecutar `await initCompiler()` antes de invocar funciones del compilador, parser o core.

```ts
import { initCompiler, compileSchema, parseSchemaWithSpans } from "@indigodb/compiler";

await initCompiler(); // no-op en Node.js; obligatorio en navegadores

const compiled = compileSchema(`
Table User {
  id    Int    @id @default(autoincrement())
  email String @unique
}
`);
```

### Exportaciones Principales

- `initCompiler(): Promise<void>`
- `parseSchema(source: string): ParseResult`
- `parseSchemaWithSpans(source: string): ParseWithSpansResult` — devuelve `{ schema, spans: SpanIndex }` con offsets UTF-16 (`ModelSpan`, `FieldSpan`, `AttributeSpan`, `SourceSpan`).
- `validateSchema(schema: Schema): unknown[]`
- `resolveSchema(schema: Schema): unknown`
- `compileSchema(source: string): CompileResult` — parseo + validación + resolución en una sola llamada WASM.

---

## `@indigodb/parser`

- **npm**: [`https://www.npmjs.com/package/@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) (`v0.1.1`)
- **Fuente**: [`packages/parser`](https://github.com/chechooxd/indigo/tree/main/packages/parser)

```bash
npm install @indigodb/parser
```

Envuelve `parseSchema` de `@indigodb/compiler` lanzando `IndigoParseError` con diagnósticos `ParseErrorDetail[]` ubicados (`message`, `line`, `column`, `endLine?`, `endColumn?`).

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
- **Fuente**: [`packages/core`](https://github.com/chechooxd/indigo/tree/main/packages/core)

```bash
npm install @indigodb/core
```

`@indigodb/core` es el núcleo central del esquema: reexporta `parse`, `IndigoParseError`, `initCompiler` y `parseWithSpans` junto con `validate`, `resolve`, `printSchema`, utilidades de atributos y todos los tipos de `ResolvedSchema`.

```ts
import { initCompiler, parse, validate, resolve, printSchema } from "@indigodb/core";

await initCompiler();

const ast = parse(`
Table User {
  id    Int    @id @default(autoincrement())
  email String @unique @note("Correo de usuario")
}
`);

const errors = validate(ast);
if (errors.length === 0) {
  const ir = resolve(ast); // ResolvedSchema
  const formatted = printSchema(ir);
  console.log(formatted);
}
```

### Exportaciones Principales

- **Ciclo de vida y Parsing**: `initCompiler`, `parse`, `parseWithSpans`, `IndigoParseError`
- **Validación y Resolución**: `validate(schema): ValidationError[]`, `resolve(schema): ResolvedSchema`
- **Impresión**: `printSchema(schema, options?: PrintOptions): string`, `IndigoPrintError`
- **Helpers de Atributos**: `getAttr`, `hasAttr`, `positionalArg`, `namedArg`, `asString`, `asReferenceList`, `firstString`
- **Tipos IR y Spans**: `ResolvedSchema`, `ResolvedTable`, `ResolvedColumn`, `ResolvedIndex`, `ResolvedRelation`, `ResolvedEnum`, `ResolvedEnumMember`, `ResolvedTableGroup`, `ResolvedDefault`, `ForeignKey`, `AllowRule`, `AllowAction`, `AllowOperand`, `ValidationError`, `SpanIndex`, `ModelSpan`, `FieldSpan`, `AttributeSpan`, `SourceSpan`

## Siguiente Paso

Explora el generador de código y el motor de migraciones en [Paquetes Generator y Migrator](/indigodb/packages/codegen-and-migrator).
