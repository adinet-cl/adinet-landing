---
title: Autorix Console — Admin UI & Studio Workspaces
navTitle: Console (Admin UI)
description: Next.js 15 enterprise web console and secure BFF layer with isolated auth shell, RBAC, Double-Submit CSRF, 9 dedicated Studio workspaces, and live cryptographic audit verification.
section: control-plane
order: 2
ports: "3000"
protocol: "HTTP (Next.js 15)"
---

**Autorix Console** is the enterprise management interface and **Backend-for-Frontend (BFF)** layer for the entire Autorix Zero-Trust IAM Suite. Built on **Next.js 15 App Router** (`15.5.29+`), it provides real-time telemetry, 9 dedicated Studio workspaces, live Merkle audit verification, and fleet orchestration without exposing internal engine credentials to the browser.

## Quick Path: First-Time Cluster Setup

1. Navigate to `http://localhost:3000`. When no root administrator exists, Console automatically redirects to `/setup`.
2. Paste the one-time `abt_...` token logged by Argus on startup.
3. Fill in Name, Work Email, and Master Password, then click **Initialize Cluster Owner**.
4. Once claimed, the cluster locks and redirects to `/login`.

## Security & BFF Architecture

- **Isolated Auth Shell**: Authentication routes (`/login`, `/setup`, `/session-expired`, `/403`) render in a standalone security shell separated from the operational dashboard chrome.
- **Role-Based Access Control (RBAC)**: Enforces granular route and BFF permissions (`Admin`, `Operator`, `Auditor`, `ReadOnly`—for example, `oauth2:read`/`oauth2:write` for Janus and `proxy-rules:read`/`proxy-rules:write` for Aegis).
- **Secure Cookies & Double-Submit CSRF**: Operator sessions live in `HttpOnly`, `SameSite` cookies (`autorix_session`). Mutating BFF requests enforce matching `autorix_csrf` cookies and `X-CSRF-Token` headers.
- **Internal Service Authentication**: Server-side BFF routes authenticate to backend engines with `X-Autorix-Console-Token` / `X-Autorix-Internal-Token` and never leak `JANUS_ADMIN_INTERNAL_URL` or secrets to `NEXT_PUBLIC_*`.
- **Resilient Session Validation (`v0.2.4`–`v0.2.8`)**: Shares a 15-second single-flight session validation cache across Next.js App Router bundles via `globalThis` (with immediate server-wide invalidation on `POST /api/auth/logout`), retries transient Argus errors, returns HTTP `503` without clearing cookies on backend timeouts, and drains unused fetch bodies cleanly.
- **Opt-In Prometheus Telemetry (`v0.2.8`)**: Observability and alert routes query Prometheus only when `PROMETHEUS_INTERNAL_URL` is explicitly configured—avoiding stray DNS lookups when Prometheus is not deployed.

## The 9 Studio Workspaces

| Studio | Route | Backed By | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **Identities Studio** | `/identities` | Ego | User directory, dynamic JSON Schema traits, password resets, MFA & Passkey status |
| **API Keys Studio** | `/api-keys` | Vulcan | Key minting (`av_live_`/`av_test_`), interactive Macaroon caveat attenuation, revocation |
| **Permissions Studio** | `/permissions` | Nexus | Zanzibar tuple CRUD, relation graph explorer, live `Check` simulator with traces |
| **Proxy Rules Studio** | `/proxy-rules` | Aegis | Edge route editor, authenticator/authorizer/mutator pipelines, live dry-run matcher |
| **Policies Studio** | `/policies` | Themis | Google CEL policy editor, deterministic priority rings, version history, fixture runner |
| **Enterprise Studio** | `/enterprise` | Hermes | SAML 2.0 IdP onboarding, SP metadata export, SCIM 2.0 sync history |
| **Fleet Studio** | `/fleet` | Argus | Live engine health & heartbeats, topology graph, `aet_` enrollment token minter |
| **Audit Trail Studio** | `/audit` | Argus | Searchable audit events, JSON diffs, one-click SHA-256 chain verification, CSV export |
| **Compliance Studio** | `/compliance` | Argus | Candidate evidence dashboards mapped to SOC 2 (CC6.1/CC6.2) and ISO 27001 |

## Live Cryptographic Audit Verification

Inside **Audit Trail Studio** (`/audit`), clicking **Verify Chain** executes a live check against Argus (`GET /v1/audit/verify`), recomputing the SHA-256 link across every audit record in PostgreSQL and confirming zero tampering or out-of-order insertion before exporting CSV evidence for auditors.

## Next Step

Integrate Autorix into your application backend and frontend with the [Official Client SDKs](/autorix/sdks/overview).
