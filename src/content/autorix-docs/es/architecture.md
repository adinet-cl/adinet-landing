---
title: Arquitectura Maestra y Mapa de Integración
navTitle: Arquitectura Maestra
description: Conoce cómo se comunican los 9 servicios de Autorix en el pipeline perimetral Zero-Trust, la matriz de puertos, la arquitectura hexagonal en Go y los estándares de prefijos de credenciales.
section: overview
order: 3
---

Esta guía funciona como mapa maestro para integrar el ecosistema Zero-Trust de Autorix, trazando cada solicitud desde el borde de la red hasta los servicios upstream y la cadena de auditoría criptográfica.

## Pipeline de Solicitudes de Extremo a Extremo

Cuando un cliente invoca una API protegida, la solicitud recorre un flujo desacoplado y verificable:

1. **Solicitud del Cliente**: El cliente envía tráfico a `https://api.enterprise.corp/resource`, recibido por **Aegis PEP** en el puerto `4455`.
2. **Autenticación**: **Aegis** valida las credenciales mediante **Janus** (access tokens JWT RS256), **Vulcan** (API keys Macaroon HMAC-SHA256) o **Ego** (sesiones). Toda credencial inválida se rechaza con `401 Unauthorized`.
3. **Autorización**: **Aegis** consulta permisos en milisegundos contra **Nexus** (grafo ReBAC Zanzibar) y/o **Themis** (políticas contextuales ABAC CEL). Las solicitudes denegadas reciben `403 Forbidden`.
4. **Mutación y Firma de Cabeceras**: **Aegis** elimina cabeceras no confiables del cliente, inyecta identidad verificada (`X-User-ID`, `X-User-Email`, `X-User-Roles`), adjunta la firma canónica `v1` HMAC-SHA256 `X-Autorix-Identity-Signature` y reenvía el tráfico al backend.
5. **Registro de Auditoría**: Las acciones mutables se registran en **Argus**, encadenadas mediante SHA-256 para garantizar integridad forense.

## Matriz de Servicios y Puertos

| Servicio | Puertos | Base de Datos Aislada | Responsabilidad Principal | Guía |
| :--- | :--- | :--- | :--- | :--- |
| **Aegis** | `4455` (Proxy), `4456` (Admin) | Sin estado / reglas | PEP de borde, enrutamiento, firma y mutación de cabeceras | [Aegis](/autorix/engines/aegis) |
| **Console** | `3000` (HTTP) | Ninguna (BFF) | Panel Zero-Trust, Studios interactivos y verificador Merkle en vivo | [Console](/autorix/control-plane/console) |
| **Argus** | `4400` (REST), `50053` (gRPC) | `autorix_argus` | Control de flota, tokens de enrolamiento y auditoría SHA-256 | [Argus](/autorix/control-plane/argus) |
| **Nexus** | `8080` (REST), `50051` (gRPC) | `autorix_nexus` | Recorrido de grafos ReBAC Zanzibar y caveats CEL | [Nexus](/autorix/engines/nexus) |
| **Themis** | `4488` (REST), `50052` (gRPC) | `autorix_themis` | Políticas ABAC con Google CEL en anillos de prioridad | [Themis](/autorix/engines/themis) |
| **Ego** | `4433` (REST) | `autorix_ego` | Identidades, traits JSON Schema, Argon2id, TOTP y WebAuthn | [Ego](/autorix/engines/ego) |
| **Janus** | `4444` (Público), `4445` (Admin) | `autorix_janus` | Servidor OAuth 2.0 / OIDC, PKCE S256 y rotación JWKS RS256 | [Janus](/autorix/engines/janus) |
| **Vulcan** | `4466` (REST) | `autorix_vulcan` | API keys con prefijo y Macaroons atenuables sin conexión | [Vulcan](/autorix/engines/vulcan) |
| **Hermes** | `4477` (REST / XML) | `autorix_hermes` | Puente SAML 2.0 Web SSO y sincronización SCIM 2.0 | [Hermes](/autorix/engines/hermes) |

## Patrón Hexagonal de los Microservicios Go

Cada motor Go (`argus`, `aegis`, `ego`, `hermes`, `janus`, `nexus`, `themis`, `vulcan`) implementa una arquitectura hexagonal uniforme y comparte la biblioteca común `platform/`:

```text
<servicio>/
  cmd/<servicio>d/main.go           # Punto de entrada e inyección de dependencias
  internal/core/                    # Lógica de dominio desacoplada de frameworks
  internal/<dominio>/               # Paquetes específicos del dominio (credenciales, cripto)
  internal/storage/postgres/        # Adaptador aislado de persistencia PostgreSQL
  internal/transport/http/          # Manejadores REST y middleware de autenticación interna
  internal/transport/grpc/          # Manejadores gRPC (argus, nexus, themis)
  migrations/                       # Migraciones SQL propias del servicio
  api/autorix/<servicio>/v1/*.proto # Contratos Protobuf / gRPC
```

El módulo compartido `platform/` centraliza logging estructurado, contrato uniforme de salud (`/health/alive`, `/health/ready`, `/info`), métricas Prometheus, IDs de correlación, apagado ordenado, reintentos de conexión PostgreSQL y autenticación interna (`platform/httpx.InternalAuth` y `platform/tls.UnaryInternalAuthInterceptor`).

## Estándar de Prefijos de Credenciales

Todas las credenciales emplean prefijos deterministas para facilitar observabilidad, auditoría y detección automática de secretos filtrados:

| Prefijo | Tipo de Credencial | Propósito |
| :--- | :--- | :--- |
| `abt_` | Token de Bootstrap | Reclamo inicial único del administrador raíz de Argus |
| `aet_` | Token de Enrolamiento | Autoriza nuevas instancias de motores a unirse a la flota |
| `ast_` | Token de Sesión | Sesión de operador o usuario en Argus, Ego y Console |
| `av_live_` | API Key de Producción | Tokens Macaroon de capacidad emitidos por Vulcan para producción |
| `av_test_` | API Key de Pruebas | Tokens Macaroon para entornos staging y pruebas de integración |
| `eyJ...` | Access Token JWT | JWT RS256 emitido por Janus (`token_use: access_token`) |

## Flujo de Sincronización de Identidad Empresarial

Cuando un IdP corporativo (Okta, Microsoft Entra ID o Google Workspace) sincroniza un usuario:

1. El IdP envía un evento SCIM 2.0 hacia **Hermes** (`:4477`).
2. **Hermes** crea o actualiza la identidad y sus traits dinámicos en **Ego** (`:4433`).
3. Las membresías de grupos se traducen directamente en tuplas de relación en **Nexus** (`group:eng#member@user:<id>`).

## Convenciones de API REST

Todas las APIs REST siguen sobres JSON consistentes:

- **Errores**: `{"error": "<codigo>", "error_description": "<detalle>"}`
- **Paginación por cursor**: Solicita `?limit=50&cursor=<token_opaco>`. La respuesta devuelve:

```json
{
  "data": [],
  "next_cursor": "eyJpZCI6IjEyMyJ9",
  "has_more": true
}
```

## Lista de Verificación de Integración

- [ ] Confirmar que los puertos internos REST/gRPC (`50051`, `50052`, `50053`, `8080`, `4445`, `4456`) solo son accesibles dentro de la malla interna.
- [ ] Configurar escáneres de secretos (GitHub Secret Scanning, Gitleaks, TruffleHog) para detectar `abt_`, `aet_`, `ast_` y `av_live_`.
- [ ] Verificar que los backends upstream validen `X-Autorix-Identity-Signature` y confíen en `X-User-ID` solo detrás de Aegis.
- [ ] Configurar Prometheus sobre `/metrics` (habilitación explícita en Console mediante `PROMETHEUS_INTERNAL_URL`).

## Siguiente Paso

Configura los límites de confianza en [Configuración de Seguridad](/autorix/security-configuration) o explora directamente [Autorix Aegis](/autorix/engines/aegis) y [Autorix Nexus](/autorix/engines/nexus).
