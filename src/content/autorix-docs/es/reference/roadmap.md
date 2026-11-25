---
title: Estado Arquitectónico y Hoja de Ruta
navTitle: Estado y Roadmap
description: Estado de implementación auditado contra el código real en los 8 microservicios Go, Consola Next.js 15, SDKs oficiales, Provider de Terraform, observabilidad y cadena de suministro CI/CD.
section: reference
order: 2
---

Autorix está diseñado sobre tres principios: **descentralización extrema, límites Zero-Trust y APIs Headless**. Cada motor Go compila a un binario estático independiente con su propia base de datos PostgreSQL, eliminando acoplamientos de esquema y cuellos de botella compartidos.

## Estado Auditado de Implementación (`v0.2.8`)

Cada punto siguiente refleja funcionalidad verificada en código fuente y cubierta por CI automatizado:

- **8 Microservicios Go Independientes**: `argus`, `nexus`, `ego`, `janus`, `aegis`, `vulcan`, `hermes` y `themis`, cada uno con módulo Go propio, migraciones SQL, estructura hexagonal y suite de pruebas unitarias.
- **Contrato Uniforme de Salud e Identidad (ADR 0001)**: `/health/alive`, `/health/ready`, `/info` y `grpc.health.v1.Health` implementados sobre `platform/health` y protegidos contra deriva de Helm en CI.
- **Endurecimiento de Seguridad del Clúster (`v0.2.0`–`v0.2.8`)**:
  - Autenticación interna de servicios (`platform/httpx.InternalAuth` y `platform/tls.UnaryInternalAuthInterceptor`) con soporte mTLS SPIFFE y verificación en tiempo constante de tokens compartidos en los 8 motores Go y el BFF de Console.
  - Firma canónica `v1` HMAC-SHA256 de cabeceras de identidad (`X-Autorix-Identity-Signature`) en Aegis y validación en tiempo constante en los SDKs de Go, TypeScript y Python.
  - Ceremonias reales WebAuthn / Passkeys en Ego (`github.com/go-webauthn/webauthn`) con desafíos de un solo uso con TTL y rechazo de clonación.
  - Imágenes base endurecidas (`golang:1.26-alpine`, `alpine:3.24`, Next.js `15.5.29`, `golang.org/x/net v0.60.0`) con **0 CVEs críticos** bajo Grype.
- **Autorix Console (Next.js 15 App Router)**: 9 Studios operativos, validación estricta con Zod en respuestas BFF, shell de autenticación aislado, control RBAC, Double-Submit CSRF, caché de sesión single-flight, telemetría Prometheus opcional, pruebas unitarias con Vitest y aceptación E2E con Playwright.
- **Autorización Profunda en Nexus y Themis**: Recorrido de grafos Zanzibar con rewrites, búsquedas inversas, trazas de decisión y CRUD gRPC, junto con anillos de prioridad CEL en Themis con rollback y fixtures.
- **SDKs Oficiales, CLI y Terraform Provider**: SDKs de Go, TypeScript/React y Python validados con suite de conformidad cruzada (`sdk/conformance_test.sh`), CLI `autorixctl` y `terraform-provider-autorix` (`autorix_environment`, `autorix_policy`, `autorix_oauth2_client`).
- **Observabilidad**: Módulos compartidos `platform/metrics` y `platform/tracing` exponiendo `/metrics` con métricas de dominio (`autorix_nexus_check_duration_seconds_bucket`, `autorix_aegis_requests_total`, `autorix_ego_active_sessions`, `autorix_themis_evaluation_duration_seconds_bucket`, `autorix_janus_tokens_issued_total`, `autorix_vulcan_keys_verified_total`, `autorix_hermes_scim_sync_total`), propagación de Correlation ID y ServiceMonitors en Helm.
- **Cadena de Suministro y CI/CD**: Pipelines en GitHub Actions con pruebas Go, `golangci-lint`, build de Console y E2E Playwright, validación de sondas Helm, guardias de límites de seguridad, etiquetas OCI y publicación de releases en GHCR (`ghcr.io/autorix-cl/*`).

## Próximas Líneas de Ingeniería

- Ensayos de propagación multi-instancia en rotación de claves RS256 e integraciones de custodia HSM/KMS para Janus en alta disponibilidad.
- Ampliación de separación de audiencias de recurso RFC 8707 entre flujos de navegador y máquina a máquina.
- Instrumentación nativa OpenTelemetry en los SDKs cliente y ampliación de recursos declarativos en Terraform (namespaces Nexus, reglas Aegis y API keys Vulcan).

## Siguiente Paso

Consulta [Comunidad, Seguridad y Versiones](/autorix/reference/community) para política de divulgación de vulnerabilidades e historial de releases.
