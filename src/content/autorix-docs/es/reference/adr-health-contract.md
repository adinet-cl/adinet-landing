---
title: "ADR 0001: Contrato Uniforme de Salud, Preparación e Identidad"
navTitle: "ADR 0001: Contrato de Salud"
description: Registro de Decisión Arquitectónica que estandariza /health/alive, /health/ready, /info y sondas gRPC en todos los motores Go de Autorix.
section: reference
order: 1
badge: Aceptado
---

- **Estado**: Aceptado
- **Alcance**: Todos los microservicios Go (`aegis`, `argus`, `ego`, `hermes`, `janus`, `nexus`, `themis`, `vulcan`)
- **Paquetes Compartidos**: `github.com/autorix/platform/health` y `github.com/autorix/platform/grpchealth`

## Contexto

Inicialmente los motores presentaban comportamientos dispares: tres exponían un `GET /health` estático que siempre devolvía `"status": "healthy"` sin validar dependencias, mientras que cuatro carecían por completo de sondas de salud —provocando `CrashLoopBackOff` en Kubernetes (por ejemplo, el chart Helm de Ego sondeaba `/health/alive`). Además, **Argus** necesita metadatos fiables de preparación y versión para la topología de flota y detección de actualizaciones.

## Decisión

Todos los motores Go implementan exactamente el mismo contrato HTTP mediante la librería compartida `platform/health`:

- **`GET /health/alive`**: Vitalidad (*liveness*) del proceso. No consulta dependencias externas y responde con éxito mientras el proceso pueda atender peticiones HTTP, evitando reinicios en cascada por microcortes de base de datos.
- **`GET /health/ready`**: Preparación (*readiness*). Ejecuta todos los chequeos registrados para el motor (como alcance a PostgreSQL acotado a 2 segundos con `platform/postgres.Check`) y falla de modo cerrado con HTTP `503 "not_ready"` detallando la causa por dependencia.
- **`GET /info`**: Identidad del motor: nombre, versión semántica, commit SHA de compilación (inyectado con `-ldflags -X`), versión de esquema, capacidades declaradas, ID de instancia y tiempo de actividad.

### Paridad gRPC y Aislamiento de Aegis

- **Nexus** (`:50051`) y **Themis** (`:50052`) registran el servicio estándar `grpc.health.v1.Health` respaldado en vivo por la misma instancia `health.Checker`, impidiendo cualquier discrepancia entre sondas HTTP y gRPC.
- **Aegis** expone `/health/*` e `/info` exclusivamente en su puerto administrativo privado (`:4456`), nunca en el puerto de proxy (`:4455`), de modo que ninguna regla wildcard pueda eclipsar las sondas del clúster.
- Los endpoints heredados `GET /health` en Aegis, Nexus y Themis permanecen como alias deprecados equivalentes a `/health/alive` para evitar rupturas retroactivas.

## Consecuencias

1. Elimina la deriva entre código y Helm: el trabajo de CI `scripts/ci/check_helm_probes.py` renderiza el chart y valida que cada ruta de sonda exista realmente en el código Go.
2. Cada Dockerfile se construye con contexto en la raíz del repositorio para que `COPY platform ./platform` resuelva `replace github.com/autorix/platform => ../platform` manteniendo cada módulo autocontenido.
3. Los motores con base de datos exponen su `*pgxpool.Pool` para sondas reales, mientras que **Aegis** (sin BD) reporta preparación por construcción mientras pueda planificar peticiones.

## Siguiente Paso

Consulta el estado auditado y la hoja de ruta en [Estado Arquitectónico y Roadmap](/autorix/reference/roadmap).
