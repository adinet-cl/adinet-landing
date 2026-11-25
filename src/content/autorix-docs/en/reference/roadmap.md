---
title: Architecture Status & Roadmap
navTitle: Status & Roadmap
description: Code-audited implementation status across all 8 Go microservices, Next.js 15 Console, official SDKs, Terraform provider, observability, and CI/CD supply chain.
section: reference
order: 2
---

Autorix is engineered around **extreme decentralization, Zero-Trust boundaries, and headless APIs**. Every Go engine compiles to a static binary with its own isolated PostgreSQL database, avoiding tight coupling and shared-schema bottlenecks.

## Audited Implementation Status (`v0.2.8`)

Every item below reflects verified repository code and automated CI coverage:

- **8 Independent Go Microservices**: `argus`, `nexus`, `ego`, `janus`, `aegis`, `vulcan`, `hermes`, and `themis`—each with its own Go module, SQL migrations, hexagonal structure, and unit test suite.
- **Uniform Health & Identity Contract (ADR 0001)**: `/health/alive`, `/health/ready`, `/info`, and `grpc.health.v1.Health` implemented via shared `platform/health` and guarded against Helm chart drift in CI.
- **Cluster-Wide Security Hardening (`v0.2.0`–`v0.2.8`)**:
  - Internal service authentication (`platform/httpx.InternalAuth` & `platform/tls.UnaryInternalAuthInterceptor`) supporting mTLS SPIFFE certificates and constant-time shared tokens across all 8 Go engines and Console BFF.
  - Canonical `v1` HMAC-SHA256 identity header signing (`X-Autorix-Identity-Signature`) in Aegis and constant-time verification across Go, TypeScript, and Python SDKs.
  - Full WebAuthn / Passkey registration and login ceremonies in Ego (`github.com/go-webauthn/webauthn`) with single-use challenge TTL and clone detection.
  - Hardened base images (`golang:1.26-alpine`, `alpine:3.24`, Next.js `15.5.29`, `golang.org/x/net v0.60.0`) scanning at **0 critical CVEs** under Grype.
- **Autorix Console (Next.js 15 App Router)**: 9 operational Studio workspaces, strict Zod validation on BFF responses, isolated auth shell, RBAC gating, Double-Submit CSRF, single-flight session caching, opt-in Prometheus telemetry, Vitest unit tests, and Playwright E2E acceptance suites.
- **Deep Authorization in Nexus & Themis**: Real Zanzibar graph traversal with rewrites, reverse lookups, decision traces, gRPC CRUD, and Themis CEL priority rings with version rollback and fixtures.
- **Official SDKs, CLI & Terraform Provider**: Go, TypeScript/React, and Python SDKs validated by cross-SDK conformance tests (`sdk/conformance_test.sh`), `autorixctl` CLI, and `terraform-provider-autorix` (`autorix_environment`, `autorix_policy`, `autorix_oauth2_client`).
- **Observability**: Shared `platform/metrics` and `platform/tracing` exposing `/metrics` with domain-specific Prometheus histograms/counters (`autorix_nexus_check_duration_seconds_bucket`, `autorix_aegis_requests_total`, `autorix_ego_active_sessions`, `autorix_themis_evaluation_duration_seconds_bucket`, `autorix_janus_tokens_issued_total`, `autorix_vulcan_keys_verified_total`, `autorix_hermes_scim_sync_total`), correlation ID propagation, and Helm ServiceMonitors.
- **Supply Chain & CI/CD**: Automated GitHub Actions pipelines for Go tests, `golangci-lint`, Console build & Playwright E2E, Helm probe verification, security boundary checks, SBOM/OCI image labeling, and GHCR release publication (`ghcr.io/autorix-cl/*`).

## Ongoing & Future Engineering Focus

- Multi-instance RS256 key-rotation propagation drills and HSM/KMS key escrow integrations for high-availability Janus deployments.
- Expanded RFC 8707 resource-audience separation across browser and M2M OAuth2 grants.
- Native OpenTelemetry exporter instrumentation across client SDKs and expanded Terraform resource coverage (Nexus namespaces, Aegis rules, Vulcan keys).

## Next Step

See [Community, Security Policy & Release Notes](/autorix/reference/community) for vulnerability reporting and recent release details.
