---
title: CLI, Provider de Terraform y APIs Directas
navTitle: CLI, Terraform y APIs Directas
description: Opera Autorix mediante autorixctl, aprovisiona entornos, políticas y clientes OAuth con terraform-provider-autorix o invoca contratos REST y gRPC directamente.
section: sdks
order: 5
---

Además de los SDKs por lenguaje, Autorix proporciona un CLI ligero para el plano de control (`autorixctl`), un proveedor de Infraestructura como Código (`terraform-provider-autorix`) y contratos abiertos REST + Protobuf/gRPC utilizables desde cualquier lenguaje.

## CLI `autorixctl`

Ruta en repositorio: `cmd/autorixctl`

### Compilar desde Código Fuente

```bash
go build -o autorixctl ./cmd/autorixctl
```

### Comandos Implementados

```bash
# Evaluar una comprobación de relación en Nexus
autorixctl check --ns documents --obj document-42 --rel viewer --subj user-7

# Emitir un token de enrolamiento (aet_) en Argus
autorixctl token mint --engine nexus --env production --description "nexus worker"

# Consultar o verificar matemáticamente la cadena SHA-256 de Argus
autorixctl audit list
autorixctl audit verify
```

> Utiliza exactamente las banderas anteriores (`--ns`, `--obj`, `--rel`, `--subj`, `token mint`, `audit list`, `audit verify`). Alias plurales como `tokens mint` o `--namespace` no están implementados.

## Provider de Terraform

Ruta en repositorio: `terraform-provider-autorix` (disponible desde `v0.2.0`)

El provider gestiona recursos del plano de control de manera declarativa sobre APIs HTTP CRUD autenticadas (`Authorization: Bearer` y `X-Autorix-Internal-Token`).

### Variables de Entorno de Configuración

| Variable | Descripción |
| :--- | :--- |
| `AUTORIX_ENDPOINT` | URL base por defecto |
| `AUTORIX_ARGUS_URL` | Endpoint REST de Argus (`:4400`) para entornos |
| `AUTORIX_THEMIS_URL` | Endpoint REST de Themis (`:4488`) para políticas CEL |
| `AUTORIX_JANUS_ADMIN_URL` | Endpoint administrativo privado de Janus (`:4445`) para clientes OAuth2 |
| `AUTORIX_API_TOKEN` / `AUTORIX_INTERNAL_AUTH_SECRET` | Token de operador o secreto interno de autenticación |

### Recursos Soportados

| Recurso | Motor Subyacente | Atributos Principales |
| :--- | :--- | :--- |
| `autorix_environment` | Argus (`/v1/environments`) | `id` (calculado), `name` (requerido), `slug`, `description`, `tier` |
| `autorix_policy` | Themis (`/policies`) | `id` (calculado), `tenant_id`, `name`, `description`, `expression`, `active` |
| `autorix_oauth2_client` | Janus (`/admin/clients`) | `client_id`, `client_name`, `client_secret` (sensible), `redirect_uris`, `grant_types`, `scopes`, `is_public` |

### Inspección desde el Binario del Provider

```bash
go build -o terraform-provider-autorix ./terraform-provider-autorix

./terraform-provider-autorix -version
./terraform-provider-autorix -schema
./terraform-provider-autorix -check -endpoint http://localhost:4400
```

## Integración Directa por REST

Para lenguajes sin SDK oficial (Rust, Java, .NET, PHP, Ruby), invoca los endpoints REST directamente implementando manejo *fail-closed*:

```bash
curl --fail-with-body \
  --request POST http://localhost:8080/check \
  --header 'Content-Type: application/json' \
  --data '{
    "namespace": "documents",
    "object": "document-42",
    "relation": "viewer",
    "subject_id": "user-7",
    "subject_namespace": "user"
  }'
```

> Nunca interpretes un error de red o código HTTP distinto de 2xx como autorización válida. Falla siempre en modo cerrado y registra el incidente.

## Integración Directa por gRPC

Los contratos Protobuf viven en `api/autorix/<servicio>/v1/*.proto` (Argus `:50053`, Nexus `:50051`, Themis `:50052`). Genera clientes tipados para tu lenguaje con `protoc` o `buf`.

## Siguiente Paso

Prepara la operación Día 1 y Día 2 en el [Runbook Operativo](/autorix/operations/runbook).
