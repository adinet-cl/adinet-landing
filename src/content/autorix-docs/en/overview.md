---
title: Autorix Zero-Trust IAM Suite
navTitle: Introduction & Overview
description: Modular, self-hosted Identity and Access Management (IAM) suite built with independent Go microservices, Google Zanzibar ReBAC, ABAC CEL, OAuth2/OIDC, Zero-Trust PEP proxy, Macaroons, and cryptographic audit logging.
section: overview
order: 1
badge: v0.2.8
---

**Autorix** is a high-performance, self-hosted **Zero-Trust Identity and Access Management (IAM)** suite engineered as independent Go microservices and a Next.js 15 enterprise administration console. Inspired by the Ory stack and Google Zanzibar, Autorix provides fine-grained relationship authorization (ReBAC), attribute-based policy evaluation (ABAC with CEL), identity lifecycle management with Argon2id and WebAuthn/Passkeys, OAuth 2.0 / OIDC, perimeter Zero-Trust proxying (PEP), offline-attenuable Macaroon API keys, SAML 2.0 / SCIM 2.0 federation, and a tamper-evident SHA-256 chained audit trail.

## Ecosystem Architecture

Every Go microservice owns its isolated PostgreSQL database (`autorix_<service>`). There is no shared database or cross-service ORM—services communicate strictly through authenticated REST and gRPC contracts, with **Aegis** enforcing Zero-Trust policy at the network edge.

```text
                                         [ EXTERNAL TRAFFIC ]
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │    Autorix Aegis    │  (Zero-Trust PEP Reverse Proxy :4455)
                                        └──────────┬──────────┘
                                                   │
        ┌──────────────────────┬───────────────────┼───────────────────┬──────────────────────┐
        ▼                      ▼                   ▼                   ▼                      ▼
 ┌──────────────┐       ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       ┌──────────────┐
 │Autorix Janus │       │Autorix Nexus │    │ Autorix Ego  │    │Autorix Vulcan│       │Autorix Hermes│
 │(OAuth2/OIDC) │       │(ReBAC/Zanzibar)   │(Identity/MFA)│    │ (API Keys)   │       │ (SAML/SCIM)  │
 │    :4444     │       │:50051 / :8080│    │    :4433     │    │    :4466     │       │    :4477     │
 └──────────────┘       └──────────────┘    └──────────────┘    └──────────────┘       └──────────────┘
        │                      │                   │                   │                      │
        └──────────────────────┼───────────────────┼───────────────────┼──────────────────────┘
                               │                   │                   │
                               ▼                   ▼                   ▼
                        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                        │Autorix Themis│    │Autorix Argus │    │Autorix Console
                        │ (ABAC / CEL) │    │(Control Plane│    │(Next.js 15 UI│
                        │:50052 / :4488│    │:50053 / :4400│    │    :3000     │
                        └──────────────┘    └──────────────┘    └──────────────┘
```

## Core Components

| Component | Role | Ports | Protocols | Guide |
| :--- | :--- | :--- | :--- | :--- |
| **Nexus** | Fine-grained ReBAC (Google Zanzibar + APL + CEL caveats) | `8080` / `50051` | REST / gRPC | [Nexus Guide](/autorix/engines/nexus) |
| **Themis** | ABAC policy engine powered by Google CEL with priority rings | `4488` / `50052` | REST / gRPC | [Themis Guide](/autorix/engines/themis) |
| **Ego** | Identity lifecycle, JSON Schema traits, Argon2id, TOTP MFA & WebAuthn | `4433` | REST | [Ego Guide](/autorix/engines/ego) |
| **Janus** | OAuth 2.0 & OIDC server with PKCE S256 & RS256 JWKS rotation | `4444` / `4445` (admin) | REST / OIDC | [Janus Guide](/autorix/engines/janus) |
| **Aegis** | Zero-Trust Policy Enforcement Point (PEP) reverse proxy | `4455` / `4456` (admin) | HTTP / REST | [Aegis Guide](/autorix/engines/aegis) |
| **Vulcan** | Prefixed API keys (`av_live_`/`av_test_`) & HMAC-SHA256 Macaroons | `4466` | REST | [Vulcan Guide](/autorix/engines/vulcan) |
| **Hermes** | SAML 2.0 Web SSO & SCIM 2.0 enterprise directory sync | `4477` | REST / XML | [Hermes Guide](/autorix/engines/hermes) |
| **Argus** | Fleet control plane, enrollment tokens & SHA-256 audit chain | `4400` / `50053` | REST / gRPC | [Argus Guide](/autorix/control-plane/argus) |
| **Console** | Next.js 15 enterprise Admin UI, BFF & 9 dedicated Studios | `3000` | HTTP | [Console Guide](/autorix/control-plane/console) |

## Security Guarantees

- **Zero Standing Privileges**: Every inbound request is authenticated and authorized at ingress (**Aegis**) and validated at engine level (**Nexus** / **Themis**).
- **Cluster-Wide Internal Service Auth**: Inter-service REST and gRPC traffic supports verified mTLS SPIFFE certificates and constant-time shared tokens (`X-Autorix-Internal-Token` / `X-Autorix-Console-Token`).
- **Signed Identity Propagation**: Aegis signs forwarded identity headers with canonical `v1` HMAC-SHA256 (`X-Autorix-Identity-Signature`), verified in constant time by the official SDKs.
- **Tamper-Evident Audit Chain**: Mutating operations are linked in an immutable SHA-256 Merkle chain inside **Argus**, mathematically verifiable via `GET /v1/audit/verify`.
- **Memory-Hard Cryptography & Passkeys**: **Ego** protects passwords with Argon2id (64 MB memory cost), RFC 6238 TOTP MFA, and FIDO2 WebAuthn / Passkeys.
- **Decentralized Attenuation**: **Vulcan** API keys use HMAC-SHA256 Macaroons that services can attenuate offline without database round-trips.

## Quick Start (Local Development)

Launch the core cluster locally using Docker Compose v2:

```bash
git clone https://github.com/Autorix-cl/autorix.git
cd autorix
./scripts/generate-local-secrets.sh
docker compose --profile core up -d --build
```

Retrieve Argus's one-time bootstrap token and open the Admin Console at `http://localhost:3000`:

```bash
docker logs autorix-argus | grep -i "bootstrap token"
```

> **Development only**: Docker Compose uses local ports, development credentials, HTTP inter-service traffic, and `sslmode=disable`. Never expose it directly to the Internet.

## Where to Go Next

- Follow the full [Docker Compose Onboarding](/autorix/getting-started) guide (including the `extended` and `alerts` profiles).
- Review the [Master Architecture & Edge Pipeline](/autorix/architecture) and [Security Configuration](/autorix/security-configuration).
- Integrate your services using the [Official SDKs (Go, TypeScript/React, Python)](/autorix/sdks/overview) or [`autorixctl` & Terraform Provider](/autorix/sdks/cli-and-apis).
- Plan production rollout with the [Kubernetes & Helm Guide](/autorix/operations/kubernetes) and [Operations Runbook](/autorix/operations/runbook).
