---
title: Official Client SDKs Overview
navTitle: SDKs Overview
description: Capability matrix, package prerequisites, browser vs backend security boundaries, and fail-closed reliability guarantees for Autorix's Go, TypeScript/React, and Python SDKs.
section: sdks
order: 1
---

Autorix ships first-party typed HTTP SDKs for **Go**, **TypeScript / React**, and **Python** under `sdk/` in the repository. Each SDK focuses on supported public-runtime operations—with explicit fail-closed authorization semantics and constant-time verification for Aegis's signed identity headers (`X-Autorix-Identity-Signature`).

## Capability Matrix

| Capability | Go (`sdk/go`) | TypeScript / React (`@autorix/sdk-js`) | Python (`autorix`) |
| :--- | :--- | :--- | :--- |
| **Ego session** | Current session (`WhoAmI`) | Current session & logout | Registration, login, current session & logout |
| **Nexus ReBAC** | Check, batch check, expand, resource lookup | Checks, tuple read/write/delete, expand, subject/resource lookup | Same as TypeScript |
| **Themis ABAC** | Evaluate | Evaluate, policy CRUD, versions, validate, dry run | Same, plus fixtures & test suites |
| **Vulcan Keys** | Verify & attenuate | Create, list, verify, attenuate, revoke | Same as TypeScript |
| **Janus OAuth/OIDC** | Discovery, auth URL, token exchange, introspect, revoke, JWKS | Discovery, auth URL, code exchange, refresh, introspect, revoke, JWKS | Same, plus client credentials |
| **Argus Audit** | Audit-chain verification | No | No |
| **Signed Identity Middleware** | `net/http` (`X-Autorix-Identity-Signature`) | Server verification helper + React hooks | FastAPI, Flask, Django |

> No SDK currently wraps Ego WebAuthn ceremonies directly (call Ego's `/self-service/webauthn/*` endpoints from browser + BFF). Argus administrative APIs are intentionally excluded from TypeScript and Python SDKs.

## Packages & Runtime Requirements

| SDK | Source Package | Runtime Requirement | Guide |
| :--- | :--- | :--- | :--- |
| **Go** | `github.com/autorix-cl/autorix/sdk/go` | Go 1.25.6+ | [Go SDK Reference](/autorix/sdks/go) |
| **TypeScript / React** | `@autorix/sdk-js` | Node.js 18+ or runtime with `fetch` (React optional) | [TypeScript & React SDK](/autorix/sdks/typescript) |
| **Python** | `autorix` | Python 3.9+ | [Python SDK Reference](/autorix/sdks/python) |

## Security Boundary: Browser vs Backend

- **Keep secrets on the server**: Never pass `clientSecret`, a Vulcan `apiKey`, an internal auth token, or an operator token into browser bundles or `NEXT_PUBLIC_*` environment variables.
- **PKCE & token storage**: The SDKs construct PKCE S256 authorization URLs and exchange codes, but do **not** generate or persist PKCE verifiers or tokens—your application owns secure storage.
- **UI checks are not enforcement**: React permission hooks (`usePermission`, `usePolicy`) are strictly for UI presentation. Your backend must always enforce authorization before mutating or returning protected data.
- **Verify proxy identity headers**: Always deploy backend middleware behind **Aegis** (stripping untrusted client `X-User-*` headers) and verify the canonical `v1` HMAC-SHA256 `X-Autorix-Identity-Signature`.

## Shared Reliability Semantics

- **Fail-closed authorization**: Network failures, timeouts, or 5xx responses during permission checks resolve to **denied** (`allowed = false`)—never implicit allow.
- **Safe retries only**: Safe/idempotent reads retry with backoff; single-use OAuth authorization-code and refresh-token exchanges are **never** automatically retried.
- **In-process decision cache**: Nexus check caching defaults to a 10-second in-process TTL (not distributed across replicas).
- **Cross-SDK conformance**: Verified in CI via `sdk/conformance_test.sh`.

## Choose Your SDK

- [Go SDK Reference](/autorix/sdks/go)
- [TypeScript & React SDK Reference](/autorix/sdks/typescript)
- [Python / FastAPI / Flask / Django SDK Reference](/autorix/sdks/python)
- [CLI (`autorixctl`), Terraform Provider & Direct REST/gRPC](/autorix/sdks/cli-and-apis)
