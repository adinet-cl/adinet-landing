---
title: Docker Compose Onboarding
navTitle: Quick Start (Docker)
description: Launch the local Autorix Zero-Trust IAM stack with Docker Compose v2, generate local secrets, claim the Argus root administrator, and verify service readiness.
section: overview
order: 2
---

> **Local development and evaluation only**: Docker Compose uses local ports, development credentials, HTTP between services, and PostgreSQL with `sslmode=disable`. Do not expose this stack to the Internet or treat it as a production deployment.

## Prerequisites

- Docker Engine with **Compose v2**
- At least **8 GB RAM** available to Docker
- Local ports `3000`, `4400`, `4433`, `4444`, `4455`, `5432`, and `8080` available

## Compose Profiles

Autorix organizes its Docker Compose stack into three composable profiles so you can run only the components you need:

| Profile | Services Included | Purpose |
| :--- | :--- | :--- |
| `core` | `postgres`, `redis`, `argus`, `nexus`, `ego`, `janus`, `aegis`, `console` | Essential IAM, OAuth2/OIDC, ReBAC, PEP proxy, control plane, and Admin Console |
| `extended` | `vulcan`, `hermes`, `themis`, `prometheus`, `docs` | Macaroon API keys, SAML/SCIM federation, ABAC CEL engine, and metrics scraper |
| `alerts` | `alertmanager` | Optional self-hosted alert routing (requires operator-owned config file) |

## Start the Core Stack

1. **Generate untracked local development secrets** before every fresh setup (never commit the generated `.env` or secret files):

```bash
./scripts/generate-local-secrets.sh
```

2. **Build and launch the core cluster**:

```bash
docker compose --profile core up -d --build
docker compose --profile core ps
```

To run the full 9-service suite including Vulcan, Hermes, Themis, and Prometheus:

```bash
docker compose --profile core --profile extended up -d --build
```

## Initial Bootstrap & Root Owner Setup

When Argus boots on an empty database, it automatically seeds the default environments (`production`, `staging`, `development`) and generates a single-use bootstrap token (`abt_...`).

1. **Retrieve Argus's one-time bootstrap token** from the container logs:

```bash
docker logs autorix-argus | grep -i "bootstrap token"
```

2. Open **[http://localhost:3000](http://localhost:3000)** in your browser. Because no root owner exists yet, Console automatically redirects you to `/setup`.
3. Paste the `abt_...` bootstrap token and create the Master Administrator account.
4. Once claimed, the token is permanently invalidated and the cluster locks down; you are redirected to `/login`.

> Never copy bootstrap tokens or operator passwords into source control, shell history, or shared tickets.

## Verify Local Service Health

Every Go microservice implements the uniform `/health/alive`, `/health/ready`, and `/info` contract:

```bash
curl -fsS http://localhost:4444/health/ready  # Janus public OAuth2/OIDC API
curl -fsS http://localhost:4455/health/ready  # Aegis PEP proxy
curl -fsS http://localhost:4400/health/ready  # Argus fleet control plane
curl -fsS http://localhost:8080/health/ready  # Nexus ReBAC engine
curl -fsS http://localhost:4433/health/ready  # Ego identity engine
```

## Private Administration Boundaries

Janus administration (`:4445`) and Aegis administration (`:4456`) are **intentionally not published** by Docker Compose. Manage them through the authenticated Console BFF or via `docker compose exec` inside the cluster network—never add host-port mappings for administrative listeners.

## Running Automated Tests Locally

```bash
# Run unit tests across all 8 Go microservices
for dir in argus nexus ego janus aegis vulcan hermes themis; do
  (cd "$dir" && go test -v ./...)
done

# Run Console unit tests and validate production build
(cd console && npm test && npm run build)

# Run Playwright E2E acceptance suite against the running stack
(cd console && npx playwright test)
```

## Next Step

Review the [Master Architecture & Edge Pipeline](/autorix/architecture) and [Security Configuration](/autorix/security-configuration) before integrating your first application.
