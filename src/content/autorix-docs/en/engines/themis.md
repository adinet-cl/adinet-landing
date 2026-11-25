---
title: Autorix Themis — ABAC Policy Engine (CEL)
navTitle: Themis (ABAC CEL)
description: Sub-millisecond Attribute-Based Access Control (ABAC) policy engine powered by Google Common Expression Language (CEL), priority rings, versioning, rollback, and test fixtures.
section: engines
order: 2
ports: "4488 / 50052"
protocol: "REST / gRPC"
---

**Autorix Themis** evaluates contextual, attribute-based authorization policies with sub-millisecond latency. Powered by **Google Common Expression Language (CEL)**, it offers multi-tenant isolation, deterministic priority rings, immutable policy versioning with instant rollback, and built-in test fixture suites.

## Quick Path: Create and Evaluate a Policy

Themis serves REST on port `4488` and gRPC on port `50052`.

1. **Create a CEL policy** (`POST /policies`):

```json
{
  "tenant_id": "default",
  "name": "Block Suspicious Geos",
  "expression": "!['US', 'CA', 'CL', 'BR', 'AR', 'EU'].exists(c, c == context.country_code)",
  "priority": 1,
  "enabled": true
}
```

2. **Evaluate runtime context** (`POST /policies/evaluate`):

```json
{
  "tenant_id": "default",
  "policy_id": "pol_finance_mfa_lockdown",
  "payload": {
    "request": { "auth": { "mfa": true } },
    "context": { "country_code": "CL" }
  }
}
```

## Architecture & Deterministic Priority Rings

Themis compiles and type-checks CEL expressions upfront, then evaluates active tenant policies in ascending priority order (lower priority number evaluates first):

```text
       [ Authorization Request / Context ]
                        │
                        ▼ (REST :4488 / gRPC :50052)
       ┌────────────────────────────────────────────────────────┐
       │                     Autorix Themis                     │
       │                                                        │
       │  ┌──────────────────────┐  ┌────────────────────────┐  │
       │  │ CEL Compiler         │  │ Policy Version Vault   │  │
       │  │ & Type Checker       │  │ (Audit Trail & History)│  │
       │  └──────────┬───────────┘  └────────────────────────┘  │
       │             │                                          │
       │  ┌──────────▼───────────┐  ┌────────────────────────┐  │
       │  │ Priority Ring Engine │  │ Automated Test Suites  │  │
       │  │ (Evaluates 1..N)     │  │ & Policy Fixtures      │  │
       │  └──────────┬───────────┘  └────────────────────────┘  │
       └─────────────┼──────────────────────────────────────────┘
                     │
                     ▼
          [ Decision: Allow / Deny ]
```

## Standard CEL Context Variables

Themis injects strongly typed namespaces into every CEL policy expression:

| Variable | Type | Description |
| :--- | :--- | :--- |
| `request.auth` | `map` | Identity and authentication claims from JWT/Session (e.g., `request.auth.claims.department == "finance"`, `request.auth.mfa == true`) |
| `request.ip` | `string` | Source client IP address |
| `request.method` | `string` | HTTP verb or RPC method |
| `request.time` | `timestamp` | UTC timestamp of evaluation |
| `resource` | `map` | Target resource attributes (e.g., `resource.amount`, `resource.classification`) |
| `context` | `map` | Custom key-value runtime environment parameters (e.g., `context.geo_country`, `context.is_break_glass`) |

## Complete REST (`:4488`) & gRPC (`:50052`) Reference

| Operation | Endpoint | Description |
| :--- | :--- | :--- |
| List policies | `GET /policies` | Cursor-paginated tenant policies |
| Create policy | `POST /policies` | Compile, validate, and persist a CEL policy |
| Read / update / delete | `GET / PUT / DELETE /policies/{id}` | Updates automatically snapshot the previous version |
| Evaluate ring | `POST /policies/evaluate` | Evaluate active policies against a runtime payload |
| Compile & validate | `POST /policies/validate` | Syntax and type check a CEL expression without saving |
| Dry-run test | `POST /policies/dry-run` | Execute a transient CEL expression against sample input |
| Version history | `GET /policies/{id}/versions` | List all immutable historical snapshots |
| Rollback | `POST /policies/{id}/rollback/{version}` | Zero-downtime restore of a prior version |
| Test fixtures | `/policies/{id}/fixtures`, `/policies/{id}/test-suite` | Manage and execute automated policy regression assertions |

Over gRPC (`:50052`), `themis.v1.ThemisService` exposes `Evaluate`, `ValidateExpression`, `ListPolicies`, `GetPolicy`, and `CreatePolicy`, alongside `grpc.health.v1.Health`.

## Production CEL Recipes

- **Emergency Break-Glass Access**:
  ```js
  context.is_break_glass == true && request.auth.claims.security_clearance >= 3
  ```
- **Time-Bound High-Value Transfer**:
  ```js
  request.auth.claims.role == "finance_officer" && request.auth.mfa == true && request.time.hour >= 9 && request.time.hour <= 17 && resource.amount <= 1000000.0
  ```
- **Subnet Isolation & Geo-Fencing**:
  ```js
  request.ip.startsWith("10.240.") && ['US', 'CL', 'BR'].exists(c, c == context.geo_country)
  ```

## Implementation Checklist

- [ ] Validate all CEL expressions with `POST /policies/validate` before saving.
- [ ] Ensure injected payload namespaces (`request`, `resource`, `context`) match expression references.
- [ ] Attach automated test fixtures and run `/policies/{id}/test-suite` before production rollout.
- [ ] Manage repeatable policies as code with the [Autorix Terraform Provider](/autorix/sdks/cli-and-apis#terraform-provider).

## Next Step

Manage user identities and traits in [Autorix Ego](/autorix/engines/ego) or wire policy enforcement at ingress in [Autorix Aegis](/autorix/engines/aegis).
