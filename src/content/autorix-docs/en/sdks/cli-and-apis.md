---
title: CLI, Terraform Provider & Direct APIs
navTitle: CLI, Terraform & Direct APIs
description: Operate Autorix with autorixctl, provision environments, policies, and OAuth clients with terraform-provider-autorix, or call REST and gRPC contracts directly.
section: sdks
order: 5
---

In addition to language SDKs, Autorix ships a lightweight control-plane CLI (`autorixctl`), an Infrastructure-as-Code provider (`terraform-provider-autorix`), and open REST + Protobuf/gRPC contracts for any language.

## `autorixctl` CLI

Source path: `cmd/autorixctl`

### Build from Source

```bash
go build -o autorixctl ./cmd/autorixctl
```

### Supported Commands

```bash
# Evaluate a Nexus relationship check
autorixctl check --ns documents --obj document-42 --rel viewer --subj user-7

# Mint an Argus enrollment token (aet_)
autorixctl token mint --engine nexus --env production --description "nexus worker"

# Query or mathematically verify the Argus SHA-256 audit trail
autorixctl audit list
autorixctl audit verify
```

> Use the exact flags above (`--ns`, `--obj`, `--rel`, `--subj`, `token mint`, `audit list`, `audit verify`). Plural aliases like `tokens mint` or `--namespace` are not implemented.

## Terraform Provider

Source path: `terraform-provider-autorix` (implemented in `v0.2.0+`)

The Autorix Terraform provider manages control-plane resources declaratively over authenticated HTTP CRUD APIs (`Authorization: Bearer` and `X-Autorix-Internal-Token`).

### Configuration Environment Variables

| Variable | Description |
| :--- | :--- |
| `AUTORIX_ENDPOINT` | Base fallback endpoint URL |
| `AUTORIX_ARGUS_URL` | Argus REST endpoint (`:4400`) for environments |
| `AUTORIX_THEMIS_URL` | Themis REST endpoint (`:4488`) for CEL policies |
| `AUTORIX_JANUS_ADMIN_URL` | Private Janus admin endpoint (`:4445`) for OAuth2 clients |
| `AUTORIX_API_TOKEN` / `AUTORIX_INTERNAL_AUTH_SECRET` | Operator or internal authentication token |

### Supported Resources

| Resource | Backed Engine | Key Attributes |
| :--- | :--- | :--- |
| `autorix_environment` | Argus (`/v1/environments`) | `id` (computed), `name` (required), `slug`, `description`, `tier` |
| `autorix_policy` | Themis (`/policies`) | `id` (computed), `tenant_id`, `name`, `description`, `expression`, `active` |
| `autorix_oauth2_client` | Janus (`/admin/clients`) | `client_id`, `client_name`, `client_secret` (sensitive), `redirect_uris`, `grant_types`, `scopes`, `is_public` |

### Provider CLI Inspection

```bash
go build -o terraform-provider-autorix ./terraform-provider-autorix

./terraform-provider-autorix -version
./terraform-provider-autorix -schema
./terraform-provider-autorix -check -endpoint http://localhost:4400
```

## Direct REST Integration

For languages without an official SDK (Rust, Java, .NET, PHP, Ruby), call engine REST endpoints directly and implement fail-closed error handling:

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

> Never treat a network timeout or non-2xx HTTP status as authorization. Always fail closed and log the error.

## Direct gRPC Integration

Protobuf contracts live under `api/autorix/<service>/v1/*.proto` (Argus `:50053`, Nexus `:50051`, Themis `:50052`). Generate strongly typed clients with `protoc` or `buf` for your target language.

## Next Step

Prepare Day-1 and Day-2 operations in the [Operations & Runbook](/autorix/operations/runbook).
