---
title: "Referencia de la Organización npm @indigodb"
navTitle: Visión General Paquetes npm
description: Catálogo completo de los 11 paquetes sincronizados publicados en npm bajo @indigodb (v0.1.1) — perfiles de instalación, límites de entorno y enlaces al registro oficial.
section: packages
order: 1
badge: 11 paquetes
runtime: "npm @indigodb/* v0.1.1"
npmPackages:
  - "@indigodb/cli"
  - "@indigodb/client"
  - "@indigodb/react"
  - "@indigodb/studio"
---

Los 11 módulos de IndigoDB están publicados en npm bajo la organización [`@indigodb`](https://www.npmjs.com/org/indigodb) como un **grupo de versión fija (`v0.1.1`)** con requisito de **Node.js >= 22** y **ESM (`"type": "module"`)**. El versionado conjunto garantiza compatibilidad exacta entre `@indigodb/cli`, `@indigodb/studio`, `@indigodb/client`, `@indigodb/core` y el resto de paquetes.

## Elige Tu Perfil de Instalación

### Aplicación Backend (ORM + CLI + Studio)

```bash
npm install @indigodb/client
npm install -D @indigodb/cli
```

### Frontend / Aplicación React en Tiempo Real (Seguro en Navegador)

```bash
npm install @indigodb/react @indigodb/client
```

> Importa únicamente desde `@indigodb/react` o `@indigodb/client/realtime` en código de cliente — nunca desde la entrada raíz `@indigodb/client` de servidor.

### Servidor Realtime Personalizado en Node.js

```bash
npm install @indigodb/realtime @indigodb/core
```

### Herramientas de Esquema, Linting, Codegen y Pipelines

```bash
npm install @indigodb/core @indigodb/migrator @indigodb/generator
```

## Catálogo Completo en npm (`@indigodb/*`)

| Paquete npm | Versión | Descripción | Subrutas Exportadas | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| [`@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) | `0.1.1` | Interfaces AST puras `.indigo`, `ScalarType`, `RelationType`, `SCALAR_TYPES` | `.` | [Compilador y Core](/indigodb/packages/compiler-and-core#indigodbast) |
| [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) | `0.1.1` | Compilador Rust → WASM con entradas síncrona (Node) y asíncrona (Navegador) | `.` | [Compilador y Core](/indigodb/packages/compiler-and-core#indigodbcompiler) |
| [`@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) | `0.1.1` | API `parse(source)` que lanza `IndigoParseError` con línea/columna | `.` | [Compilador y Core](/indigodb/packages/compiler-and-core#indigodbparser) |
| [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) | `0.1.1` | IR `ResolvedSchema`, `validate()`, `resolve()`, `printSchema()`, `parseWithSpans()` | `.` | [Compilador y Core](/indigodb/packages/compiler-and-core#indigodbcore) |
| [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) | `0.1.1` | `generateClient(resolved)` que emite el cliente ORM tipado `indigo.ts` | `.` | [Codegen y Migrator](/indigodb/packages/codegen-and-migrator#indigodbgenerator) |
| [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) | `0.1.1` | DDL `db push`, diff/plan versionado, shadow replay e `introspectResolvedSchema` | `.` | [Codegen y Migrator](/indigodb/packages/codegen-and-migrator#indigodbmigrator) |
| [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) | `0.1.1` | Runtime ORM servidor (`IndigoClientBase`, `pg`/`PGlite`) y SDK `./realtime` | `.`, `./realtime` | [Runtime y UI](/indigodb/packages/runtime-and-ui#indigodbclient) |
| [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) | `0.1.1` | `RealtimeEngine` WAL `pgoutput`, handles firmados, Presence/Broadcast y métricas | `.`, `./protocol` | [Runtime y UI](/indigodb/packages/runtime-and-ui#indigodbrealtime) |
| [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) | `0.1.1` | Hooks React 18+ seguros en navegador (`useLiveTable`, `useChannel`) | `.` | [Runtime y UI](/indigodb/packages/runtime-and-ui#indigodbreact) |
| [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) | `0.1.1` | Binario `indigodb` (`init`, `db`, `migrate`, `generate`, `realtime`, `studio`) | `.` (`bin: indigodb`) | [Runtime y UI](/indigodb/packages/runtime-and-ui#indigodbcli) |
| [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio) | `0.1.1` | SPA visual React 19 precompilada servida por `indigodb studio` | Bundle SPA `dist/` | [Runtime y UI](/indigodb/packages/runtime-and-ui#indigodbstudio) |

## Mapeo al Repositorio Fuente

Todos los paquetes se mantienen en [`github.com/chechooxd/indigo`](https://github.com/chechooxd/indigo):

- `packages/{ast,compiler,parser,core,migrator,generator,client,realtime,react,cli}`
- `apps/studio` → publicado en npm como [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio)
- `crates/indigo-compiler` → crate Rust compilado dentro de [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) (`wasm/indigo_compiler_bg.wasm`)

## Siguiente Paso

Explora la referencia técnica de cada capa:
- [Tooling de Esquema: `@indigodb/ast`, `compiler`, `parser`, `core`](/indigodb/packages/compiler-and-core)
- [Codegen y Migraciones: `@indigodb/generator` y `@indigodb/migrator`](/indigodb/packages/codegen-and-migrator)
- [Runtime, Tiempo Real y UI: `@indigodb/client`, `realtime`, `react`, `cli`, `studio`](/indigodb/packages/runtime-and-ui)
