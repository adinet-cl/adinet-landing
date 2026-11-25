---
title: Runbook Operativo (Día 1 y Día 2)
navTitle: Runbook Operativo
description: Procedimientos de respuesta ante incidentes, desbloqueo de emergencia de operadores, emisión de tokens de enrolamiento, copias de seguridad PostgreSQL, verificación forense y Alertmanager opcional.
section: operations
order: 1
---

Este runbook cubre el aprovisionamiento de Día 1, mantenimiento rutinario, respaldos y respuesta a incidentes de Día 2 para clústeres autogestionados de Autorix.

## Acciones Rápidas ante Incidentes

- **¿Cuenta raíz bloqueada?** Ve a [Desbloqueo de Emergencia](#desbloqueo-de-emergencia).
- **¿Aegis devuelve `502 Bad Gateway`?** Revisa la [Lista de Diagnóstico](#lista-de-diagnóstico).
- **¿Picos de latencia en Nexus ReBAC?** Revisa la [Lista de Diagnóstico](#lista-de-diagnóstico).
- **¿Alerta de manipulación en auditoría?** Ve a [Verificación Forense](#verificación-forense).

## Desbloqueo de Emergencia

Tras 5 intentos fallidos consecutivos de inicio de sesión, la cuenta del operador se bloquea temporalmente. Para desbloquearla desde PostgreSQL:

```bash
docker compose exec postgres psql -U autorix -d autorix_argus
```

```sql
UPDATE operator_credentials
SET failed_attempts = 0, locked_until = NULL
WHERE operator_id = (SELECT id FROM operators WHERE email = 'admin@autorix.local');
```

## Emisión de Tokens de Enrolamiento

1. Inicia sesión como administrador del clúster para obtener un token de operador:

```bash
SESSION_TOKEN=$(curl -fsS -X POST http://localhost:4400/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@autorix.local","password":"<PASSWORD>"}' | jq -r .session.token)
```

2. Emite el token `aet_` específico para el motor:

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

## Respaldo y Restauración de Bases de Datos Aisladas

Cada motor administra su propia base de datos; respalda las 8 de forma consistente:

```bash
BACKUP_DIR="/var/backups/autorix/$(date +%Y-%m-%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

for DB in autorix_argus autorix_nexus autorix_ego autorix_janus autorix_vulcan autorix_hermes autorix_themis autorix_aegis; do
  docker compose exec -T postgres pg_dump -U autorix -Fc "$DB" > "$BACKUP_DIR/$DB.dump"
done
```

Para restaurar una base de datos individual:

```bash
docker compose exec -T postgres pg_restore -U autorix -d <DATABASE_NAME> --clean --if-exists < /path/to/dump
```

## Verificación Forense

1. **Verificar la integridad criptográfica de la cadena SHA-256**:

```bash
curl -fsS http://localhost:4400/v1/audit/verify | jq .verified
```

> Si `verified` devuelve `false`, escala inmediatamente como incidente crítico de seguridad: un registro fue alterado, eliminado o insertado fuera de secuencia.

2. **Exportar evidencia CSV para auditores externos**:

```bash
curl -fsS "http://localhost:4400/v1/audit/export?format=csv" -o "audit-trail-$(date +%Y%m%d).csv"
```

## Lista de Diagnóstico

### Aegis `502 Bad Gateway`

- [ ] Comprobar la salud del upstream (por ejemplo, Nexus): `curl -fsS http://localhost:8080/health/ready`.
- [ ] Revisar reglas activas desde el **Proxy Rules Studio** de Console o el puerto administrativo privado `:4456`.
- [ ] Confirmar que `X-Autorix-Internal-Token` coincide entre los servicios internos.

### Picos de Latencia en Nexus ReBAC

- [ ] Consultar volumen de tuplas: `SELECT count(*) FROM relation_tuples;` en `autorix_nexus`.
- [ ] Revisar saturación del pool en `postgres_pool_acquired_connections{engine="nexus"}` en Prometheus.
- [ ] Analizar histogramas de latencia en `autorix_nexus_check_duration_seconds_bucket`.

## Alertmanager Opcional (Autogestionado)

Prometheus evalúa las reglas de alerta incluidas, pero el envío de notificaciones permanece **deshabilitado por defecto** hasta proporcionar una configuración propia de Alertmanager (el repositorio no incluye webhooks ni credenciales SMTP).

### Docker Compose Local (perfil `alerts`)

```bash
ALERTMANAGER_CONFIG_PATH=/ruta/segura/alertmanager.yml \
  docker compose --profile core --profile extended --profile alerts up -d prometheus alertmanager
```

Alertmanager escucha únicamente en `127.0.0.1:9093`.

### Kubernetes Helm

Crea el Secret fuera de los valores de Helm y habilítalo con digest verificado:

```bash
kubectl -n autorix create secret generic autorix-alertmanager-config \
  --from-file=alertmanager.yml=/ruta/segura/alertmanager.yml
```

```yaml
monitoring:
  alertmanager:
    enabled: true
    existingConfigSecret: autorix-alertmanager-config
    configKey: alertmanager.yml
    image:
      digest: sha256:<digest-verificado-de-alertmanager>
```

## Siguiente Paso

Despliega Autorix en producción con la [Guía de Kubernetes y Helm](/autorix/operations/kubernetes).
