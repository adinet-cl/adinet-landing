---
title: Master Architecture & Integration Map
navTitle: Master Architecture
description: Understand how the 9 Autorix services communicate across the Zero-Trust edge request pipeline, port matrix, hexagonal Go layout, and credential prefix standards.
section: overview
order: 3
---

This guide serves as the architectural map for integrating the Autorix Zero-Trust ecosystem—tracing every request from edge ingress through authentication, fine-grained authorization, header signing, and cryptographic audit logging.

## End-to-End Edge Request Pipeline

When a client calls a protected API, the request flows through a decoupled, verifiable pipeline:

1. **Client Request**: The caller sends a request to `https://api.enterprise.corp/resource`, terminated by **Aegis PEP** on port `4455`.
2. **Authentication**: **Aegis** validates credentials via **Janus** (RS256 JWT access tokens), **Vulcan** (HMAC-SHA256 Macaroon API keys), or **Ego** (sessions). Invalid tokens abort immediately with `401 Unauthorized`.
3. **Authorization**: **Aegis** evaluates fine-grained permissions in milliseconds against **Nexus** (Zanzibar ReBAC graph) and/or **Themis** (contextual Google CEL ABAC). Denied requests abort with `403 Forbidden`.
4. **Header Mutation & Signing**: **Aegis** strips untrusted client headers, injects verified identity headers (`X-User-ID`, `X-User-Email`, `X-User-Roles`), attaches a canonical `v1` HMAC-SHA256 `X-Autorix-Identity-Signature`, and proxies traffic upstream.
5. **Audit Trail**: Mutating actions are recorded in **Argus**, chained cryptographically via SHA-256 for forensic integrity.

## Service & Port Matrix

| Service | Ports | Isolation DB | Primary Responsibility | Guide |
| :--- | :--- | :--- | :--- | :--- |
| **Aegis** | `4455` (Proxy), `4456` (Admin) | Stateless / rules store | Edge PEP, route matching, header signing & mutation | [Aegis](/autorix/engines/aegis) |
| **Console** | `3000` (HTTP) | None (BFF) | Zero-Trust Admin UI, Studio workspaces, live Merkle verifier | [Console](/autorix/control-plane/console) |
| **Argus** | `4400` (REST), `50053` (gRPC) | `autorix_argus` | Fleet control plane, enrollment tokens, SHA-256 audit trail | [Argus](/autorix/control-plane/argus) |
| **Nexus** | `8080` (REST), `50051` (gRPC) | `autorix_nexus` | Google Zanzibar ReBAC graph traversal & CEL caveats | [Nexus](/autorix/engines/nexus) |
| **Themis** | `4488` (REST), `50052` (gRPC) | `autorix_themis` | Deterministic priority-ring ABAC powered by Google CEL | [Themis](/autorix/engines/themis) |
| **Ego** | `4433` (REST) | `autorix_ego` | Identity lifecycle, JSON Schema traits, Argon2id, TOTP, WebAuthn | [Ego](/autorix/engines/ego) |
| **Janus** | `4444` (Public), `4445` (Admin) | `autorix_janus` | OAuth 2.0 / OIDC server, PKCE S256, RS256 JWKS rotation | [Janus](/autorix/engines/janus) |
| **Vulcan** | `4466` (REST) | `autorix_vulcan` | Prefixed API keys & offline-attenuable Macaroons | [Vulcan](/autorix/engines/vulcan) |
| **Hermes** | `4477` (REST / XML) | `autorix_hermes` | SAML 2.0 Web SSO & SCIM 2.0 directory synchronization | [Hermes](/autorix/engines/hermes) |

## Hexagonal Go Microservice Pattern

Every Go engine (`argus`, `aegis`, `ego`, `hermes`, `janus`, `nexus`, `themis`, `vulcan`) follows a strict hexagonal layout with zero shared databases and a shared `platform/` utility module:

```text
<service>/
  cmd/<service>d/main.go            # Entrypoint and dependency wiring
  internal/core/                    # Framework-free domain logic
  internal/<domain>/                # Domain-specific packages (e.g. credential, crypto)
  internal/storage/postgres/        # Isolated PostgreSQL persistence adapter
  internal/transport/http/          # REST handlers & internal-auth middleware
  internal/transport/grpc/          # gRPC handlers (argus, nexus, themis)
  migrations/                       # SQL schema migrations
  api/autorix/<service>/v1/*.proto  # Protobuf / gRPC service contracts
```

Shared cross-cutting concerns live in `platform/`: structured logging, uniform health probes (`/health/alive`, `/health/ready`, `/info`), Prometheus metrics, request correlation IDs, graceful shutdown, PostgreSQL bootstrap retry, and internal service authentication (`platform/httpx.InternalAuth` & `platform/tls.UnaryInternalAuthInterceptor`).

## Credential & Token Prefix Standards

All Autorix credentials use deterministic prefixes to simplify observability, auditing, and automated secret scanning:

| Prefix | Credential Type | Purpose |
| :--- | :--- | :--- |
| `abt_` | Bootstrap Token | Single-use initial claim of the Argus root administrator |
| `aet_` | Enrollment Token | Authorizes new engine instances to register in the Argus fleet |
| `ast_` | Session Token | Operator / user session token for Argus, Ego, and Console |
| `av_live_` | Production API Key | Live Macaroon capability tokens issued by Vulcan |
| `av_test_` | Test API Key | Staging and integration testing Macaroon tokens |
| `eyJ...` | JWT Access Token | RS256 OAuth 2.0 access token issued by Janus (`token_use: access_token`) |

## Enterprise Identity Synchronization Flow

When an external IdP (such as Okta, Microsoft Entra ID, or Google Workspace) provisions or updates a user:

1. The IdP pushes a SCIM 2.0 event to **Hermes** (`:4477`).
2. **Hermes** upserts the user identity and dynamic traits into **Ego** (`:4433`).
3. Directory group memberships map directly to **Nexus** relation tuples (e.g., `group:eng#member@user:<id>`).

## REST API Conventions

All REST endpoints follow consistent JSON envelopes:

- **Error envelope**: `{"error": "<code_or_type>", "error_description": "<human_readable_detail>"}`
- **Cursor pagination**: Request `?limit=50&cursor=<opaque_token>`. Responses return:

```json
{
  "data": [],
  "next_cursor": "eyJpZCI6IjEyMyJ9",
  "has_more": true
}
```

## Integration Validation Checklist

- [ ] Confirm internal REST/gRPC ports (`50051`, `50052`, `50053`, `8080`, `4445`, `4456`) are reachable only inside the service mesh, never from public ingress.
- [ ] Configure secret scanners (GitHub Secret Scanning, Gitleaks, TruffleHog) to flag `abt_`, `aet_`, `ast_`, and `av_live_` prefixes.
- [ ] Verify upstream applications check `X-Autorix-Identity-Signature` and trust `X-User-ID` only behind Aegis.
- [ ] Configure Prometheus scraping on `/metrics` (opt-in in Console via `PROMETHEUS_INTERNAL_URL`).

## Next Step

Configure trust boundaries in [Security Configuration](/autorix/security-configuration) or dive directly into [Autorix Aegis](/autorix/engines/aegis) and [Autorix Nexus](/autorix/engines/nexus).
