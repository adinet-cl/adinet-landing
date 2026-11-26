---
title: Guía de Inicio Rápido (Node.js y TypeScript)
navTitle: Inicio Rápido
description: Instala @indigodb/cli y @indigodb/client, inicializa schema.indigo, sincroniza PostgreSQL, genera un cliente ORM tipado y explora tu esquema en IndigoDB Studio.
section: overview
order: 2
runtime: "Node.js >= 22 · PostgreSQL 16+"
npmPackages:
  - "@indigodb/cli"
  - "@indigodb/client"
---

Esta guía te lleva desde un backend Node.js / TypeScript vacío (NestJS, Express, Fastify o Node puro) hasta un esquema PostgreSQL activo, un cliente ORM generado y el entorno visual de Studio.

## Prerrequisitos

- **Node.js 22 o superior** (`engines.node: ">=22"` en todos los paquetes `@indigodb/*`)
- **Configuración ESM** (`"type": "module"` en `package.json` o compilación TypeScript compatible con Node ESM)
- **Instancia PostgreSQL accesible** (PostgreSQL 14+ recomendado; PostgreSQL 16+ para replicación lógica WAL en `@@realtime`)

Si necesitas una base PostgreSQL local temporal con Docker:

```bash
docker run -d \
  --name indigodb-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydb \
  -p 5432:5432 \
  postgres:16 -c wal_level=logical
```

> Incluir `-c wal_level=logical` habilita la replicación lógica desde el arranque para que los modelos `@@realtime` funcionen de inmediato sin reiniciar el contenedor.

## 1. Instalar los Paquetes

Instala [`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli) como dependencia de desarrollo y [`@indigodb/client`](https://www.npmjs.com/package/@indigodb/client) en tiempo de ejecución:

```bash
npm install -D @indigodb/cli
npm install @indigodb/client
```

O con `pnpm`:

```bash
pnpm add -D @indigodb/cli
pnpm add @indigodb/client
```

## 2. Inicializar `schema.indigo` y `.env`

```bash
npx indigodb init
```

Genera dos archivos en el directorio actual (y aborta de forma segura si `schema.indigo` ya existe):

- `schema.indigo`: Esquema inicial con `datasource db`, `generator client`, `enum UserRole`, `Table User`, `Table Post` y `TableGroup "Core"`.
- `.env`: Plantilla con `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb"`.

## 3. Sincronizar el Esquema con PostgreSQL

Durante el prototipado inicial, utiliza `db push` para aplicar tu esquema de manera idempotente sin crear archivos de migración:

```bash
# Previsualizar el SQL generado (opcional)
npx indigodb db push --print

# Crear tablas, enums, índices y claves foráneas
npx indigodb db push
```

> Para entornos de staging y producción con historial versionado, verificación de checksums y shadow DB, pasa a [`indigodb migrate dev` y `indigodb migrate deploy`](/indigodb/migrations/overview).

## 4. Generar el Cliente TypeScript Tipado

```bash
npx indigodb generate
```

Por defecto, `generate` escribe en la ruta `output` configurada en el bloque `generator client` (`src/generated/indigo.ts`). Vuelve a ejecutar `npx indigodb generate` cada vez que modifiques `schema.indigo`.

## 5. Ejecutar Consultas Tipadas desde el Backend

Importa `IndigoClient` desde el archivo generado. Lee `process.env.DATABASE_URL` y administra su propio `pg.Pool` automáticamente:

```ts
import { IndigoClient } from "./generated/indigo.js";

const db = new IndigoClient();

// Crear un registro con tipos estrictos y valores por defecto en PostgreSQL
const user = await db.user.create({
  data: {
    email: "alice@acme.dev",
    name: "Alice",
    role: "ADMIN",
  },
});

// Consultar con filtros, include de relaciones y narrowing automático de select
const recentAdmins = await db.user.findMany({
  where: {
    role: "ADMIN",
    email: { contains: "acme.dev" },
  },
  include: {
    posts: {
      select: { id: true, title: true },
    },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
});

console.log({ user, recentAdmins });

await db.$disconnect();
```

## 6. Explorar Visualmente en IndigoDB Studio

Lanza el entorno visual conectado a tu `schema.indigo` y base PostgreSQL real:

```bash
npx indigodb studio
```

Studio se inicia en `http://127.0.0.1:5555` y abre automáticamente el navegador con cuatro herramientas integradas:

- **Diseñador ER**: Diagrama interactivo con React Flow agrupado por colores de `TableGroup` junto a un editor Monaco `.indigo` en vivo.
- **Explorador de Datos**: Visor paginado por cursor sobre clave primaria y editor de registros (`POST`/`PATCH`/`DELETE`).
- **Consola SQL**: Ejecutor de consultas de solo lectura (`SET TRANSACTION READ ONLY`) con límites de tiempo y filas.
- **Documentación del Esquema**: Navegador autogenerado de columnas, notas `@note`, restricciones, índices y relaciones.

## Siguiente Paso

Comprende el compilador Rust/WASM y la arquitectura de los 11 paquetes en [Arquitectura Maestra](/indigodb/architecture), o revisa la [Referencia del Lenguaje `.indigo`](/indigodb/schema/language-reference).
