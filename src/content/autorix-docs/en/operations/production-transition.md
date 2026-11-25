---
title: Production Transition, Security Migration & Rollback
navTitle: Transition & Rollback
description: Step-by-step migration from local Compose to digest-pinned Kubernetes, JWT trust boundaries, private administration listeners, and controlled upgrade/rollback drills.
section: operations
order: 3
---

Transitioning from local Docker Compose to Kubernetes/Helm requires switching to an immutable, digest-pinned, zero-trust operating model. Complete every step in a production-like staging environment first.

## Production Transition Workflow

1. **Supply Chain & Image Pinning**: Build, scan, sign, and record immutable SHA-256 OCI digests from `ghcr.io/autorix-cl/*`. Production Helm rendering intentionally fails until every workload pins a real digest.
2. **PostgreSQL & Secrets**: Provision TLS-enabled PostgreSQL (`sslmode=verify-full`), secret-manager-backed per-service URLs, internal auth tokens, and tested restore procedures. Never place credentials in Helm values files.
3. **Private Administration Boundaries**: Verify that neither Janus `:4445` nor Aegis `:4456` is reachable via public Ingress, and confirm `networkPolicy.ingressController` and `networkPolicy.monitoring` selectors match your cluster.
4. **Validation Guard**: Run `python3 scripts/ci/check_security_boundaries.py` plus engine/console test suites before promoting any release. Confirm externally that Janus `/admin/clients` returns `404` on `:4444`.
5. **Rehearsal**: Execute a smoke test, encrypted backup restore drill, and rollback rehearsal prior to opening live traffic.

## JWT Trust & Private Admin Environment Matrix

| Setting | Purpose & Constraint |
| :--- | :--- |
| `JWT_ISSUER` | Exact expected `iss`; must match Janus `ISSUER_URL` |
| `JWT_AUDIENCE` | Exact expected `aud`; defaults match M2M issuer audience |
| `JWT_JWKS_URL` | Operator-controlled HTTPS JWKS URL; never selected from a rule or request |
| `JWT_ALLOW_INSECURE_JWKS` | Defaults to `false`; enable `true` only inside local Docker Compose |
| `JANUS_INTERNAL_URL` | Console BFF address for public JWKS / introspection / revocation |
| `JANUS_ADMIN_INTERNAL_URL` | Console BFF address for `/admin/*`; **never** expose as `NEXT_PUBLIC_*` |
| `CORS_ALLOWED_ORIGINS` | Explicit allowlist of browser origins for Janus (never `*`) |
| `PROMETHEUS_INTERNAL_URL` | Opt-in internal Prometheus URL for Console observability (`v0.2.8+`) |

> **Audience isolation**: Janus `client_credentials` access tokens carry the issuer as audience, while authorization-code access tokens and ID tokens carry the client ID. Do not broaden Aegis's audience blindly without enforcing explicit resource audiences (`RFC 8707`) and `token_use: access_token` separation.

## Controlled Upgrades

Capture source commit SHA, Helm values, image digests, migration version, approver, and rollback owner before every upgrade:

1. Review release notes ([CHANGELOG](https://github.com/Autorix-cl/autorix/blob/main/CHANGELOG.md)) and rendered Helm diff with the pinned production digest overlay.
2. Back up all service databases and verify restore integrity in an isolated environment.
3. Apply backward-compatible SQL migrations via the Helm chart lifecycle hook, then roll out workloads.
4. Verify `/health/ready`, OAuth2 flows, Aegis access rules, Console admin operations, metrics, and alert routing.

## Rollback Procedure

1. Stop or drain the rollout if safety permits.
2. Roll back the Helm release to the previously approved **immutable image digest** and values—never switch to a mutable tag.
3. **Do not blindly roll back database schemas.** Only restore from a tested backup when explicitly supported by the migration plan and approved by the incident commander.
4. Re-run smoke tests and archive incident timestamps, evidence, and follow-up actions.

## Next Step

Verify release readiness against the [Production Acceptance Checklist & Assurance Matrix](/autorix/operations/production-assurance).
