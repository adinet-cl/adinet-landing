---
title: Arquitectura Maestra y Pipeline del Compilador
navTitle: Arquitectura Maestra
description: Comprende el compilador Rust-to-WASM de IndigoDB, el contrato central ResolvedSchema IR, el grafo de dependencias de los 11 paquetes npm y los límites de seguridad entre servidor y navegador.
section: overview
order: 3
runtime: "Rust/WASM + TypeScript ESM"
npmPackages:
  - "@indigodb/compiler"
  - "@indigodb/parser"
  - "@indigodb/core"
---

IndigoDB está diseñado como un monorepo estrictamente por capas donde **una única Representación Intermedia (`ResolvedSchema`)** conecta un compilador `.indigo` en Rust/WebAssembly con un ecosistema modular en TypeScript y React.

## Pipeline del Compilador e IR

En lugar de permitir que el migrador, el generador de código, el motor en tiempo real y Studio vuelvan a interpretar el texto `.indigo` por separado, toda la semántica se resuelve una única vez hacia `ResolvedSchema`:

```text
  texto fuente .indigo
         │
         ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │ crates/indigo-compiler (Rust → wasm32-unknown-unknown vía wasm-pack) │
  │   lexer.rs (logos) → parser.rs → validate.rs → resolve.rs            │
  └──────────────────────────────┬───────────────────────────────────────┘
                                 │ sobres JSON ({ ok } / { errors })
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │ @indigodb/compiler (Node sync initSync / Browser async initCompiler) │
  └──────────────────────────────┬───────────────────────────────────────┘
                                 │ Schema AST + SpanIndex UTF-16
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │ @indigodb/parser (lanza IndigoParseError con ubicación exacta)       │
  └──────────────────────────────┬───────────────────────────────────────┘
                                 │
                                 ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │ @indigodb/core (IR ResolvedSchema, validate(), resolve(), printSchema)
  └───────┬──────────────────┬──────────────────┬────────────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
  @indigodb/migrator  @indigodb/generator  @indigodb/realtime  @indigodb/studio
  (DDL PostgreSQL)    (codegen indigo.ts)  (WAL pgoutput SSE)  (ERD/Docs/Datos)
```

### Por Qué Rust + WASM

- **Recuperación multi-error por pasada**: El parser descendente recursivo (`crates/indigo-compiler/src/parser.rs`) se recupera en límites de declaración y devuelve múltiples diagnósticos con `line`, `column`, `endLine` y `endColumn` en una sola ejecución.
- **Semántica idéntica en CLI y Navegador**: Tanto `indigodb` en Node.js como el editor Monaco dentro de `@indigodb/studio` ejecutan exactamente el mismo binario WebAssembly (`indigo_compiler_bg.wasm`), evitando divergencias entre cliente y servidor.
- **Spans UTF-16 sin contaminar el AST**: `parseSchemaWithSpans()` devuelve un canal lateral `SpanIndex` con offsets UTF-16 compatibles directamente con `String.prototype.slice()` en JavaScript.

## Capas de Dependencia de Paquetes

Cada paquete de la organización `@indigodb` compila a ESM estricto (`"type": "module"`) para `Node >= 22`:

| Capa | Paquetes | Dependencias | Propósito |
| :--- | :--- | :--- | :--- |
| **0 · Contrato** | [`@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) | Ninguna | Interfaces AST puras (`Schema`, `Model`, `Field`, `Attribute`, `ScalarType`) |
| **1 · Compilador** | [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) | `@indigodb/ast` | Wrapper WASM con exports condicionales para Node (síncrono) y navegador (asíncrono) |
| **2 · Parser** | [`@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) | `@indigodb/ast`, `@indigodb/compiler` | Lanza `IndigoParseError` con diagnósticos 1-based |
| **3 · Hub IR** | [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) | `ast`, `compiler`, `parser` | IR `ResolvedSchema`, `validate()`, `resolve()`, `printSchema()`, `parseWithSpans()` |
| **4 · Motores** | [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator), [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) | `@indigodb/ast`, `@indigodb/core` (+ `@electric-sql/pglite` en migrator) | Diff/push/shadow/introspección PostgreSQL y generación del cliente TS |
| **5 · Servidor Realtime** | [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) | `core`, `migrator`, `pg`, `pg-logical-replication` | `WalSource` (`pgoutput`), SSE fan-out, handles HMAC, Presence/Broadcast |
| **6 · Runtime y React** | [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client), [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) | `client` usa `realtime` + `pg`; `react` usa `@indigodb/client/realtime` | Delegados ORM de servidor + subruta `./realtime` segura en navegador y hooks React |
| **7 · Visual y CLI** | [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio), [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) | `cli` incluye `core`, `parser`, `generator`, `migrator`, `realtime`, `studio` | Binario `indigodb` y SPA compilada React 19 de Studio |

## Límites de Seguridad y Empaquetado

IndigoDB impone tres fronteras de seguridad directamente en la estructura de sus paquetes:

### 1. ORM Solo-Servidor vs. Realtime Seguro en Navegador

- **Solo servidor**: El punto de entrada raíz `@indigodb/client` y tu archivo generado `src/generated/indigo.ts` importan estáticamente `pg` y `node:async_hooks`. Intentar empaquetarlos para navegador fallará intencionalmente.
- **Seguro en navegador**: `@indigodb/client/realtime`, `@indigodb/realtime/protocol` y `@indigodb/react` utilizan únicamente Web APIs estándar (`fetch`, `ReadableStream`, `TextDecoder`, `AbortController`, `URL`, `atob`) sin dependencias de `pg` ni `node:*`.

### 2. SSE Solo de Despertar vs. Replay con Handle Firmado

El endpoint SSE (`GET /api/realtime`) no está autenticado y **nunca transmite datos de filas** (`new` ni `old`), independientemente de si la tabla tiene `@@allow`. Solo emite frames de despertar (`{ table, op, lsn }`) para que el cliente consulte tu API autenticada o solicite filas vía `/api/realtime/log` con un handle HMAC-SHA256 emitido en servidor (`mintHandle` / `verifyHandle`).

### 3. Redacción de `datasource` en Studio

Cuando `indigodb studio` sirve el texto `.indigo` al editor web (`GET /api/schema/source`), elimina el bloque `datasource { ... }` completo y lo reemplaza por `// datasource redacted by Studio`. Al guardar (`PUT /api/schema/source`), el servidor valida la versión SHA-256 `X-Indigo-Schema-Version`, rechaza cualquier bloque `datasource` literal enviado desde el cliente, reinyecta el bloque original en disco, valida mediante `@indigodb/core` y escribe atómicamente con archivo temporal + `rename(2)`.

## Siguiente Paso

Explora la especificación completa del lenguaje en la [Referencia del Lenguaje `.indigo`](/indigodb/schema/language-reference) o pasa a [Consultas y Mutaciones del ORM](/indigodb/orm/queries-and-mutations).
