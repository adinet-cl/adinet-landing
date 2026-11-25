---
title: Visión General de SDKs Oficiales
navTitle: Visión General de SDKs
description: Matriz de capacidades, requisitos de entorno, frontera de seguridad entre navegador y backend, y garantías fail-closed de los SDKs oficiales en Go, TypeScript/React y Python.
section: sdks
order: 1
---

Autorix incluye SDKs HTTP tipados oficiales para **Go**, **TypeScript / React** y **Python** bajo el directorio `sdk/` del repositorio. Están orientados a las operaciones públicas en tiempo de ejecución, aplicando semántica *fail-closed* y verificación en tiempo constante de la cabecera firmada de Aegis (`X-Autorix-Identity-Signature`).

## Matriz de Capacidades

| Capacidad | Go (`sdk/go`) | TypeScript / React (`@autorix/sdk-js`) | Python (`autorix`) |
| :--- | :--- | :--- | :--- |
| **Sesión Ego** | Sesión actual (`WhoAmI`) | Sesión actual y logout | Registro, login, sesión actual y logout |
| **Nexus ReBAC** | Check, batch check, expand y búsqueda de recursos | Checks, lectura/escritura/borrado de tuplas, expand y búsquedas inversas | Igual que TypeScript |
| **Themis ABAC** | Evaluación | Evaluación, CRUD de políticas, versiones, validación y dry-run | Igual, más fixtures y suites de prueba |
| **Claves Vulcan** | Verificación y atenuación | Crear, listar, verificar, atenuar y revocar | Igual que TypeScript |
| **Janus OAuth/OIDC** | Discovery, URL auth, intercambio, introspección, revocación, JWKS | Discovery, URL auth, código, refresh, introspección, revocación, JWKS | Igual, más `client_credentials` |
| **Auditoría Argus** | Verificación de cadena de auditoría | No | No |
| **Middleware de Identidad Firmada** | `net/http` (`X-Autorix-Identity-Signature`) | Verificación en servidor + hooks React | FastAPI, Flask y Django |

> Ningún SDK envuelve aún las ceremonias WebAuthn de Ego directamente (invoca `/self-service/webauthn/*` desde el navegador y tu BFF). Las APIs administrativas de Argus quedan deliberadamente fuera de los SDKs de TypeScript y Python.

## Paquetes y Requisitos

| SDK | Paquete Fuente | Requisito de Entorno | Guía |
| :--- | :--- | :--- | :--- |
| **Go** | `github.com/autorix-cl/autorix/sdk/go` | Go 1.25.6+ | [Referencia SDK Go](/autorix/sdks/go) |
| **TypeScript / React** | `@autorix/sdk-js` | Node.js 18+ o runtime con `fetch` (React opcional) | [SDK TypeScript y React](/autorix/sdks/typescript) |
| **Python** | `autorix` | Python 3.9+ | [Referencia SDK Python](/autorix/sdks/python) |

## Frontera de Seguridad: Navegador vs Backend

- **Mantén los secretos en el servidor**: Nunca incluyas `clientSecret`, una `apiKey` de Vulcan, un token interno ni credenciales de operador en bundles de navegador ni en variables `NEXT_PUBLIC_*`.
- **PKCE y almacenamiento de tokens**: Los SDKs construyen URLs con PKCE S256 e intercambian códigos, pero **no** generan ni persisten el verificador PKCE ni los tokens; tu aplicación es responsable de almacenarlos de forma segura.
- **Los hooks de UI no son seguridad**: `usePermission` y `usePolicy` solo controlan presentación visual. El backend debe revalidar y hacer cumplir cada acción protegida.
- **Verifica cabeceras de proxy**: Despliega los middlewares únicamente detrás de **Aegis** (eliminando copias `X-User-*` enviadas por el cliente) y verifica la firma HMAC-SHA256 canónica `v1` (`X-Autorix-Identity-Signature`).

## Garantías Compartidas de Confiabilidad

- **Autorización fail-closed**: Ante fallos de red, timeouts o respuestas 5xx, las comprobaciones devuelven **denegado** (`allowed = false`), nunca acceso implícito.
- **Reintentos seguros**: Solo se reintentan lecturas idempotentes; los intercambios de código OAuth y refresh tokens de un solo uso **nunca** se reintentan automáticamente.
- **Caché local en proceso**: La caché de decisiones Nexus usa un TTL de 10 segundos por defecto en memoria local (no distribuida entre réplicas).
- **Conformidad cruzada**: Verificada en CI con `sdk/conformance_test.sh`.

## Elige tu SDK

- [Referencia SDK de Go](/autorix/sdks/go)
- [Referencia SDK de TypeScript y React](/autorix/sdks/typescript)
- [Referencia SDK de Python / FastAPI / Flask / Django](/autorix/sdks/python)
- [CLI (`autorixctl`), Provider de Terraform y APIs Directas](/autorix/sdks/cli-and-apis)
