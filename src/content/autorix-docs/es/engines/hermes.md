---
title: Autorix Hermes — Federación SAML 2.0 y SCIM 2.0
navTitle: Hermes (SAML y SCIM)
description: Puente empresarial de federación que conecta Okta, Microsoft Entra ID, Google Workspace y PingIdentity con Autorix mediante SAML 2.0 Web SSO y sincronización de directorios SCIM 2.0.
section: engines
order: 7
ports: "4477"
protocol: "REST / XML"
---

**Autorix Hermes** integra Proveedores de Identidad corporativos (**Okta**, **Microsoft Entra ID / Azure AD**, **Google Workspace**, **PingIdentity**) con la suite Autorix mediante **SAML 2.0 Web SSO** y aprovisionamiento automático de directorios **SCIM 2.0** (RFC 7643 / RFC 7644).

## Ruta Rápida: Conectar un IdP Empresarial

1. Asegúrate de tener Hermes ejecutándose en el puerto `4477` (`--profile extended` en Compose local).
2. Descarga los metadatos XML de Proveedor de Servicios (SP) de Hermes:
   ```bash
   curl -fsS http://localhost:4477/saml/metadata -o hermes-sp-metadata.xml
   ```
3. Crea una aplicación SAML 2.0 en tu IdP (Okta, Entra ID, etc.) importando el Entity ID y la URL ACS desde el XML.
4. Registra la URL SSO del IdP, su certificado X.509 de firma y el mapeo de atributos mediante `POST /admin/saml/providers`.
5. Inicia un flujo SSO federado mediante `GET /saml/login?provider={id}`.

## Arquitectura y Flujo de Sincronización

Hermes opera como Service Provider (SP) SAML 2.0 —generando mensajes `AuthnRequest` XML firmados y validando aserciones `SAMLResponse` en su endpoint ACS— al tiempo que recibe eventos de directorio SCIM 2.0:

- **Aprovisionamiento de usuarios**: Las operaciones SCIM `/Users` crean, actualizan o desactivan identidades y traits en **Autorix Ego**.
- **Autorización por grupos**: Las membresías SCIM `/Groups` se sincronizan directamente como tuplas de relación en **Autorix Nexus** (`group:<nombre>#member@user:<id>`).

## Referencia de API (`:4477`)

### Inicio de Sesión Único SAML 2.0

| Operación | Endpoint | Descripción |
| :--- | :--- | :--- |
| Metadatos SP | `GET /saml/metadata` | Descriptor XML del Service Provider para importar en el IdP |
| Iniciar SSO | `GET /saml/login?provider={id}` | Construye `AuthnRequest` y redirige al IdP externo |
| Callback ACS | `POST /saml/acs` | Valida la aserción firmada `SAMLResponse` y crea la sesión |

### Administración de Proveedores (Interno)

- `POST /admin/saml/providers` — Registra un IdP SAML 2.0 con certificado y mapeo de atributos
- `GET /admin/saml/providers`, `PATCH /admin/saml/providers/{id}`, `DELETE /admin/saml/providers/{id}` — Lista, edita, habilita/deshabilita o elimina proveedores

### Sincronización de Directorios SCIM 2.0

- `GET /scim/v2/ServiceProviderConfig` — Descubrimiento de capacidades SCIM
- `GET / POST / PUT / PATCH / DELETE /scim/v2/Users` — Altas, cambios y bajas automáticas de usuarios
- `GET / POST / PUT / PATCH / DELETE /scim/v2/Groups` — Sincronización de membresías de grupos
- `GET /admin/scim/sync-history` — Consulta el historial de webhooks y resultados de sincronización

## Lista de Verificación

- [ ] Exportar metadatos SP desde `GET /saml/metadata` y registrar la URL ACS en el IdP.
- [ ] Cargar el certificado X.509 del IdP y mapear atributos `email`, `name` y `groups`.
- [ ] Activar aprovisionamiento SCIM 2.0 con token Bearer para revocación inmediata de bajas.
- [ ] Monitorear eventos en **Enterprise Studio** (`/enterprise`) dentro de Console.

## Siguiente Paso

Gobierna toda la flota de motores y la cadena criptográfica de auditoría con [Autorix Argus](/autorix/control-plane/argus).
