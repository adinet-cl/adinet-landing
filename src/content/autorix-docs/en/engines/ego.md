---
title: Autorix Ego — Identity, Traits, MFA & Passkeys
navTitle: Ego (Identity & WebAuthn)
description: Enterprise identity lifecycle engine with JSON Schema Draft 7 dynamic traits, Argon2id password hashing, RFC 6238 TOTP MFA, real WebAuthn/Passkeys, and Ory Kratos-parity state-machine flows.
section: engines
order: 3
ports: "4433"
protocol: "REST"
---

**Autorix Ego** manages user identities, credentials, multi-factor authentication, and active sessions. Inspired by Ory Kratos, Ego pairs dynamic JSON Schema traits with memory-hard **Argon2id** hashing, **RFC 6238 TOTP MFA**, recovery codes, and full **FIDO2 WebAuthn / Passkeys**.

## Quick Path: Register, Login & Inspect Session

Ego runs on HTTP port `4433`:

1. Start a browser registration flow (or submit directly via `POST /self-service/registration`):

```bash
curl -X GET http://localhost:4433/self-service/registration/browser
```

2. Register an identity with dynamic traits and password:

```bash
curl -X POST "http://localhost:4433/self-service/registration?flow=<flow_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "password",
    "csrf_token": "<csrf_token>",
    "traits": {
      "email": "alice@enterprise.corp",
      "name": "Alice Smith",
      "department": "Engineering"
    },
    "password": "SuperSecurePassword#2026"
  }'
```

3. Authenticate with `POST /self-service/login`, validate the active session with `GET /sessions/whoami`, or revoke it via `POST /self-service/logout`.

## Dynamic JSON Schema Traits

Rather than hardcoding rigid database columns, Ego validates user profiles against **JSON Schema (Draft 7)** schemas registered via `/admin/schemas`:

- **Standard fields**: `email`, `name`, `username`
- **Custom enterprise traits**: `department`, `employee_id`, `cost_center`, `security_clearance`, `phone_number`

## Cryptographic Security & Passkeys

- **Argon2id Password Hashing**: Follows OWASP memory-hard parameters (`m=64 MB`, `t=3`, `p=4`, 16-byte `crypto/rand` salt) to neutralize GPU/ASIC brute-force attacks.
- **TOTP MFA (RFC 6238)**: 6-digit codes rotating every 30 seconds with single-use recovery codes.
- **WebAuthn / Passkeys (`v0.2.0+`)**: Full cryptographic registration and login ceremonies powered by `github.com/go-webauthn/webauthn`:
  - `POST /self-service/webauthn/registration/start` and `/finish`
  - `POST /self-service/webauthn/login/start` and `/finish`
  - Single-use TTL challenge consumption, authenticator sign-count persistence, and clone-warning rejection.

## API Reference (`:4433`)

### Self-Service Endpoints

| Operation | Endpoint | Description |
| :--- | :--- | :--- |
| Browser flow init | `GET /self-service/registration/browser` | Generates `flow_id`, anti-CSRF token, and dynamic UI nodes |
| Register identity | `POST /self-service/registration` | Creates identity and issues active session (`ast_...`) |
| Password login | `POST /self-service/login` | Authenticates by identifier and password |
| WebAuthn ceremonies | `POST /self-service/webauthn/{registration,login}/{start,finish}` | Passkey / hardware security key registration and sign-in |
| Session lookup | `GET /sessions/whoami` | Resolves identity from `autorix_session_token` cookie or Bearer header |
| Logout | `POST /self-service/logout` | Revokes the active session token |

### Administrative Endpoints (Internal Only)

- **Identities**: `GET /admin/identities`, `PATCH /admin/identities/{id}`, `DELETE /admin/identities/{id}`
- **Password Recovery**: `POST /admin/identities/{id}/credentials/reset-password`, `POST /admin/identities/{id}/recovery-link`
- **Sessions & MFA**: `GET /admin/sessions`, `DELETE /admin/sessions/{id}`, `DELETE /admin/identities/{id}/mfa`
- **Schemas**: `GET /admin/schemas`, `POST /admin/schemas`

## Implementation Checklist

- [ ] Register enterprise JSON Schema trait definitions (e.g., `corp_employee_v1`).
- [ ] Verify `autorix_ego` database connectivity via `GET /health/ready`.
- [ ] Test password registration, TOTP enrollment, recovery codes, and WebAuthn passkey flows.
- [ ] Protect `/admin/*` endpoints behind internal service authentication and network policies.

## Next Step

Issue OAuth 2.0 / OIDC tokens for applications in [Autorix Janus](/autorix/engines/janus) or federate corporate directories with [Autorix Hermes](/autorix/engines/hermes).
