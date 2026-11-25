---
title: Autorix Argus — Fleet Control Plane & Audit Chain
navTitle: Argus (Control Plane)
description: Central governance plane managing engine enrollment tokens (aet_), gRPC fleet heartbeats, environments, operator sessions, and an immutable SHA-256 chained audit trail.
section: control-plane
order: 1
ports: "4400 / 50053"
protocol: "REST / gRPC"
---

**Autorix Argus** is the central governance and fleet control plane of the Autorix suite. It manages initial cluster claiming (`abt_` tokens), engine enrollment (`aet_` tokens), environment partitioning, operator authentication, continuous gRPC health heartbeats, and a tamper-evident **SHA-256 chained audit log** supporting SOC 2 and ISO 27001 evidence collection.

## Quick Path: Claim the Root Cluster

On first boot against an empty `autorix_argus` database, Argus seeds three default environments (`production`, `staging`, `development`) and emits a one-time bootstrap token (`abt_...`):

1. **Locate the bootstrap token** in Argus logs:

```bash
docker logs autorix-argus | grep -i "bootstrap token"
```

2. **Claim the root administrator account** (or complete the flow visually in Console at `/setup`):

```bash
curl -X POST http://localhost:4400/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "bootstrap_token": "abt_0123456789abcdef...",
    "name": "Cluster Administrator",
    "email": "admin@autorix.local",
    "password": "StrongMasterPassword#2026"
  }'
```

## Fleet Orchestration & Enrollment Tokens

Argus maintains real-time engine topology over gRPC (`:50053`), tracking instance heartbeats, build SHAs, readiness state, and environment membership. New engine instances join the fleet using single-use or bounded **Enrollment Tokens (`aet_...`)**:

```bash
curl -X POST http://localhost:4400/v1/enrollment-tokens \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "engine_type": "nexus",
    "environment": "production",
    "uses_allowed": 1,
    "expires_in_seconds": 86400
  }'
```

## Tamper-Evident SHA-256 Audit Chain

Every mutating administrative action across Autorix is appended to Argus's cryptographic ledger. Each record embeds the hash of the previous record:

```text
Record Hash = SHA-256(prev_hash + id + action + resource_type + resource_id + outcome + created_at)
```

Verify mathematical chain continuity across the entire ledger at any time:

```bash
curl -fsS http://localhost:4400/v1/audit/verify
```

If any row is modified, deleted, or reordered directly in PostgreSQL, verification fails immediately and identifies the broken link.

## REST (`:4400`) & gRPC (`:50053`) API Reference

### REST Endpoints

| Domain | Endpoints |
| :--- | :--- |
| **Fleet & Topology** | `GET /v1/instances`, `POST /v1/instances/{id}/force-remove`, `GET /v1/topology`, `GET /v1/stream` (SSE live updates) |
| **Environments** | `GET /v1/environments`, `POST /v1/environments`, `GET / DELETE /v1/environments/{id}` |
| **Enrollment Tokens** | `POST /v1/enrollment-tokens`, `GET /v1/enrollment-tokens`, `DELETE /v1/enrollment-tokens/{id}` |
| **Operator Sessions** | `POST /v1/auth/bootstrap`, `POST /v1/auth/login`, `GET /v1/auth/session`, `DELETE /v1/auth/session` |
| **Audit & Compliance** | `GET / POST /v1/audit`, `GET /v1/audit/verify`, `GET /v1/audit/export`, `GET /v1/compliance/evidence` |

> Starting in `v0.2.4`, `TouchSession` activity updates are throttled to once per minute to eliminate PostgreSQL row-lock contention during parallel Console BFF requests, and Argus sets an explicit `IdleTimeout: 60s` for clean keep-alive lifecycle with Node.js Undici.

### gRPC Control Plane (`:50053`)

Implements `argus.v1.ArgusControlService`:
- `Register(RegistrationRequest)`
- `Heartbeat(HeartbeatRequest)`
- `ListInstances(ListInstancesRequest)`
- `GetInstance(GetInstanceRequest)`
- `Evict(EvictRequest)`

## Verification Checklist

- [ ] Claim the root operator account using the one-time `abt_` token.
- [ ] Restrict Argus REST (`:4400`) and gRPC (`:50053`) to internal cluster networks only.
- [ ] Mint an `aet_` enrollment token and confirm engine heartbeats appear in `/v1/topology`.
- [ ] Run `GET /v1/audit/verify` and export sample compliance evidence via `GET /v1/compliance/evidence`.

## Next Step

Operate Argus and all 7 IAM engines visually with [Autorix Console](/autorix/control-plane/console).
