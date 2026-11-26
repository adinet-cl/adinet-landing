---
title: IndigoDB — Suite PostgreSQL Schema-First
navTitle: Introducción y Visión General
description: Un único lenguaje de esquema .indigo impulsa un cliente ORM tipado en TypeScript, migraciones PostgreSQL versionadas con shadow DB, tiempo real sobre replicación lógica WAL + hooks de React y un Studio visual completo.
section: overview
order: 1
badge: v0.1.1
runtime: "Node.js >= 22 · PostgreSQL"
npmPackages:
  - "@indigodb/cli"
  - "@indigodb/client"
  - "@indigodb/react"
---

**IndigoDB** es un toolkit de base de datos todo-en-uno y **schema-first** para PostgreSQL construido alrededor de un único lenguaje `.indigo`. En lugar de dividir tu modelo de datos entre un esquema de ORM, scripts de migración independientes, diagramadores ERD y generadores de documentación, una sola fuente de verdad compila hacia cada capa de tu arquitectura.

Define tus tablas, relaciones, restricciones, tipos nativos de PostgreSQL, notas de documentación, políticas de seguridad a nivel de fila (`@@allow`) y suscripciones en tiempo real (`@@realtime`) una sola vez, y ejecuta todo el flujo desde [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli):

```bash
npx indigodb db push      # sincronización idempotente con PostgreSQL (prototipado)
npx indigodb migrate dev  # diff en shadow DB → migración SQL versionada
npx indigodb generate     # genera un cliente TypeScript fuertemente tipado
npx indigodb studio       # abre el espacio visual (diagrama ER, datos, SQL y docs)
npx indigodb realtime     # inicia el daemon SSE WAL + canales Presence/Broadcast
```

## Cómo se Integran las Piezas

Un único compilador escrito en Rust y compilado a WebAssembly ([`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler)) analiza y valida archivos `.indigo`, entregando una Representación Intermedia relacional unificada (`ResolvedSchema` en [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core)) a todas las herramientas del ecosistema:

```text
schema.indigo
      │
      ▼
@indigodb/compiler (Rust → WASM)  ──▶  @indigodb/parser (parse / IndigoParseError)
      │
      ▼
@indigodb/core (IR ResolvedSchema + validate + printSchema)
      │
      ├──▶ @indigodb/migrator   ──▶ DDL PostgreSQL (db push, migrate dev/deploy, db pull)
      ├──▶ @indigodb/generator  ──▶ IndigoClient tipado (sobre @indigodb/client)
      ├──▶ @indigodb/realtime   ──▶ WAL pgoutput SSE, /log firmado, Presence/Broadcast
      │          └──▶ @indigodb/client/realtime + @indigodb/react (seguros en navegador)
      └──▶ @indigodb/studio     ──▶ Diagrama ER, editor Monaco, datos, consola SQL y docs
```

## Paquetes Publicados en `@indigodb` (`v0.1.1`)

Los 11 paquetes de IndigoDB se publican juntos como un grupo versionado de forma sincronizada bajo la organización [`@indigodb`](https://www.npmjs.com/org/indigodb) en npm (`Node.js >= 22`, solo ESM):

| Paquete | Función | Entorno | Registro npm | Guía |
| :--- | :--- | :--- | :--- | :--- |
| [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) | Binario `indigodb` (`init`, `db`, `migrate`, `generate`, `realtime`, `studio`) | CLI Node.js | [npm ↗](https://www.npmjs.com/package/@indigodb/cli) | [Referencia CLI](/indigodb/cli/reference) |
| [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) | Runtime ORM (`IndigoClientBase`, adaptadores) y SDK `./realtime` | Servidor + `./realtime` Browser | [npm ↗](https://www.npmjs.com/package/@indigodb/client) | [Cliente ORM](/indigodb/orm/queries-and-mutations) |
| [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react) | Hooks React 18+ `useLiveTable` y `useChannel` (`useSyncExternalStore`) | Navegador / SSR-safe | [npm ↗](https://www.npmjs.com/package/@indigodb/react) | [Navegador y React](/indigodb/realtime/browser-and-react) |
| [`@indigodb/realtime`](https://www.npmjs.com/package/@indigodb/realtime) | Motor SSE WAL `pgoutput`, handles firmados, Presence/Broadcast y métricas | Servidor Node.js | [npm ↗](https://www.npmjs.com/package/@indigodb/realtime) | [Motor Tiempo Real](/indigodb/realtime/engine-and-wal) |
| [`@indigodb/migrator`](https://www.npmjs.com/package/@indigodb/migrator) | Motor de diff PostgreSQL, DDL, shadow replay e introspección | Node.js / PGlite | [npm ↗](https://www.npmjs.com/package/@indigodb/migrator) | [Guía de Migraciones](/indigodb/migrations/overview) |
| [`@indigodb/generator`](https://www.npmjs.com/package/@indigodb/generator) | Genera el cliente tipado `indigo.ts` desde `ResolvedSchema` | Tooling Node.js | [npm ↗](https://www.npmjs.com/package/@indigodb/generator) | [Codegen y Migrator](/indigodb/packages/codegen-and-migrator) |
| [`@indigodb/core`](https://www.npmjs.com/package/@indigodb/core) | IR relacional (`ResolvedSchema`), validación y `printSchema` | Node.js y Navegador | [npm ↗](https://www.npmjs.com/package/@indigodb/core) | [Compilador y Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/parser`](https://www.npmjs.com/package/@indigodb/parser) | Envoltorio `parse()` que lanza `IndigoParseError` con línea/columna | Node.js y Navegador | [npm ↗](https://www.npmjs.com/package/@indigodb/parser) | [Compilador y Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/compiler`](https://www.npmjs.com/package/@indigodb/compiler) | Compilador Rust → WASM (lexer, parser, resolver y spans UTF-16) | Node.js y Navegador | [npm ↗](https://www.npmjs.com/package/@indigodb/compiler) | [Compilador y Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/ast`](https://www.npmjs.com/package/@indigodb/ast) | Tipos puros de AST, `ScalarType`, `RelationType` y atributos | Isomórfico | [npm ↗](https://www.npmjs.com/package/@indigodb/ast) | [Compilador y Core](/indigodb/packages/compiler-and-core) |
| [`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio) | SPA React 19 precompilada servida por `indigodb studio` | SPA Navegador | [npm ↗](https://www.npmjs.com/package/@indigodb/studio) | [Guía de Studio](/indigodb/studio/workspace-and-security) |

## Ejemplo de Esquema `.indigo`

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
  email     String   @unique @db.VarChar(255) @note("Correo principal de acceso")
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

## Garantías Arquitectónicas Clave

- **Separación Estricta Servidor vs. Navegador**: El punto de entrada raíz [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) y el cliente generado `indigo.ts` son estrictamente código de servidor (`pg` + `node:async_hooks`). Las aplicaciones frontend importan únicamente [`@indigodb/client/realtime`](/indigodb/packages/runtime-and-ui#indigodbclientrealtime-seguro-en-navegador) o [`@indigodb/react`](https://www.npmjs.com/package/@indigodb/react), basados exclusivamente en Web APIs estándar.
- **SSE Solo de Despertar (Wake-Only)**: El stream SSE no autenticado emite señales sin datos (`{ table, op, lsn }`), nunca filas de base de datos. La lectura autenticada de eventos históricos exige handles firmados con HMAC-SHA256 (`mintHandle` / `verifyHandle`) junto con RLS de PostgreSQL.
- **Migraciones Verificadas con Shadow DB**: `indigodb migrate dev` reproduce el historial de migraciones en una base PGlite aislada en memoria y valida checksums SHA-256 en `_indigo_migrations` antes de calcular el siguiente diff.
- **Studio Endurecido por Defecto**: `indigodb studio` escucha solo en `127.0.0.1:5555`, rechaza enlaces externos sin `INDIGODB_STUDIO_PASSWORD`, ejecuta la consola SQL dentro de `SET TRANSACTION READ ONLY` con timeout y tope de filas por cursor, y emite logs de auditoría JSON en stdout.

## Siguientes Pasos

- Empieza en 5 minutos con la [Guía de Inicio Rápido](/indigodb/getting-started).
- Explora el pipeline del compilador y límites de paquetes en [Arquitectura Maestra](/indigodb/architecture).
- Domina la sintaxis completa en la [Referencia del Lenguaje `.indigo`](/indigodb/schema/language-reference).
- Consulta los 11 artefactos publicados en el [Catálogo de Paquetes `@indigodb`](/indigodb/packages/overview).
