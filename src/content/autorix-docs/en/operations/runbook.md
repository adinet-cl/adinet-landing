---
title: Operations & Runbook (Day-1 & Day-2)
navTitle: Operations Runbook
description: Incident response procedures, emergency operator unlock, enrollment token minting, PostgreSQL backup/restore, forensic audit verification, and optional Alertmanager setup.
section: operations
order: 1
---

This runbook covers Day-1 provisioning, routine maintenance, backup/restore, and Day-2 incident response for self-hosted Autorix clusters.

## Incident Quick Actions

- **Locked out of root operator account?** Jump to [Emergency Account Unlock](#emergency-account-unlock).
- **Aegis proxy returning `502 Bad Gateway`?** Jump to [Troubleshooting Checklist](#troubleshooting-checklist).
- **Nexus ReBAC latency spikes?** Jump to [Troubleshooting Checklist](#troubleshooting-checklist).
- **Suspected audit tampering?** Jump to [Forensic Verification](#forensic-verification).

## Emergency Account Unlock

After 5 consecutive failed sign-in attempts, an operator account is temporarily locked. To unlock immediately via PostgreSQL:

```bash
docker compose exec postgres psql -U autorix -d autorix_argus
```

```sql
UPDATE operator_credentials
SET failed_attempts = 0, locked_until = NULL
WHERE operator_id = (SELECT id FROM operators WHERE email = 'admin@autorix.local');
```

## Minting Engine Enrollment Tokens

1. Authenticate as a cluster administrator to obtain an operator session token:

```bash
SESSION_TOKEN=$(curl -fsS -X POST http://localhost:4400/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autorix.local","password":"<PASSWORD>"}' | jq -r .session.token)
```

2. Mint a scoped `aet_` enrollment token:

```bash
curl -fsS -X POST http://localhost:4400/v1/enrollment-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -d '{
    "engine_type": "themis",
    "environment": "production",
    "expires_in_seconds": 86400,
    "uses_allowed": 1
  }'
```

## Isolated Database Backups & Restore

Because every engine owns an isolated database, back up all 8 databases consistently:

```bash
BACKUP_DIR="/var/backups/autorix/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

for DB in autorix_argus autorix_nexus autorix_ego autorix_janus autorix_vulcan autorix_hermes autorix_themis autorix_aegis; do
  docker compose exec -T postgres pg_dump -U autorix -Fc "$DB" > "$BACKUP_DIR/$DB.dump"
done
```

Restore a single database:

```bash
docker compose exec -T postgres pg_restore -U autorix -d <DATABASE_NAME> --clean --if-exists < /path/to/dump
```

## Forensic Verification

1. **Verify cryptographic SHA-256 chain integrity**:

```bash
curl -fsS http://localhost:4400/v1/audit/verify | jq .verified
```

> If `verified` returns `false`, escalate immediately as a critical security incident—an audit record was modified, deleted, or injected out of order.

2. **Export CSV evidence for external auditors**:

```bash
curl -fsS "http://localhost:4400/v1/audit/export?format=csv" -o "audit-trail-$(date +%Y%m%d).csv"
```

## Troubleshooting Checklist

### Aegis `502 Bad Gateway`

- [ ] Verify upstream readiness (for example, Nexus): `curl -fsS http://localhost:8080/health/ready`.
- [ ] Inspect active routing rules through Console Proxy Rules Studio or private Aegis admin (`:4456`).
- [ ] Confirm internal service authentication tokens (`X-Autorix-Internal-Token`) match between services.

### Nexus ReBAC Latency Spikes

- [ ] Inspect tuple cardinality: `SELECT count(*) FROM relation_tuples;` in `autorix_nexus`.
- [ ] Check connection pool saturation via `postgres_pool_acquired_connections{engine="nexus"}` in Prometheus.
- [ ] Review check latency histograms via `autorix_nexus_check_duration_seconds_bucket`.

## Optional Alertmanager (Self-Hosted)

Prometheus evaluates bundled alerting rules, while notification delivery remains **disabled by default** until you supply an operator-owned Alertmanager configuration (no webhook URLs or SMTP credentials ship in the repo).

### Local Compose (`alerts` profile)

```bash
ALERTMANAGER_CONFIG_PATH=/secure/path/alertmanager.yml \
  docker compose --profile core --profile extended --profile alerts up -d prometheus alertmanager
```

Alertmanager binds only to `127.0.0.1:9093`.

### Kubernetes Helm

Create a Kubernetes Secret outside Helm values and enable it with a verified digest:

```bash
kubectl -n autorix create secret generic autorix-alertmanager-config \
  --from-file=alertmanager.yml=/secure/path/alertmanager.yml
```

```yaml
monitoring:
  alertmanager:
    enabled: true
    existingConfigSecret: autorix-alertmanager-config
    configKey: alertmanager.yml
    image:
      digest: sha256:<verified-alertmanager-image-digest>
```

## Next Step

Deploy to Kubernetes with the [Kubernetes & Helm Guide](/autorix/operations/kubernetes).
