---
title: Suite IAM Zero-Trust Autorix
navTitle: Introducción y Visión General
description: Suite modular y autogestionada de Identidad y Control de Acceso (IAM) basada en microservicios independientes en Go, ReBAC Google Zanzibar, ABAC CEL, OAuth2/OIDC, proxy PEP Zero-Trust, Macaroons y auditoría criptográfica.
section: overview
order: 1
badge: v0.2.8
---

**Autorix** es una suite autogestionada de alto rendimiento para **Gestión de Identidad y Control de Acceso (IAM) Zero-Trust**, diseñada como microservicios independientes en Go junto con una consola administrativa empresarial en Next.js 15. Inspirada en el ecosistema Ory y Google Zanzibar, ofrece autorización granular basada en relaciones (ReBAC), evaluación de políticas por atributos (ABAC con Google CEL), ciclo de vida de identidades con Argon2id y WebAuthn/Passkeys, OAuth 2.0 / OIDC, proxy perimetral Zero-Trust (PEP), API keys Macaroon atenuables sin conexión, federación SAML 2.0 / SCIM 2.0 y una cadena de auditoría criptográfica SHA-256 a prueba de manipulación.

## Arquitectura del Ecosistema

Cada microservicio en Go administra su propia base de datos PostgreSQL aislada (`autorix_<servicio>`). No existe base de datos compartida ni ORM entre servicios: toda la comunicación interna ocurre a través de contratos REST y gRPC autenticados, con **Aegis** aplicando políticas Zero-Trust en el borde de la red.

```text
                                         [ TRÁFICO EXTERNO ]
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │    Autorix Aegis    │  (Proxy Inverso PEP Zero-Trust :4455)
                                        └──────────┬──────────┘
                                                   │
        ┌──────────────────────┬───────────────────┼───────────────────┬──────────────────────┐
        ▼                      ▼                   ▼                   ▼                      ▼
 ┌──────────────┐       ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       ┌──────────────┐
 │Autorix Janus │       │Autorix Nexus │    │ Autorix Ego  │    │Autorix Vulcan│       │Autorix Hermes│
 │(OAuth2/OIDC) │       │(ReBAC/Zanzibar)   │(Identidad/MFA│    │ (API Keys)   │       │ (SAML/SCIM)  │
 │    :4444     │       │:50051 / :8080│    │    :4433     │    │    :4466     │       │    :4477     │
 └──────────────┘       └──────────────┘    └──────────────┘    └──────────────┘       └──────────────┘
        │                      │                   │                   │                      │
        └──────────────────────┼───────────────────┼───────────────────┼──────────────────────┘
                               │                   │                   │
                               ▼                   ▼                   ▼
                        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                        │Autorix Themis│    │Autorix Argus │    │Autorix Console
                        │ (ABAC / CEL) │    │(Plano Control│    │(Next.js 15 UI│
                        │:50052 / :4488│    │:50053 / :4400│    │    :3000     │
                        └──────────────┘    └──────────────┘    └──────────────┘
```

## Componentes Principales

| Componente | Función | Puertos | Protocolos | Guía |
| :--- | :--- | :--- | :--- | :--- |
| **Nexus** | Autorización ReBAC granular (Google Zanzibar + APL + caveats CEL) | `8080` / `50051` | REST / gRPC | [Guía de Nexus](/autorix/engines/nexus) |
| **Themis** | Motor de políticas ABAC con Google CEL y anillos de prioridad | `4488` / `50052` | REST / gRPC | [Guía de Themis](/autorix/engines/themis) |
| **Ego** | Identidades, traits JSON Schema, Argon2id, TOTP MFA y WebAuthn | `4433` | REST | [Guía de Ego](/autorix/engines/ego) |
| **Janus** | Servidor OAuth 2.0 y OIDC con PKCE S256 y rotación JWKS RS256 | `4444` / `4445` (admin) | REST / OIDC | [Guía de Janus](/autorix/engines/janus) |
| **Aegis** | Proxy inverso Policy Enforcement Point (PEP) Zero-Trust | `4455` / `4456` (admin) | HTTP / REST | [Guía de Aegis](/autorix/engines/aegis) |
| **Vulcan** | API keys con prefijo (`av_live_`/`av_test_`) y Macaroons HMAC-SHA256 | `4466` | REST | [Guía de Vulcan](/autorix/engines/vulcan) |
| **Hermes** | Federación SAML 2.0 Web SSO y sincronización de directorios SCIM 2.0 | `4477` | REST / XML | [Guía de Hermes](/autorix/engines/hermes) |
| **Argus** | Plano de control de flota, tokens de enrolamiento y auditoría SHA-256 | `4400` / `50053` | REST / gRPC | [Guía de Argus](/autorix/control-plane/argus) |
| **Console** | Panel administrativo Next.js 15, BFF seguro y 9 Studios dedicados | `3000` | HTTP | [Guía de Console](/autorix/control-plane/console) |

## Garantías de Seguridad

- **Cero Privilegios Permanentes**: Toda solicitud entrante se autentica y autoriza en el perímetro (**Aegis**) y se valida en los motores de decisión (**Nexus** / **Themis**).
- **Autenticación Interna en Todo el Clúster**: El tráfico interno REST y gRPC soporta certificados cliente mTLS SPIFFE y verificación en tiempo constante mediante tokens compartidos (`X-Autorix-Internal-Token` / `X-Autorix-Console-Token`).
- **Propagación de Identidad Firmada**: Aegis firma las cabeceras de identidad reenviadas con HMAC-SHA256 canónico `v1` (`X-Autorix-Identity-Signature`), verificado en tiempo constante por los SDKs oficiales.
- **Cadena de Auditoría a Prueba de Manipulación**: Las operaciones mutables se enlazan en una cadena Merkle SHA-256 inmutable dentro de **Argus**, verificable matemáticamente con `GET /v1/audit/verify`.
- **Criptografía Endurecida en Memoria y Passkeys**: **Ego** protege contraseñas con Argon2id (64 MB de memoria), MFA TOTP RFC 6238 y llaves de acceso FIDO2 WebAuthn / Passkeys.
- **Atenuación Descentralizada**: Las API keys de **Vulcan** usan Macaroons HMAC-SHA256 que los servicios pueden restringir sin conexión y sin consultas a la base de datos.

## Inicio Rápido (Desarrollo Local)

Inicia el clúster base localmente con Docker Compose v2:

```bash
git clone https://github.com/Autorix-cl/autorix.git
cd autorix
./scripts/generate-local-secrets.sh
docker compose --profile core up -d --build
```

Obtén el token único de bootstrap de Argus y abre la Consola en `http://localhost:3000`:

```bash
docker logs autorix-argus | grep -i "bootstrap token"
```

> **Solo para desarrollo local**: Docker Compose emplea puertos locales, credenciales de desarrollo, tráfico HTTP interno y PostgreSQL con `sslmode=disable`. Nunca lo expongas directamente a Internet.

## Siguientes Pasos

- Sigue la guía completa de [Inicio con Docker Compose](/autorix/getting-started) (incluyendo perfiles `extended` y `alerts`).
- Revisa la [Arquitectura Maestra y Pipeline](/autorix/architecture) y la [Configuración de Seguridad](/autorix/security-configuration).
- Integra tus servicios mediante los [SDKs Oficiales (Go, TypeScript/React, Python)](/autorix/sdks/overview) o [`autorixctl` y el Provider de Terraform](/autorix/sdks/cli-and-apis).
- Planifica tu despliegue productivo con la [Guía de Kubernetes y Helm](/autorix/operations/kubernetes) y el [Runbook Operativo](/autorix/operations/runbook).
