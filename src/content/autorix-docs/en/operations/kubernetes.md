---
title: Kubernetes & Helm Production Guide
navTitle: Kubernetes Deployment
description: Deploy the Autorix Zero-Trust IAM Suite on EKS, GKE, AKS, Talos, or K3s using the official umbrella Helm chart, isolated database secrets, HPA, and strict health probes.
section: operations
order: 2
---

Deploy the **Autorix Zero-Trust IAM Suite** on production Kubernetes clusters (EKS, GKE, AKS, Talos, K3s) using the official umbrella Helm chart in `deploy/helm/autorix`.

## Quick Path: Deploy with Helm

1. **Create the namespace and 7-key database credentials Secret** (`sslmode=verify-full` recommended for managed PostgreSQL):

```bash
kubectl create namespace autorix

kubectl create secret generic autorix-db-credentials \
  --namespace autorix \
  --from-literal=argus-database-url='postgres://.../autorix_argus?sslmode=verify-full' \
  --from-literal=ego-database-url='postgres://.../autorix_ego?sslmode=verify-full' \
  --from-literal=hermes-database-url='postgres://.../autorix_hermes?sslmode=verify-full' \
  --from-literal=janus-database-url='postgres://.../autorix_janus?sslmode=verify-full' \
  --from-literal=nexus-database-url='postgres://.../autorix_nexus?sslmode=verify-full' \
  --from-literal=themis-database-url='postgres://.../autorix_themis?sslmode=verify-full' \
  --from-literal=vulcan-database-url='postgres://.../autorix_vulcan?sslmode=verify-full'
```

2. **Install or upgrade the Helm release** (supplying your release overlay containing verified SHA-256 OCI image digests):

```bash
helm upgrade --install autorix deploy/helm/autorix \
  --namespace autorix \
  --values deploy/helm/autorix/values-production.yaml \
  --values ./production-digests.yaml \
  --set global.domain="autorix.enterprise.io" \
  --set global.postgresql.host="postgres-ha.database.svc.cluster.local"
```

## Production Topology

```text
                           [ INCOMING TRAFFIC ]
                                    │
                                    ▼ (TLS 1.3 Termination)
                        ┌──────────────────────┐
                        │   Kubernetes Ingress │ (NGINX / Envoy / Traefik)
                        └──────────┬───────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  auth.domain.com           api.domain.com            console.domain.com
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  Janus (OIDC)   │       │  Aegis (Proxy)  │       │ Autorix Console  │
│  (Replicas: 2+) │       │  (Replicas: 3+) │       │  (Replicas: 2+)  │
└────────┬────────┘       └────────┬────────┘       └────────┬─────────┘
         │                         │ (Internal gRPC)         │
         │                         ▼                         │
         │                ┌─────────────────┐                │
         │                │  Nexus / Themis │                │
         │                │  (Replicas: 3+) │                │
         │                └────────┬────────┘                │
         └─────────────────────────┼─────────────────────────┘
                                   ▼ (Fleet Control & Audit)
                          ┌─────────────────┐
                          │  Argus Control  │
                          │  (Replicas: 2+) │
                          └────────┬────────┘
                                   ▼
                          ┌─────────────────┐
                          │ PostgreSQL HA   │ (CloudNativePG / RDS / Cloud SQL)
                          └─────────────────┘
```

## Health Probes Matrix

All Go engines implement `/health/alive`, `/health/ready`, and `/info` (validated automatically against Helm templates in CI via `scripts/ci/check_helm_probes.py`):

| Component | Readiness Probe | Notes |
| :--- | :--- | :--- |
| **Argus** | `:4400/health/ready` | Verifies `autorix_argus` reachability |
| **Nexus** | `:8080/health/ready` | Also serves `grpc.health.v1.Health` on `:50051` |
| **Themis** | `:4488/health/ready` | Also serves `grpc.health.v1.Health` on `:50052` |
| **Ego** | `:4433/health/ready` | Verifies `autorix_ego` reachability |
| **Janus** | `:4444/health/ready` | Admin listener `:4445` stays private `ClusterIP` |
| **Aegis** | `:4456/health/ready` | Served on admin port only; never shadowed by proxy rules |
| **Vulcan** | `:4466/health/ready` | Verifies `autorix_vulcan` reachability |
| **Hermes** | `:4477/health/ready` | Verifies `autorix_hermes` reachability |
| **Console** | `:3000/api/health` | Next.js 15 BFF health endpoint |

## High Availability, Autoscaling & Tenant Isolation

- **Horizontal Pod Autoscaling (HPA)**: Scale high-throughput edge and decision engines (**Aegis**, **Nexus**, **Themis**) dynamically based on CPU/memory (e.g., 70% CPU target, up to 20+ replicas).
- **NetworkPolicies**: The Helm chart enables default-deny ingress NetworkPolicies, allowing only configured ingress-controller traffic to public edge services, in-namespace Autorix communication, and explicit monitoring scrapes. Verify `networkPolicy.ingressController` and `networkPolicy.monitoring` selectors before rollout.
- **Environment Partitioning**: Isolate `production`, `staging`, and `development` clusters via dedicated Kubernetes namespaces and Argus environments.
- **Reference Manifests**: See `deploy/reference/` in the repository for CloudNativePG, External Secrets Operator, and cluster runbook examples.

## Deployment Checklist

- [ ] Provision a highly available PostgreSQL cluster with TLS and automated encrypted backups.
- [ ] Populate all 7 keys in `global.postgresql.existingSecret` from your secret manager.
- [ ] Pin every container image to a verified `sha256:` OCI digest.
- [ ] Configure HPA for Aegis, Nexus, and Themis.
- [ ] Verify pod readiness with `kubectl get pods -n autorix`.

## Next Step

Complete [Production Transition & Security Migration](/autorix/operations/production-transition) before cutting over live traffic.
