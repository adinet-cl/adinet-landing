---
title: Autorix Argus — Plano de Control y Cadena de Auditoría
navTitle: Argus (Plano de Control)
description: Plano central de gobernanza que administra tokens de enrolamiento (aet_), latidos gRPC de flota, entornos, sesiones de operadores y un registro de auditoría inmutable encadenado por SHA-256.
section: control-plane
order: 1
ports: "4400 / 50053"
protocol: "REST / gRPC"
---

**Autorix Argus** es el plano central de gobernanza y control de flota de la suite Autorix. Administra el reclamo inicial del clúster (`abt_`), el enrolamiento de motores (`aet_`), el aislamiento por entornos, las sesiones de operadores, los latidos de salud vía gRPC y una **cadena de auditoría SHA-256 a prueba de manipulación** para respaldar evidencias de cumplimiento SOC 2 e ISO 27001.

## Ruta Rápida: Reclamar el Clúster Raíz

Al arrancar por primera vez sobre `autorix_argus` vacío, Argus inicializa los entornos predeterminados (`production`, `staging`, `development`) y emite un token único de bootstrap (`abt_...`):

1. **Ubica el token de bootstrap** en los logs de Argus:

```bash
docker logs autorix-argus | grep -i "bootstrap token"
```

2. **Reclama la cuenta de administrador raíz** (o realiza el asistente visualmente en Console `/setup`):

```bash
curl -X POST http://localhost:4400/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "bootstrap_token": "abt_0123456789abcdef...",
    "name": "Cluster Administrator",
    "email": "admin@autorix.local",
    "password": "StrongMasterPassword#2026"
  }'
```

## Orquestación de Flota y Tokens de Enrolamiento

Argus supervisa la topología de motores en tiempo real por gRPC (`:50053`), registrando latidos, commit SHAs, estado de preparación y entorno asignado. Las nuevas instancias se incorporan mediante **Tokens de Enrolamiento (`aet_...`)**:

```bash
curl -X POST http://localhost:4400/v1/enrollment-tokens \
  -H "Authorization: Bearer $SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "engine_type": "nexus",
    "environment": "production",
    "uses_allowed": 1,
    "expires_in_seconds": 86400
  }'
```

## Cadena Criptográfica de Auditoría SHA-256

Cada operación mutable dentro del ecosistema Autorix se incorpora al libro de auditoría de Argus enlazando el hash del registro inmediatamente anterior:

```text
Hash Registro = SHA-256(prev_hash + id + action + resource_type + resource_id + outcome + created_at)
```

Verifica matemáticamente la continuidad de toda la cadena en cualquier momento:

```bash
curl -fsS http://localhost:4400/v1/audit/verify
```

Si algún registro fue editado, borrado o insertado fuera de orden directamente en PostgreSQL, la verificación falla de inmediato e identifica el eslabón roto.

## Referencia de API REST (`:4400`) y gRPC (`:50053`)

### Endpoints REST

| Dominio | Endpoints |
| :--- | :--- |
| **Flota y Topología** | `GET /v1/instances`, `POST /v1/instances/{id}/force-remove`, `GET /v1/topology`, `GET /v1/stream` (flujo SSE) |
| **Entornos** | `GET /v1/environments`, `POST /v1/environments`, `GET / DELETE /v1/environments/{id}` |
| **Tokens de Enrolamiento** | `POST /v1/enrollment-tokens`, `GET /v1/enrollment-tokens`, `DELETE /v1/enrollment-tokens/{id}` |
| **Sesiones de Operador** | `POST /v1/auth/bootstrap`, `POST /v1/auth/login`, `GET /v1/auth/session`, `DELETE /v1/auth/session` |
| **Auditoría y Cumplimiento** | `GET / POST /v1/audit`, `GET /v1/audit/verify`, `GET /v1/audit/export`, `GET /v1/compliance/evidence` |

> Desde `v0.2.4`, las escrituras de actividad de sesión (`TouchSession`) se limitan a una vez por minuto para evitar contención de bloqueos en PostgreSQL bajo cargas paralelas del BFF, y Argus define `IdleTimeout: 60s` para compatibilidad limpia de keep-alive con Node.js Undici.

### Interfaz gRPC de Control (`:50053`)

Implementa `argus.v1.ArgusControlService`:
- `Register(RegistrationRequest)`
- `Heartbeat(HeartbeatRequest)`
- `ListInstances(ListInstancesRequest)`
- `GetInstance(GetInstanceRequest)`
- `Evict(EvictRequest)`

## Lista de Verificación

- [ ] Reclamar la cuenta raíz usando el token único `abt_`.
- [ ] Mantener Argus REST (`:4400`) y gRPC (`:50053`) accesibles únicamente en la red interna.
- [ ] Emitir un token `aet_` y comprobar el registro de latidos en `/v1/topology`.
- [ ] Ejecutar `GET /v1/audit/verify` y probar la exportación de evidencia en `GET /v1/compliance/evidence`.

## Siguiente Paso

Administra Argus y los 7 motores IAM visualmente desde [Autorix Console](/autorix/control-plane/console).
