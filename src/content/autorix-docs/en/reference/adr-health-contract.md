---
title: "ADR 0001: Uniform Health, Readiness & Identity Contract"
navTitle: "ADR 0001: Health Contract"
description: Architectural Decision Record establishing consistent /health/alive, /health/ready, /info, and gRPC health probing across all Autorix Go engines.
section: reference
order: 1
badge: Accepted
---

- **Status**: Accepted
- **Scope**: All Go microservices (`aegis`, `argus`, `ego`, `hermes`, `janus`, `nexus`, `themis`, `vulcan`)
- **Shared Package**: `github.com/autorix/platform/health` and `github.com/autorix/platform/grpchealth`

## Context

Historically, engines had inconsistent health behavior: three engines returned static `"status": "healthy"` responses without testing dependencies, while four had no health endpoint at all—causing Kubernetes Helm probes (such as Ego's `/health/alive`) to fail into `CrashLoopBackOff`. Additionally, **Argus** requires reliable readiness and build-identity metadata to power fleet topology and upgrade detection.

## Decision

Every Go engine implements the exact same HTTP contract through the shared `platform/health` library:

- **`GET /health/alive`**: Process liveness. Checks **zero** external dependencies and succeeds whenever the process can schedule HTTP requests—preventing cascading pod restarts during brief database blips.
- **`GET /health/ready`**: Service readiness. Executes every registered named dependency check (such as PostgreSQL reachability bounded to a 2-second ping via `platform/postgres.Check`) and fails closed with HTTP `503 "not_ready"` plus per-check diagnostics if any check fails.
- **`GET /info`**: Engine identity payload containing engine name, semantic version, Git build SHA (injected at build time via `-ldflags -X`), schema version, declared capabilities, instance ID, and uptime.

### gRPC Parity & Aegis Isolation

- **Nexus** (`:50051`) and **Themis** (`:50052`) expose the standard `grpc.health.v1.Health` service backed live by the exact same `health.Checker` instance—making it impossible for HTTP and gRPC probes to disagree.
- **Aegis** serves `/health/*` and `/info` exclusively on its private admin listener (`:4456`), never on its reverse-proxy port (`:4455`), so wildcard routing rules can never shadow cluster health checks.
- Legacy `GET /health` endpoints on Aegis, Nexus, and Themis remain as deprecated aliases matching `/health/alive` semantics for backward compatibility.

## Consequences

1. Eliminates Helm probe drift—enforced continuously in CI by `scripts/ci/check_helm_probes.py`, which renders the Helm chart and asserts every probe path exists in Go routing code.
2. Each engine Dockerfile builds from the repository root context so `COPY platform ./platform` resolves local `replace github.com/autorix/platform => ../platform` directives cleanly without requiring a `go.work` workspace inside isolated builds.
3. Database-backed engines expose their `*pgxpool.Pool` accessor for readiness checks, while stateless **Aegis** reports ready by construction as soon as it can schedule requests.

## Next Step

Review the audited implementation state in [Architecture Status & Roadmap](/autorix/reference/roadmap).
