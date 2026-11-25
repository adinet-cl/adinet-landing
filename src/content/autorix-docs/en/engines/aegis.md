---
title: Autorix Aegis — Zero-Trust PEP Reverse Proxy
navTitle: Aegis (Zero-Trust PEP)
description: Perimeter Policy Enforcement Point (PEP) reverse proxy handling route matching, JWT/Macaroon/Session authentication, Nexus/Themis authorization, and HMAC-SHA256 signed identity header mutation.
section: engines
order: 5
ports: "4455 / 4456 (admin)"
protocol: "HTTP Proxy / REST"
---

**Autorix Aegis** is the Zero-Trust Policy Enforcement Point (PEP) and reverse access proxy sitting at the edge of your microservice mesh. It intercepts inbound HTTP requests (`:4455`), authenticates callers, enforces Nexus ReBAC and Themis ABAC decisions, injects cryptographically signed identity headers, and proxies authorized requests upstream.

## Quick Path: Protect an Upstream API Route

Create a rule via Aegis's private Admin API (`:4456`) using Console, an internal call, or an authenticated port-forward. Configure `JWT_ISSUER`, `JWT_AUDIENCE`, and `JWT_JWKS_URL` (or `JWT_PUBLIC_KEY_FILE`) at startup—rule-level JWKS overrides are rejected.

```bash
curl -X POST http://localhost:4456/rules \
  -H "Content-Type: application/json" \
  -H "X-Autorix-Internal-Token: $INTERNAL_TOKEN" \
  -d '{
    "id": "rule_protect_customer_pii",
    "match": {
      "url": "http://api.enterprise.corp/api/v1/customers/<[0-9a-f-]+>",
      "methods": ["GET"]
    },
    "authenticators": [{ "handler": "jwt" }],
    "authorizers": [
      {
        "handler": "nexus_rebac",
        "config": {
          "namespace": "customers",
          "relation": "viewer",
          "subject_from": "jwt.sub",
          "object_from": "url_param.0"
        }
      }
    ],
    "mutators": [
      {
        "handler": "header",
        "config": { "headers": { "X-User-ID": "{{ .Subject }}" } }
      }
    ],
    "upstream": { "url": "http://customer-svc.internal:8080" }
  }'
```

## The 4-Stage Enforcement Pipeline

Every inbound request on `:4455` executes four deterministic stages:

1. **Rule Matcher**: Matches hostname, URL path regex, and HTTP method in priority order.
2. **Authenticator Stage**: Validates JWT access tokens (Janus), Macaroon API keys (Vulcan), or sessions (Ego). Rejects invalid callers with `401 Unauthorized`.
3. **Authorizer Stage**: Evaluates fine-grained permissions against **Nexus** (ReBAC) and/or **Themis** (CEL ABAC). Rejects unauthorized callers with `403 Forbidden`.
4. **Mutator & Identity Signing Stage**: Strips spoofed client headers, injects trusted identity headers (`X-User-ID`, `X-User-Email`, `X-User-Roles`), computes a canonical `v1` HMAC-SHA256 `X-Autorix-Identity-Signature`, and forwards traffic upstream.

> **Upstream verification**: All official Autorix SDKs (Go, TypeScript, and Python FastAPI/Flask) verify `X-Autorix-Identity-Signature` in constant time so backend services have cryptographic proof that identity headers originated from Aegis.

## Private Admin API Reference (`:4456`)

Aegis serves health probes (`/health/alive`, `/health/ready`, `/info`) and rule management exclusively on `:4456` so wildcard proxy rules on `:4455` can never shadow administrative or health endpoints.

| Operation | Endpoint | Description |
| :--- | :--- | :--- |
| List rules | `GET /rules` | Return active ordered proxy rules |
| Create rule | `POST /rules` | Register a new PEP routing rule |
| Read / update / delete | `GET / PUT / DELETE /rules/{id}` | Manage individual rules |
| Reorder precedence | `PUT /rules/reorder` | Supply ordered array of `rule_ids` |
| Bulk import / export | `POST /rules/import`, `GET /rules/export` | JSON / YAML rule synchronization |
| Rule versioning | `GET /rules/versions`, `POST /rules/rollback/{version}` | Inspect history and roll back safely |
| Handler catalog | `GET /handlers` | List available authenticators, authorizers, and mutators |

## Dry-Run Rule Match Simulator

Test rule precedence and trace authenticator/authorizer selection without sending live upstream traffic:

```bash
curl -X POST http://localhost:4456/rules/test-match \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "path": "/api/v1/customers/1234",
    "headers": { "Authorization": "Bearer eyJhbGci..." }
  }'
```

## Production Readiness Checklist

- [ ] Expose only proxy port `:4455` at edge ingress; keep admin port `:4456` strictly internal.
- [ ] Configure `JWT_JWKS_URL` over HTTPS (never set `JWT_ALLOW_INSECURE_JWKS=true` in production).
- [ ] Configure the shared HMAC signing secret between Aegis and upstream SDK middleware for `X-Autorix-Identity-Signature`.
- [ ] Validate rule priority conflicts using `POST /rules/test-match` before applying changes.

## Next Step

Issue offline-attenuable API keys for machine clients with [Autorix Vulcan](/autorix/engines/vulcan) or inspect live proxy rules in [Autorix Console](/autorix/control-plane/console).
