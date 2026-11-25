---
title: Community, Security Policy & Releases
navTitle: Community & Releases
description: License, vulnerability disclosure policy, Semantic Versioning release history (v0.1.0 to v0.2.8), support boundaries, and how to contribute to Autorix.
section: reference
order: 3
---

Autorix is an **Apache-2.0** licensed, self-hosted Zero-Trust IAM project maintained on GitHub at **[Autorix-cl/autorix](https://github.com/Autorix-cl/autorix)**. It is provided with best-effort community support and is not a managed service or SLA-backed offering.

## Get Help & Participate

| Channel | Purpose |
| :--- | :--- |
| [GitHub Discussions](https://github.com/Autorix-cl/autorix/discussions) | Setup, architecture questions, and integration patterns |
| [GitHub Issues](https://github.com/Autorix-cl/autorix/issues/new/choose) | Reproducible bugs and feature proposals |
| [Private Security Advisory](https://github.com/Autorix-cl/autorix/security/advisories/new) | Confidential vulnerability reports (never post security bugs in public issues) |

## Vulnerability Disclosure Policy

Do **not** disclose suspected security vulnerabilities in public issues, discussions, logs, or pull requests. Submit a private report via GitHub Security Advisories including:

- Affected release tag, commit SHA, deployment mode, and component
- Impact, prerequisites, and minimal reproducible proof of concept
- Suggested mitigation (if known) and secure contact details

## Recent Release Highlights

Autorix follows [Semantic Versioning 2.0.0](https://semver.org/) with signed Git tags and OCI-labeled container images published to `ghcr.io/autorix-cl/*`.

| Release | Date | Key Changes |
| :--- | :--- | :--- |
| **`v0.2.8`** | 2026-11-25 | Opt-in Prometheus telemetry via `PROMETHEUS_INTERNAL_URL`, clean Undici fetch body draining, `UV_THREADPOOL_SIZE=16`, OCI image labels & `latest` tag |
| **`v0.2.6`–`v0.2.7`** | 2026-11-25 | Shared `globalThis` single-flight session validation cache in Console (15s TTL, instant logout invalidation), Argus `IdleTimeout: 60s`, hardened CI release publishing |
| **`v0.2.3`–`v0.2.5`** | 2026-11-24 | `golang:1.26-alpine` & `alpine:3.24` (0 critical CVEs), Argus default environment seeding, `TouchSession` throttling, PostgreSQL `max_connections=300`, lowercase GHCR tags |
| **`v0.2.0`–`v0.2.2`** | 2026-11-24 | Next.js `15.5.29` CVE remediation, cluster-wide internal auth (mTLS SPIFFE + `X-Autorix-Internal-Token`), Aegis HMAC-SHA256 `X-Autorix-Identity-Signature`, real Ego WebAuthn/Passkeys, real `terraform-provider-autorix` |
| **`v0.1.0`** | 2026-11-24 | Initial public OSS baseline: Apache-2.0 governance, hardened 8 Go engines, Console Studios, SDKs, and Helm chart |

## Contributing

Before opening a pull request, review `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` in the repository:

- Use **Conventional Commits** (`feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`, `test(...)`).
- Public product documentation is maintained in English and neutral technical Spanish.
- Run unit tests and linters across modified Go modules and `console/` before submitting changes.
