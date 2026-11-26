---
title: IndigoDB Studio y Guardas de Producción
navTitle: Studio y Seguridad
description: Inspecciona diagramas ER, edita schema.indigo de forma segura, navega tablas paginadas por cursor, ejecuta SQL de solo lectura y protege despliegues compartidos con @indigodb/studio y @indigodb/cli.
section: studio
order: 1
runtime: "SPA Visual (@indigodb/studio) + API HTTP"
npmPackages:
  - "@indigodb/studio"
  - "@indigodb/cli"
---

**IndigoDB Studio** ([`@indigodb/studio`](https://www.npmjs.com/package/@indigodb/studio)) es el espacio visual construido en React 19 + Vite y lanzado por `npx indigodb studio` ([`@indigodb/cli`](https://www.npmjs.com/package/@indigodb/cli)). En lugar de mantener generadores separados para diagramas ERD y documentación HTML, Studio unifica todo sobre tu esquema real y base PostgreSQL.

```bash
npx indigodb studio
# Abre http://127.0.0.1:5555 automáticamente
```

## Módulos Integrados en Studio

### 1. Diseñador ER y Editor `.indigo` en Vivo

- Renderiza modelos, columnas, claves primarias/foráneas, cardinalidad y contenedores coloreados por `TableGroup` con **React Flow** (`@xyflow/react`).
- Integra un **Monaco Editor** conectado en navegador a `@indigodb/core` (`@indigodb/compiler` WASM) para diagnósticos instantáneos.
- Guarda las posiciones arrastradas de cada tabla en un archivo lateral `schema.layout.json` junto al esquema (`GET`/`PUT /api/schema/layout`) con verificación optimista por hash (`409` ante escrituras obsoletas).
- Admite guardado directo de esquema (`PUT /api/schema/source`) con **redacción obligatoria del bloque `datasource`**: las credenciales nunca salen del servidor; el cliente conserva `// datasource redacted by Studio`, y el servidor reinyecta el bloque original en disco, valida con `@indigodb/core` y escribe atómicamente vía archivo temporal + `rename(2)`.

### 2. Explorador de Datos Paginado por Cursor

- Consulta `/api/tables/:name` mediante paginación keyset segura para claves primarias simples o compuestas (`limit` en `{25, 50, 100, 200}`, `direction` `forward` | `backward`, cursores `base64url`).
- Renombra columnas físicas `dbName` hacia los nombres lógicos del esquema.
- Permite crear, editar y eliminar filas (`/api/rows/:table` `POST`/`PATCH`/`DELETE`), exigiendo clave primaria declarada y bloqueando escritura manual en columnas `autoincrement`.
- Se suscribe al `RealtimeEngine` embebido para refrescar tablas `@@realtime` automáticamente.

### 3. Consola de Consultas SQL Protegida

- Ejecuta consultas a través de `POST /api/query` sobre un pool dedicado de solo lectura (`max: 4`).
- Fuerza `BEGIN; SET TRANSACTION READ ONLY; SET LOCAL statement_timeout = <ms>; ...; ROLLBACK` directamente en PostgreSQL, rechazando cualquier mutación oculta incluso dentro de CTEs.
- Limita resultados elegibles (`SELECT`/`WITH`/`TABLE`/`VALUES`) mediante `DECLARE _indigo_query_cursor NO SCROLL CURSOR FOR <sql>` + `FETCH FORWARD <cap + 1>` (indicando `truncated: true` si hay más filas).

### 4. Navegador de Documentación del Esquema

- Genera vistas detalladas por tabla con columnas, tipos, defaults, nulabilidad, insignias PK/FK/unique, descripciones `@note` / `@@note`, relaciones y previsualización DDL desde `ResolvedSchema`.

## Endurecimiento y Guardas para Entornos Compartidos

Por defecto, `indigodb studio` enlaza únicamente a loopback (`127.0.0.1:5555`) con validación estricta de la cabecera `Host`. Para exponer Studio en una red compartida o entorno de staging, aplica las guardas integradas:

```bash
INDIGODB_STUDIO_PASSWORD="secreto-robusto-operador" \
npx indigodb studio \
  --host 0.0.0.0 \
  --port 5555 \
  --read-only \
  --env staging \
  --query-timeout 15000 \
  --query-row-cap 500 \
  --no-open
```

### Matriz de Controles de Seguridad

| Control | Flag / Variable de Entorno | Por Defecto | Comportamiento |
| :--- | :--- | :--- | :--- |
| **Enlace Loopback** | `--host` / `INDIGODB_STUDIO_HOST` | `127.0.0.1` | Enlaces no-loopback (`0.0.0.0`, IP LAN) **salen con código 1 al iniciar** si falta `INDIGODB_STUDIO_PASSWORD` |
| **Autenticación de Sesión** | `INDIGODB_STUDIO_PASSWORD` | Sin definir (desactivada en loopback) | Protege todas las rutas `/api/*` (salvo `/api/auth/status` y `/api/auth/login`) con cookies firmadas `HttpOnly`, `SameSite=Strict` |
| **Modo Solo Lectura** | `--read-only` / `INDIGODB_STUDIO_READONLY` | `false` | Rechaza con `403` toda escritura en `/api/rows/*`, `PUT /api/schema/source` y `PUT /api/schema/layout`. Valores inválidos en env fallan al iniciar (`"1"\|"0"\|"true"\|"false"`) |
| **Timeout SQL** | `--query-timeout <ms>` / `INDIGODB_STUDIO_QUERY_TIMEOUT_MS` | `30000` (30s) | Aplicado vía `SET LOCAL statement_timeout` en `/api/query` y `/api/tables/:name` (`0` desactiva) |
| **Tope de Filas** | `--query-row-cap <n>` / `INDIGODB_STUDIO_QUERY_ROW_CAP` | `1000` | Límite por cursor para `/api/query` (`0` desactiva) |
| **Insignia de Entorno** | `--env <name>` / `INDIGODB_ENV` | Sin definir | Etiqueta visual informativa (`development`, `staging`, `production` o etiqueta ≤ 32 caracteres); no habilita ni bloquea acciones |
| **Log de Auditoría** | `--audit-log` / `--no-audit-log` / `INDIGODB_STUDIO_AUDIT_LOG` | Activo (`true`) | Emite una línea JSON (`kind: "studio.audit.write"`) en stdout por intento de escritura con nombres de columna, PKs stringificadas y correlador HMAC de sesión — **nunca valores de filas ni secretos** |

## Siguiente Paso

Consulta todos los comandos, flags y variables en la [Referencia CLI (`indigodb`)](/indigodb/cli/reference).
