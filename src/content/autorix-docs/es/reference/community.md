---
title: Comunidad, Política de Seguridad y Versiones
navTitle: Comunidad y Versiones
description: Licencia Apache 2.0, política de divulgación responsable de vulnerabilidades, historial de versiones Semantic Versioning (v0.1.0 a v0.2.8), soporte y guía de contribución.
section: reference
order: 3
---

Autorix es un proyecto IAM Zero-Trust autogestionado con licencia **Apache-2.0**, mantenido en GitHub en **[Autorix-cl/autorix](https://github.com/Autorix-cl/autorix)**. Se ofrece con soporte comunitario *best-effort* y no constituye un servicio administrado con SLA.

## Canales de Ayuda y Participación

| Canal | Uso |
| :--- | :--- |
| [GitHub Discussions](https://github.com/Autorix-cl/autorix/discussions) | Preguntas de arquitectura, configuración e integración |
| [GitHub Issues](https://github.com/Autorix-cl/autorix/issues/new/choose) | Reporte de defectos reproducibles y propuestas de mejora |
| [Aviso Privado de Seguridad](https://github.com/Autorix-cl/autorix/security/advisories/new) | Divulgación confidencial de vulnerabilidades (nunca en issues públicos) |

## Política de Divulgación de Vulnerabilidades

**No** publiques sospechas de vulnerabilidades en issues públicos, discusiones, logs o pull requests. Envía un reporte privado mediante GitHub Security Advisories incluyendo:

- Etiqueta de versión afectada, commit SHA, modo de despliegue y componente
- Impacto, prerrequisitos y prueba de concepto reproducible mínima
- Mitigación sugerida (si aplica) y un medio seguro de contacto

## Historial Reciente de Versiones

Autorix sigue [Semantic Versioning 2.0.0](https://semver.org/) con etiquetas Git firmadas e imágenes OCI etiquetadas en `ghcr.io/autorix-cl/*`.

| Versión | Fecha | Cambios Destacados |
| :--- | :--- | :--- |
| **`v0.2.8`** | 2026-11-25 | Telemetría Prometheus opt-in vía `PROMETHEUS_INTERNAL_URL`, drenado limpio de cuerpos `fetch` en Undici, `UV_THREADPOOL_SIZE=16`, etiquetas OCI y tag `latest` |
| **`v0.2.6`–`v0.2.7`** | 2026-11-25 | Caché single-flight de sesión compartida en `globalThis` para Console (TTL 15 s, invalidación inmediata en logout), `IdleTimeout: 60s` en Argus y publicación endurecida en CI |
| **`v0.2.3`–`v0.2.5`** | 2026-11-24 | `golang:1.26-alpine` y `alpine:3.24` (0 CVEs críticos), siembra automática de entornos en Argus, throttling de `TouchSession`, `max_connections=300` en PostgreSQL y etiquetas GHCR en minúsculas |
| **`v0.2.0`–`v0.2.2`** | 2026-11-24 | Remediación de CVEs en Next.js `15.5.29`, autenticación interna del clúster (mTLS SPIFFE + `X-Autorix-Internal-Token`), firma HMAC-SHA256 `X-Autorix-Identity-Signature` en Aegis, WebAuthn/Passkeys reales en Ego y `terraform-provider-autorix` funcional |
| **`v0.1.0`** | 2026-11-24 | Línea base pública OSS: gobernanza Apache-2.0, endurecimiento de los 8 motores Go, Studios de Console, SDKs y chart de Helm |

## Cómo Contribuir

Antes de abrir un pull request, consulta `CONTRIBUTING.md` y `CODE_OF_CONDUCT.md` en el repositorio:

- Utiliza **Conventional Commits** (`feat(...)`, `fix(...)`, `docs(...)`, `refactor(...)`, `test(...)`).
- La documentación pública del producto se mantiene en inglés y español técnico neutro.
- Ejecuta pruebas unitarias y linters en los módulos Go modificados y en `console/` antes de enviar tus cambios.
