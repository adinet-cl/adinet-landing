---
title: Autorix Ego — Identidad, Traits, MFA y Passkeys
navTitle: Ego (Identidad y WebAuthn)
description: Motor empresarial de ciclo de vida de identidades con traits dinámicos JSON Schema Draft 7, hashing Argon2id, MFA TOTP RFC 6238, WebAuthn/Passkeys reales y flujos de máquina de estados.
section: engines
order: 3
ports: "4433"
protocol: "REST"
---

**Autorix Ego** gestiona el ciclo de vida de identidades, credenciales, autenticación multifactor y sesiones activas. Inspirado en Ory Kratos, combina traits dinámicos validados por JSON Schema con hashing **Argon2id**, **MFA TOTP RFC 6238**, códigos de recuperación y ceremonias completas **FIDO2 WebAuthn / Passkeys**.

## Ruta Rápida: Registro, Login y Sesión

Ego escucha en el puerto HTTP `4433`:

1. Inicia un flujo de registro para navegador (o invoca directamente `POST /self-service/registration`):

```bash
curl -X GET http://localhost:4433/self-service/registration/browser
```

2. Registra una identidad con traits dinámicos y contraseña:

```bash
curl -X POST "http://localhost:4433/self-service/registration?flow=<flow_id>" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "password",
    "csrf_token": "<csrf_token>",
    "traits": {
      "email": "alice@enterprise.corp",
      "name": "Alice Smith",
      "department": "Engineering"
    },
    "password": "SuperSecurePassword#2026"
  }'
```

3. Autentica al usuario con `POST /self-service/login`, consulta la sesión activa en `GET /sessions/whoami` o revócala con `POST /self-service/logout`.

## Traits Dinámicos con JSON Schema

En lugar de imponer columnas rígidas de usuario, Ego valida perfiles contra esquemas **JSON Schema (Draft 7)** registrados en `/admin/schemas`:

- **Campos estándar**: `email`, `name`, `username`
- **Campos empresariales personalizados**: `department`, `employee_id`, `cost_center`, `security_clearance`, `phone_number`

## Seguridad Criptográfica y Passkeys

- **Hashing de Contraseñas Argon2id**: Cumple los parámetros recomendados por OWASP (`m=64 MB`, `t=3`, `p=4`, sal de 16 bytes generada con `crypto/rand`) para neutralizar ataques por fuerza bruta en GPU/ASIC.
- **MFA TOTP (RFC 6238)**: Códigos de 6 dígitos cada 30 segundos junto con códigos de recuperación de un solo uso.
- **WebAuthn / Passkeys (`v0.2.0+`)**: Ceremonias criptográficas reales de registro e inicio de sesión impulsadas por `github.com/go-webauthn/webauthn`:
  - `POST /self-service/webauthn/registration/start` y `/finish`
  - `POST /self-service/webauthn/login/start` y `/finish`
  - Consumo único de desafíos con TTL, persistencia de `sign-count` y rechazo ante advertencias de clonación.

## Referencia de API (`:4433`)

### Endpoints de Autoservicio

| Operación | Endpoint | Descripción |
| :--- | :--- | :--- |
| Inicio de flujo navegador | `GET /self-service/registration/browser` | Genera `flow_id`, token anti-CSRF y nodos dinámicos de UI |
| Registro de identidad | `POST /self-service/registration` | Crea la identidad y emite sesión activa (`ast_...`) |
| Login con contraseña | `POST /self-service/login` | Autentica por identificador y contraseña |
| Ceremonias WebAuthn | `POST /self-service/webauthn/{registration,login}/{start,finish}` | Registro y acceso con Passkeys o llaves de seguridad hardware |
| Validar sesión | `GET /sessions/whoami` | Resuelve la identidad desde la cookie `autorix_session_token` o cabecera Bearer |
| Cerrar sesión | `POST /self-service/logout` | Revoca el token de sesión activo |

### Endpoints Administrativos (Solo Uso Interno)

- **Identidades**: `GET /admin/identities`, `PATCH /admin/identities/{id}`, `DELETE /admin/identities/{id}`
- **Recuperación de Contraseña**: `POST /admin/identities/{id}/credentials/reset-password`, `POST /admin/identities/{id}/recovery-link`
- **Sesiones y MFA**: `GET /admin/sessions`, `DELETE /admin/sessions/{id}`, `DELETE /admin/identities/{id}/mfa`
- **Esquemas**: `GET /admin/schemas`, `POST /admin/schemas`

## Lista de Verificación

- [ ] Registrar definiciones JSON Schema corporativas (por ejemplo, `corp_employee_v1`).
- [ ] Verificar conectividad con `autorix_ego` mediante `GET /health/ready`.
- [ ] Probar flujos de contraseña, TOTP, códigos de recuperación y Passkeys WebAuthn.
- [ ] Restringir los endpoints `/admin/*` tras autenticación interna y políticas de red.

## Siguiente Paso

Emite tokens OAuth 2.0 / OIDC para tus aplicaciones con [Autorix Janus](/autorix/engines/janus) o sincroniza directorios empresariales con [Autorix Hermes](/autorix/engines/hermes).
