---
title: Production Acceptance Checklist & Assurance Matrix
navTitle: Acceptance & Assurance
description: Engineering release gates for production sign-off and candidate evidence mapping across ISO/IEC 27001:2022, SOC 2 Trust Services Criteria, and NIST CSF 2.0.
section: operations
order: 4
---

A deployment is ready to enter a production change window only when every required control below has an accountable owner, dated evidence, and formal risk approval.

> **Important non-claim**: Autorix is open-source software, **not** certified to ISO/IEC 27001, SOC 2, PCI DSS, or banking regulations. Repository controls and evidence exports support an operator's assurance program, but operating effectiveness and certification remain solely the deploying organization's responsibility.

## Production Acceptance Checklist

### Release Identity & Supply Chain

- [ ] Source commit SHA, build timestamp, verified OCI image digests, SBOM, and vulnerability scan results (0 critical CVEs) are attached to the release record.
- [ ] Container images are cryptographically signed and validated by cluster admission policy.
- [ ] Unit, integration, race, Helm-render, and security-boundary CI checks pass.
- [ ] An independent reviewer approves the production diff and change record.

### Identity, Authorization & Cryptography

- [ ] Production issuer, redirect URIs, CORS origins, resource audiences, and Aegis upstreams are explicitly allowlisted.
- [ ] Administrative listeners (`:4445`, `:4456`, `:4400`) remain private and protected by internal auth, RBAC, NetworkPolicies, and audit logging.
- [ ] All signing keys, database credentials, and internal secrets originate from an approved secret manager—zero default or local development secrets deployed.
- [ ] Key rotation, emergency revocation, and JWKS rollover have been rehearsed without disrupting token verification.

### Platform, Resilience & Incident Response

- [ ] PostgreSQL connections require verified TLS (`sslmode=verify-full`), least-privilege credentials, encrypted storage, and tested restore drills meeting approved RTO/RPO.
- [ ] Ingress TLS, HSTS, rate limiting, and WAF/DDoS protections are validated.
- [ ] Dashboards and Alertmanager routes cover auth failures, denials, token/key lifecycle errors, DB saturation, and audit-chain integrity.
- [ ] A current threat model, independent penetration test, and tested rollback artifact are archived in the release record.

## Assurance Evidence Matrix

| Assurance Objective | ISO/IEC 27001:2022 | SOC 2 | NIST CSF 2.0 | Repository Evidence Candidate | Operator-Owned Evidence Required |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Access control & least privilege** | Annex A 5.15, 5.18, 8.2, 8.3 | CC6.1–CC6.3 | Protect (`PR.AA`) | ReBAC/ABAC engines, private admin boundaries, CI security guards | Identity lifecycle, MFA enforcement, periodic access reviews |
| **Authentication & credential protection** | Annex A 5.17, 8.5 | CC6.1, CC6.6 | Protect (`PR.AA`, `PR.DS`) | Ego Argon2id/TOTP/WebAuthn, Janus OAuth2/PKCE, Aegis JWT verification | Password/MFA policies, secret inventory, key custody records |
| **Secure configuration & hardening** | Annex A 8.9, 8.20, 8.22 | CC6.6, CC7.1 | Protect (`PR.PS`, `PR.IR`) | Helm security contexts, NetworkPolicies, internal service auth | Cluster admission baselines, configuration reviews, egress proofs |
| **Cryptographic key management** | Annex A 8.24 | CC6.1, CC6.7 | Protect (`PR.DS`) | Janus persisted RS256 keys, JWKS rotation, HMAC identity signing | HSM/KMS design, separation of duties, key ceremony & revocation drills |
| **Logging, monitoring & auditability** | Annex A 8.15–8.17 | CC7.1, CC7.2 | Detect (`DE.CM`), Govern (`GV.OC`) | Argus SHA-256 audit trail, `/metrics` endpoints, runbook verification | Centralized SIEM retention, time-sync proof, alert delivery tests |
| **Vulnerability & change management** | Annex A 8.8, 8.32 | CC7.1, CC8.1 | Identify (`ID.RA`), Govern (`GV.RM`) | CI pipelines, Grype scans, `SECURITY.md`, release checklists | SBOM provenance, remediation SLAs, CAB approvals |
| **Incident response & recovery** | Annex A 5.24–5.30, 8.13 | A1.2, CC7.3–7.5 | Respond (`RS.*`), Recover (`RC.RP`) | Disclosure policy, runbook backup/restore procedures | On-call roster, tabletop exercises, verified encrypted restore drills |

## Next Step

Explore the architectural foundations in [ADR 0001: Uniform Health Contract](/autorix/reference/adr-health-contract).
