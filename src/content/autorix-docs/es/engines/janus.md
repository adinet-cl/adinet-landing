---
title: Autorix Janus — OAuth 2.0 y OpenID Connect
navTitle: Janus (OAuth2 y OIDC)
description: Proveedor empresarial OAuth 2.0 y OpenID Connect con PKCE S256, rotación de claves JWKS RS256, revocación por familia de refresh tokens y separación estricta entre listeners público y administrativo.
section: engines
order: 4
ports: "4444 / 4445 (admin)"
protocol: "REST / OIDC"
---

**Autorix Janus** es un proveedor OAuth 2.0 y OpenID Connect (OIDC) inspirado en Ory Hydra. Cumple con RFC 6749 (OAuth 2.0), RFC 7636 (PKCE), RFC 7517/7518 (JWKS), RFC 7662 (Introspección), RFC 7009 (Revocación), RFC 8707 (Resource Indicators) y OpenID Connect Core 1.0.

## Ruta Rápida: Token Máquina a Máquina

Solicita un access token firmado con RS256 mediante el flujo `client_credentials` en el puerto público (`:4444`):

```bash
curl -X POST http://localhost:4444/oauth2/token \
  -u "client_backend_billing:SecretKey#2026" \
  -d "grant_type=client_credentials&scope=billing:read billing:write"
```

## Arquitectura y Gestión Criptográfica de Claves

```text
       [ Aplicación Cliente / SPA / Servicio M2M ]
                           │
                           ▼ (OAuth 2.0 / OIDC Público :4444)
       ┌────────────────────────────────────────────────────────┐
       │                     Autorix Janus                      │
       │  ┌─────────────────────┐  ┌─────────────────────────┐  │
       │  │ Descubrimiento OIDC │  │ Gestor de Claves RS256  │  │
       │  │ (/.well-known)      │  │ (Bóveda JWKS en PG)     │  │
       │  └──────────┬──────────┘  └────────────┬────────────┘  │
       │             │                          │               │
       │  ┌──────────▼──────────┐  ┌────────────▼────────────┐  │
       │  │ Motor OAuth2        │──┼──│ Firmador de Tokens   │  │
       │  │ (AuthCode/PKCE/M2M) │  │  │ (Claims JWT y Scopes)│  │
       │  └──────────┬──────────┘  └────────────┬────────────┘  │
       └─────────────┼──────────────────────────┼───────────────┘
                     │                          │
                     ▼                          ▼
               [ Base de Datos PostgreSQL: autorix_janus ]
```

- **Claves RS256 Persistidas**: Los pares asimétricos RSA de 2048 bits se persisten en PostgreSQL y su inicialización se serializa con un bloqueo consultivo transaccional.
- **Rotación Sin Interrupción**: `POST /admin/keys/rotate` activa una nueva clave de firma manteniendo las claves públicas anteriores en `GET /.well-known/jwks.json` hasta que expiren los tokens vigentes.
- **Rotación de Secretos de Cliente**: `POST /admin/clients/{id}/rotate-secret` permite solapamiento controlado durante despliegues continuos.
- **Separación de Tipos de Token**: Los access tokens incluyen `token_use: access_token`; los ID tokens llevan `token_use: id_token` (solo cuando se concede `openid`). Aegis exige este marcador para impedir que un ID token se reutilice contra APIs.

## Flujo Desacoplado de Login y Consentimiento

Janus delega las pantallas de autenticación y consentimiento a tu propia interfaz:

1. El cliente redirige al usuario a `GET /oauth2/auth` (con `redirect_uri` exactamente registrado y desafío **PKCE S256**). Janus crea un `login_challenge` y redirige a tu interfaz de Login.
2. Tu backend autenticado acepta el inicio de sesión mediante `PUT /admin/oauth2/auth/requests/login/accept` (en el puerto privado `:4445`).
3. Tu backend confirma los alcances solicitados en `PUT /admin/oauth2/auth/requests/consent/accept`.
4. Janus emite el código de autorización para su intercambio en `POST /oauth2/token`.

> Nunca aceptes un `subject` enviado directamente desde el navegador para completar desafíos de login o consentimiento; hazlo siempre desde un backend confiable.

## Rotación de Refresh Tokens y Detección de Reutilización

Janus emite un refresh token tras un intercambio `authorization_code` solo si el cliente declara `refresh_token` en `grant_types` **y** se aprobó el alcance `offline_access`.

- El token es un valor opaco seguro de 256 bits; Janus almacena únicamente su hash SHA-256.
- Cada renovación rota el token manteniendo cliente, sujeto, scopes y recurso RFC 8707 sin permitir escalada de permisos.
- **Revocación Automática de Familia**: Reutilizar un token predecesor revoca toda la familia de tokens y responde `invalid_grant`.
- La vigencia se configura mediante `REFRESH_TOKEN_TTL` (por defecto `720h`, 30 días).

## Separación de Listeners: Público (`:4444`) vs Admin Privado (`:4445`)

### Listener Público (`:4444`)

- `GET /.well-known/openid-configuration` — Metadatos OIDC Discovery
- `GET /.well-known/jwks.json` — Claves públicas de verificación RS256
- `GET /oauth2/auth` — Endpoint de autorización (PKCE S256 obligatorio)
- `POST /oauth2/token` — Emisión de tokens y rotación de refresh tokens
- `POST /oauth2/introspect` — Introspección RFC 7662 (exige cliente confidencial propietario del token)
- `POST /oauth2/revoke` — Revocación RFC 7009 (exige cliente confidencial propietario del token)

### Listener Administrativo Privado (`:4445`)

Se enlaza a `127.0.0.1` por defecto fuera de contenedores y **nunca** debe exponerse en un Ingress público:

- **Clientes**: `POST /admin/clients`, `GET /admin/clients`, `GET /admin/clients/{id}`, `PATCH /admin/clients/{id}`, `DELETE /admin/clients/{id}`
- **Scopes y Grants**: `POST / GET / DELETE /admin/scopes`, `GET /admin/grants`
- **Claves**: `POST /admin/keys/rotate`
- **CORS**: Las peticiones cross-origin desde navegadores se deniegan por defecto salvo orígenes declarados en `CORS_ALLOWED_ORIGINS`.

## Lista de Verificación

- [ ] Aprovisionar `autorix_janus` y confirmar las claves RS256 activas en `/.well-known/jwks.json`.
- [ ] Comprobar que el puerto público `:4444` devuelve `404` ante `/admin/*`.
- [ ] Registrar clientes con `redirect_uris`, `grant_types` y `scopes` exactos (o declararlos con [Terraform](/autorix/sdks/cli-and-apis#provider-de-terraform)).
- [ ] Configurar `CORS_ALLOWED_ORIGINS` con orígenes explícitos (nunca `*`).

## Siguiente Paso

Valida y aplica los JWT de Janus en el borde de tu API con [Autorix Aegis](/autorix/engines/aegis).
