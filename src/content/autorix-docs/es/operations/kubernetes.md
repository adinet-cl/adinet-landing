---
title: Guía de Despliegue en Kubernetes y Helm
navTitle: Despliegue en Kubernetes
description: Despliega la suite Autorix Zero-Trust IAM en EKS, GKE, AKS, Talos o K3s mediante el chart umbrella oficial de Helm, secretos de base de datos aislados, HPA y sondas de salud verificadas.
section: operations
order: 2
---

Despliega la **Suite IAM Zero-Trust Autorix** en clústeres productivos de Kubernetes (EKS, GKE, AKS, Talos, K3s) utilizando el chart umbrella oficial de Helm ubicado en `deploy/helm/autorix`.

## Ruta Rápida: Despliegue con Helm

1. **Crea el namespace y el Secret de 7 claves de base de datos** (se recomienda `sslmode=verify-full` sobre PostgreSQL administrado):

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

2. **Instala o actualiza el release de Helm** (adjuntando tu archivo de digests OCI SHA-256 verificados):

```bash
helm upgrade --install autorix deploy/helm/autorix \
  --namespace autorix \
  --values deploy/helm/autorix/values-production.yaml \
  --values ./production-digests.yaml \
  --set global.domain="autorix.enterprise.io" \
  --set global.postgresql.host="postgres-ha.database.svc.cluster.local"
```

## Topología Productiva

```text
                           [ TRÁFICO ENTRANTE ]
                                    │
                                    ▼ (Terminación TLS 1.3)
                        ┌──────────────────────┐
                        │   Kubernetes Ingress │ (NGINX / Envoy / Traefik)
                        └──────────┬───────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
  auth.domain.com           api.domain.com            console.domain.com
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│  Janus (OIDC)   │       │  Aegis (Proxy)  │       │ Autorix Console  │
│  (Réplicas: 2+) │       │  (Réplicas: 3+) │       │  (Réplicas: 2+)  │
└────────┬────────┘       └────────┬────────┘       └────────┬─────────┘
         │                         │ (gRPC Interno)          │
         │                         ▼                         │
         │                ┌─────────────────┐                │
         │                │  Nexus / Themis │                │
         │                │  (Réplicas: 3+) │                │
         │                └────────┬────────┘                │
         └─────────────────────────┼─────────────────────────┘
                                   ▼ (Control de Flota y Auditoría)
                          ┌─────────────────┐
                          │  Argus Control  │
                          │  (Réplicas: 2+) │
                          └────────┬────────┘
                                   ▼
                          ┌─────────────────┐
                          │ PostgreSQL HA   │ (CloudNativePG / RDS / Cloud SQL)
                          └─────────────────┘
```

## Matriz de Sondas de Salud

Todos los motores Go implementan `/health/alive`, `/health/ready` e `/info` (verificados continuamente contra Helm en CI mediante `scripts/ci/check_helm_probes.py`):

| Componente | Sonda de Preparación | Notas |
| :--- | :--- | :--- |
| **Argus** | `:4400/health/ready` | Valida conectividad con `autorix_argus` |
| **Nexus** | `:8080/health/ready` | También expone `grpc.health.v1.Health` en `:50051` |
| **Themis** | `:4488/health/ready` | También expone `grpc.health.v1.Health` en `:50052` |
| **Ego** | `:4433/health/ready` | Valida conectividad con `autorix_ego` |
| **Janus** | `:4444/health/ready` | El puerto admin `:4445` permanece en `ClusterIP` privado |
| **Aegis** | `:4456/health/ready` | Servido solo en el puerto admin; inmune a reglas de proxy |
| **Vulcan** | `:4466/health/ready` | Valida conectividad con `autorix_vulcan` |
| **Hermes** | `:4477/health/ready` | Valida conectividad con `autorix_hermes` |
| **Console** | `:3000/api/health` | Endpoint de salud del BFF Next.js 15 |

## Alta Disponibilidad, Autoescalado y Aislamiento

- **Horizontal Pod Autoscaling (HPA)**: Escala dinámicamente los motores críticos de tráfico (**Aegis**, **Nexus**, **Themis**) según CPU/memoria (por ejemplo, objetivo 70% CPU hasta 20+ réplicas).
- **NetworkPolicies**: El chart activa políticas *default-deny* de ingreso, permitiendo solo tráfico del controlador Ingress hacia servicios públicos, comunicación interna del namespace y scraping autorizado de monitoreo. Verifica `networkPolicy.ingressController` y `networkPolicy.monitoring` antes del despliegue.
- **Particionamiento por Entorno**: Aísla `production`, `staging` y `development` mediante namespaces dedicados y entornos de Argus.
- **Manifiestos de Referencia**: Consulta `deploy/reference/` en el repositorio para ejemplos con CloudNativePG, External Secrets Operator y runbooks de clúster.

## Lista de Verificación de Despliegue

- [ ] Aprovisionar PostgreSQL en alta disponibilidad con TLS y respaldos cifrados automáticos.
- [ ] Cargar las 7 claves en `global.postgresql.existingSecret` desde el gestor de secretos.
- [ ] Fijar cada imagen de contenedor mediante digest OCI `sha256:`.
- [ ] Configurar HPA para Aegis, Nexus y Themis.
- [ ] Confirmar estado `Ready` en todos los pods con `kubectl get pods -n autorix`.

## Siguiente Paso

Completa la guía de [Transición a Producción, Seguridad y Rollback](/autorix/operations/production-transition) antes de abrir tráfico real.
