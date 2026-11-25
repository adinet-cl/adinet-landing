---
title: Configuración de Seguridad y Endurecimiento
navTitle: Configuración de Seguridad
description: Controles base de seguridad para confianza JWT, listeners administrativos privados, autenticación interna del clúster, firma de cabeceras de identidad y gestión de secretos.
section: overview
order: 4
---

Parte de estos controles antes de integrar cualquier carga de trabajo en producción. Constituyen una línea base de ingeniería y no sustituyen una certificación normativa ni un modelo de amenazas específico de tu entorno.

## 1. Confianza JWT en Aegis

Configura **exactamente una** fuente confiable de claves en Aegis: `JWT_JWKS_URL` **o** `JWT_PUBLIC_KEY_FILE`. Define `JWT_ISSUER` y `JWT_AUDIENCE` con los valores exactos aceptados por tu API.

- En producción, el endpoint JWKS **debe** utilizar HTTPS. `JWT_ALLOW_INSECURE_JWKS=true` es únicamente para Docker Compose local.
- Aegis acepta **únicamente access tokens** (`token_use: access_token`). No es posible reproducir ID tokens contra APIs protegidas.
- El emisor, la audiencia y la URL de JWKS permanecen siempre bajo control del operador: ninguna petición ni regla de proxy puede alterar la fuente de confianza.

## 2. Autenticación Interna en Todo el Clúster

Desde `v0.2.0`, los 8 motores Go y el BFF de Console aplican autenticación interna uniforme mediante `platform/httpx.InternalAuth` (REST) y `platform/tls.UnaryInternalAuthInterceptor` (gRPC):

- **Identidad mTLS SPIFFE**: Valida certificados cliente X.509 con SAN URI SPIFFE confiables para tráfico entre servicios.
- **Verificación en tiempo constante de tokens compartidos**: Soporta `X-Autorix-Internal-Token` (servicio a servicio) y `X-Autorix-Console-Token` (Console BFF hacia motores internos).

## 3. Cabeceras de Identidad Firmadas Canónicamente

Cuando Aegis reenvía una solicitud autenticada al servicio upstream, elimina cabeceras enviadas por el cliente e inyecta identidad confiable firmada con **HMAC-SHA256** canónico `v1`:

- Cabeceras de identidad reenviadas: `X-User-ID`, `X-User-Email`, `X-User-Roles`
- Prueba criptográfica: `X-Autorix-Identity-Signature`

Los middlewares oficiales en Go, TypeScript y Python (FastAPI/Flask) verifican `X-Autorix-Identity-Signature` en tiempo constante antes de aceptar la identidad propagada. Nunca confíes en cabeceras `X-User-*` provenientes de redes no confiables.

## 4. Administración Privada y BFF de Console

- Mantén el tráfico público OAuth2/OIDC de **Janus** en `:4444` y dirige `/admin/*` únicamente al listener privado (`:4445`, enlazado a `127.0.0.1` por defecto fuera de contenedores).
- Mantén privada la administración de **Aegis** (`:4456`). Nunca publiques `:4456` en un Ingress ni habilites CORS abierto (`*`).
- El BFF de servidor de Console usa direcciones internas. **Nunca** expongas `JANUS_ADMIN_INTERNAL_URL`, tokens internos ni API keys en variables `NEXT_PUBLIC_*`.
- Registra URIs de redirección, `grant_types`, `scopes` y audiencias exactas por cada cliente OAuth y exige **PKCE S256** en flujos `authorization_code`.
- Console protege las sesiones con cookies `HttpOnly` y `SameSite` (`autorix_session`) junto con protección Double-Submit CSRF (`autorix_csrf` + cabecera `X-CSRF-Token`) en todas las rutas mutables.

## 5. Secretos, Cadena de Suministro y TLS en Base de Datos

- Obtén todas las cadenas de conexión de base de datos, claves de firma, secretos internos y tokens de bootstrap desde un gestor de secretos (Vault, AWS Secrets Manager, External Secrets Operator) o identidad de workload.
- Fija las imágenes productivas de `ghcr.io/autorix-cl/*` por su **digest OCI SHA-256** verificado; el chart Helm productivo rechaza etiquetas mutables.
- Exige TLS (`sslmode=verify-full`) en todas las conexiones hacia PostgreSQL en producción.
- Ensaya periódicamente la rotación de claves y los procedimientos de rollback.

## Siguiente Paso

Consulta [Transición a Producción y Migración de Seguridad](/autorix/operations/production-transition) para ver la matriz completa de variables de entorno, NetworkPolicies y comandos de verificación.
