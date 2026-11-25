---
title: Autorix Janus — OAuth 2.0 & OpenID Connect
navTitle: Janus (OAuth2 & OIDC)
description: Enterprise OAuth 2.0 and OpenID Connect provider with PKCE S256, RS256 JWKS key rotation, refresh token family revocation, and strict public/admin listener separation.
section: engines
order: 4
ports: "4444 / 4445 (admin)"
protocol: "REST / OIDC"
---

**Autorix Janus** is an OAuth 2.0 and OpenID Connect (OIDC) provider inspired by Ory Hydra. It complies with RFC 6749 (OAuth 2.0), RFC 7636 (PKCE), RFC 7517/7518 (JWKS), RFC 7662 (Introspection), RFC 7009 (Revocation), RFC 8707 (Resource Indicators), and OpenID Connect Core 1.0.

## Quick Path: Machine-to-Machine Token

Request an RS256-signed access token via the `client_credentials` grant on the public port (`:4444`):

```bash
curl -X POST http://localhost:4444/oauth2/token \
  -u "client_backend_billing:SecretKey#2026" \
  -d "grant_type=client_credentials&scope=billing:read billing:write"
```

## Architecture & Cryptographic Key Management

```text
       [ Client Application / SPA / M2M Service ]
                           │
                           ▼ (Public OAuth 2.0 / OIDC :4444)
       ┌────────────────────────────────────────────────────────┐
       │                     Autorix Janus                      │
       │  ┌─────────────────────┐  ┌─────────────────────────┐  │
       │  │ OIDC Discovery      │  │ RS256 Key Manager       │  │
       │  │ (/.well-known)      │  │ (Automated JWKS Vault)  │  │
       │  └──────────┬──────────┘  └────────────┬────────────┘  │
       │             │                          │               │
       │  ┌──────────▼──────────┐  ┌────────────▼────────────┐  │
       │  │ OAuth2 Engine       │──┼──│ Token Signer         │  │
       │  │ (AuthCode/PKCE/M2M) │  │  │ (JWT Claims & Scopes)│  │
       │  └──────────┬──────────┘  └────────────┬────────────┘  │
       └─────────────┼──────────────────────────┼───────────────┘
                     │                          │
                     ▼                          ▼
               [ PostgreSQL Database: autorix_janus ]
```

- **Persisted RS256 Keys**: Asymmetric 2048-bit RSA key pairs are stored in PostgreSQL and initialized under a transaction-scoped advisory lock.
- **Zero-Downtime Rotation**: `POST /admin/keys/rotate` activates a new signing key while retaining retired public keys in `GET /.well-known/jwks.json` until existing tokens expire.
- **Client Secret Overlap**: `POST /admin/clients/{id}/rotate-secret` supports configurable overlap periods for seamless deployments.
- **Token Type Separation**: Access tokens carry `token_use: access_token`; ID tokens carry `token_use: id_token` (issued only when `openid` is granted). Aegis enforces this claim so ID tokens cannot be replayed against APIs.

## Decoupled Login & Consent Flow

Janus delegates user interaction to your own Login and Consent UIs:

1. Client redirects user to `GET /oauth2/auth` (with exact registered `redirect_uri` and **PKCE S256** challenge). Janus creates a `login_challenge` and redirects to your Login UI.
2. Your authenticated backend accepts login via `PUT /admin/oauth2/auth/requests/login/accept` (on private port `:4445`).
3. Your backend accepts consent scopes via `PUT /admin/oauth2/auth/requests/consent/accept`.
4. Janus returns the authorization code to the client for exchange at `POST /oauth2/token`.

> Never allow browser-supplied `subject` values to accept login or consent challenges directly—always perform acceptance from a trusted server-side backend.

## Refresh Token Rotation & Reuse Detection

Janus issues refresh tokens after an authorization-code exchange only when the client registers `refresh_token` in `grant_types` **and** `offline_access` was granted.

- Tokens are 256-bit URL-safe opaque strings; Janus stores only their SHA-256 hash.
- Every successful refresh rotates the token while preserving client, subject, granted scopes, and RFC 8707 resource (scopes cannot be escalated during refresh).
- **Automatic Family Revocation**: Reusing an already-rotated predecessor token revokes the entire token family and returns `invalid_grant`.
- Configure lifetime via `REFRESH_TOKEN_TTL` (default `720h` / 30 days).

## Listener Separation: Public (`:4444`) vs Private Admin (`:4445`)

### Public Listener (`:4444`)

- `GET /.well-known/openid-configuration` — OIDC Discovery metadata
- `GET /.well-known/jwks.json` — Public RS256 verification keys
- `GET /oauth2/auth` — Authorization endpoint (PKCE S256 mandatory)
- `POST /oauth2/token` — Token issuance & refresh rotation
- `POST /oauth2/introspect` — RFC 7662 introspection (confidential client auth + token ownership enforced)
- `POST /oauth2/revoke` — RFC 7009 revocation (confidential client auth + token ownership enforced)

### Private Admin Listener (`:4445`)

Binds to `127.0.0.1` by default outside containers and is **never** exposed to public ingress:

- **Clients**: `POST /admin/clients`, `GET /admin/clients`, `GET /admin/clients/{id}`, `PATCH /admin/clients/{id}`, `DELETE /admin/clients/{id}`
- **Scopes & Grants**: `POST / GET / DELETE /admin/scopes`, `GET /admin/grants`
- **Keys**: `POST /admin/keys/rotate`
- **CORS**: Browser cross-origin requests are denied by default unless `CORS_ALLOWED_ORIGINS` is explicitly allowlisted.

## Implementation Checklist

- [ ] Provision `autorix_janus` and confirm `/.well-known/jwks.json` serves active RS256 keys.
- [ ] Verify public port `:4444` returns `404` on `/admin/*`.
- [ ] Register clients with exact `redirect_uris`, `grant_types`, and `scopes` (or provision via [Terraform](/autorix/sdks/cli-and-apis#terraform-provider)).
- [ ] Configure `CORS_ALLOWED_ORIGINS` with exact approved origins (never `*`).

## Next Step

Enforce Janus JWTs at your API perimeter with [Autorix Aegis](/autorix/engines/aegis).
