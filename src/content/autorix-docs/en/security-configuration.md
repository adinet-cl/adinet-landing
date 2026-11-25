---
title: Security Configuration & Hardening
navTitle: Security Configuration
description: Baseline security controls for JWT trust, private administrative listeners, cluster-wide internal service authentication, signed identity headers, and secret management.
section: overview
order: 4
---

Start from these controls before integrating any production workload. They establish an engineering security baseline—not a regulatory certification or a replacement for an environment-specific threat model.

## 1. JWT Trust at Aegis

Configure **exactly one** trusted key source on Aegis: `JWT_JWKS_URL` **or** `JWT_PUBLIC_KEY_FILE`. Set `JWT_ISSUER` and `JWT_AUDIENCE` to the exact values accepted by your API.

- Production JWKS endpoints **must** use HTTPS. `JWT_ALLOW_INSECURE_JWKS=true` is exclusively for the local Docker Compose stack.
- Aegis accepts **access tokens only** (`token_use: access_token`). ID tokens cannot be replayed against protected APIs.
- Issuer, audience, and JWKS URLs remain strictly under operator control—a request or proxy rule can never override the trust source.

## 2. Cluster-Wide Internal Service Authentication

Starting in `v0.2.0`, all 8 Go engines and the Console BFF enforce cluster-wide internal service authentication via `platform/httpx.InternalAuth` (REST) and `platform/tls.UnaryInternalAuthInterceptor` (gRPC):

- **mTLS SPIFFE identity**: Verifies client X.509 certificates carrying trusted SPIFFE SAN URIs for mesh-to-mesh traffic.
- **Constant-time shared token verification**: Supports `X-Autorix-Internal-Token` (service-to-service) and `X-Autorix-Console-Token` (Console BFF to internal engines) using timing-safe comparison.

## 3. Canonical Signed Identity Headers

When Aegis proxies an authenticated request to your upstream backend, it strips client-supplied identity headers and injects trusted headers signed with canonical `v1` **HMAC-SHA256**:

- Forwarded identity headers: `X-User-ID`, `X-User-Email`, `X-User-Roles`
- Cryptographic proof: `X-Autorix-Identity-Signature`

The official Go, TypeScript, and Python (FastAPI/Flask) SDK middlewares verify `X-Autorix-Identity-Signature` in constant time before trusting the forwarded identity. Never trust `X-User-*` headers from untrusted networks.

## 4. Private Administration & Console BFF

- Keep **Janus** public OAuth2/OIDC traffic on `:4444`; send `/admin/*` exclusively to its private listener (`:4445`, bound to `127.0.0.1` by default outside containers).
- Keep **Aegis** administration (`:4456`) private. Never publish `:4456` on an Ingress or allow wildcard browser CORS origins (`*`).
- Console's server-side BFF communicates using internal addresses. **Never** expose `JANUS_ADMIN_INTERNAL_URL`, internal tokens, or API keys in `NEXT_PUBLIC_*` variables.
- Register exact `redirect_uri`, `grant_types`, `scopes`, and resource audiences per OAuth client. Enforce **PKCE S256** on all authorization-code clients.
- Console enforces `HttpOnly`, `SameSite` session cookies (`autorix_session`) and Double-Submit CSRF protection (`autorix_csrf` cookie + `X-CSRF-Token` header) on all mutating BFF routes.

## 5. Secrets, Supply Chain & Database TLS

- Source all database URLs, signing material, internal auth secrets, and bootstrap tokens from an external secret manager (Vault, AWS Secrets Manager, External Secrets Operator) or workload identity.
- Pin production container images on `ghcr.io/autorix-cl/*` by verified **SHA-256 OCI digest**—the production Helm chart intentionally rejects unpinned mutable tags.
- Require TLS (`sslmode=verify-full`) for all PostgreSQL connections in production.
- Rehearse key rotation and credential rollback procedures before launch.

## Next Step

See [Production Transition & Security Migration](/autorix/operations/production-transition) for exact environment variables, Kubernetes NetworkPolicy guidance, and verification commands.
