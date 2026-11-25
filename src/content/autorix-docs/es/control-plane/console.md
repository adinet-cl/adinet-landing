---
title: Autorix Console — Panel Administrativo y Studios
navTitle: Console (Panel Admin)
description: Consola web empresarial y capa BFF en Next.js 15 con shell de autenticación aislado, RBAC, protección Double-Submit CSRF, 9 Studios dedicados y verificación criptográfica en vivo.
section: control-plane
order: 2
ports: "3000"
protocol: "HTTP (Next.js 15)"
---

**Autorix Console** es la interfaz web empresarial y capa **Backend-for-Frontend (BFF)** para toda la suite Zero-Trust IAM de Autorix. Construida con **Next.js 15 App Router** (`15.5.29+`), centraliza telemetría en tiempo real, 9 espacios de trabajo (*Studios*), verificación Merkle en vivo y orquestación de flota sin exponer credenciales internas al navegador.

## Ruta Rápida: Configuración Inicial del Clúster

1. Abre `http://localhost:3000`. Cuando no existe propietario raíz, Console redirige automáticamente a `/setup`.
2. Ingresa el secreto único `abt_...` generado por Argus en los logs de arranque.
3. Completa Nombre, Correo Corporativo y Contraseña Maestra, y selecciona **Initialize Cluster Owner**.
4. Una vez reclamado, el clúster queda bloqueado y te redirige a `/login`.

## Modelo de Seguridad y Arquitectura BFF

- **Shell de Autenticación Aislado**: Las rutas `/login`, `/setup`, `/session-expired` y `/403` se renderizan en un contenedor de seguridad independiente del layout operativo.
- **Control de Acceso Basado en Roles (RBAC)**: Aplica permisos granulares por ruta y endpoint BFF (`Admin`, `Operator`, `Auditor`, `ReadOnly` — por ejemplo, `oauth2:read`/`oauth2:write` en Janus y `proxy-rules:read`/`proxy-rules:write` en Aegis).
- **Cookies Seguras y Double-Submit CSRF**: Las sesiones residen en cookies `HttpOnly`, `SameSite` (`autorix_session`). Toda mutación BFF exige coincidencia entre la cookie `autorix_csrf` y la cabecera `X-CSRF-Token`.
- **Autenticación Interna de Servicios**: Las rutas del BFF se autentican contra los motores internos con `X-Autorix-Console-Token` / `X-Autorix-Internal-Token` y jamás filtran `JANUS_ADMIN_INTERNAL_URL` ni secretos en variables `NEXT_PUBLIC_*`.
- **Validación Resiliente de Sesiones (`v0.2.4`–`v0.2.8`)**: Comparte una caché single-flight de 15 s entre bundles App Router vía `globalThis` (con invalidación inmediata global al hacer `POST /api/auth/logout`), reintenta errores transitorios de Argus, devuelve HTTP `503` sin borrar la cookie ante timeouts del backend y drena cuerpos `fetch` no utilizados para liberar sockets Undici.
- **Telemetría Prometheus Opcional (`v0.2.8`)**: Las rutas de observabilidad solo consultan Prometheus cuando `PROMETHEUS_INTERNAL_URL` está configurada explícitamente, evitando resoluciones DNS innecesarias cuando no se despliega Prometheus.

## Los 9 Studios Operativos

| Studio | Ruta | Motor Asociado | Capacidades Principales |
| :--- | :--- | :--- | :--- |
| **Identities Studio** | `/identities` | Ego | Directorio de usuarios, traits JSON Schema, restablecimiento de contraseñas, MFA y Passkeys |
| **API Keys Studio** | `/api-keys` | Vulcan | Emisión de claves (`av_live_`/`av_test_`), atenuación interactiva de caveats Macaroon y revocación |
| **Permissions Studio** | `/permissions` | Nexus | CRUD de tuplas Zanzibar, explorador de grafos y simulador `Check` con trazas |
| **Proxy Rules Studio** | `/proxy-rules` | Aegis | Editor de rutas PEP, pipelines de autenticadores/autorizadores/mutadores y prueba dry-run |
| **Policies Studio** | `/policies` | Themis | Editor Google CEL, anillos de prioridad, historial de versiones y ejecución de fixtures |
| **Enterprise Studio** | `/enterprise` | Hermes | Alta de IdPs SAML 2.0, descarga de metadatos SP y monitoreo de sincronización SCIM 2.0 |
| **Fleet Studio** | `/fleet` | Argus | Salud y latidos en vivo, gráfico de topología y emisión de tokens `aet_` |
| **Audit Trail Studio** | `/audit` | Argus | Búsqueda de eventos, diferencias JSON, verificación criptográfica SHA-256 y exportación CSV |
| **Compliance Studio** | `/compliance` | Argus | Tableros de evidencia candidata mapeados a SOC 2 (CC6.1/CC6.2) e ISO 27001 |

## Verificación Criptográfica Merkle en Vivo

Desde **Audit Trail Studio** (`/audit`), el botón de verificación ejecuta en vivo `GET /v1/audit/verify` contra Argus, recalculando el enlace SHA-256 de todos los registros en PostgreSQL para confirmar ausencia de alteraciones antes de exportar el archivo CSV para auditorías externas.

## Siguiente Paso

Integra Autorix en tus aplicaciones backend y frontend mediante los [SDKs Oficiales](/autorix/sdks/overview).
