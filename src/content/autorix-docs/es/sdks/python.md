---
title: Referencia del SDK de Python
navTitle: SDK de Python
description: Cliente tipado para Python 3.9+ (autorix) con cobertura pública para Nexus, Themis, Vulcan, Ego y Janus, además de adaptadores para FastAPI, Flask y Django.
section: sdks
order: 4
---

Paquete: `autorix` · Python 3.9+

El SDK de Python cubre las APIs públicas de **Ego**, **Janus**, **Nexus**, **Themis** y **Vulcan**, devolviendo resultados tipados, páginas `Page` por cursor, excepciones `AutorixError` / `AutorixHTTPError` y adaptadores listos para **FastAPI**, **Flask** y **Django**.

## Instalación

```bash
pip install autorix

# Extras opcionales por framework web
pip install 'autorix[fastapi]' 'autorix[flask]' 'autorix[django]'
```

## Inicio Rápido

```python
from autorix import AutorixClient

with AutorixClient(nexus_url="http://localhost:8080") as client:
    decision = client.check("documents", "document-42", "viewer", "user-7")
    if not decision.allowed:
        raise PermissionError(decision.reason)
```

## Cobertura Pública

- **Nexus**: `check`, comprobaciones por lote, lectura/escritura/borrado de tuplas, `expand` y búsquedas inversas de sujetos y recursos.
- **Themis**: evaluación de políticas, CRUD, validación CEL, dry-run, versiones, fixtures y suites automatizadas de prueba.
- **Vulcan**: creación/listado/revocación de claves, más verificación y atenuación de Macaroons (formatos no soportados se deniegan localmente).
- **Ego**: registro de usuarios, inicio de sesión, `whoami` y cierre de sesión.
- **Janus**: discovery OIDC, JWKS, generación de URLs con PKCE S256, intercambio de código, rotación de refresh tokens, `client_credentials`, introspección y revocación.

Los listados devuelven objetos `Page` con `data`, `next_cursor` y `has_more`. Los endpoints administrativos y Argus, Aegis y Hermes quedan fuera del alcance del cliente público.

## Adaptadores Web (FastAPI, Flask y Django)

- **FastAPI**: `AutorixSecurity` ofrece dependencias de ruta para validar cabeceras de identidad y verificar permisos en Nexus.
- **Flask y Django**: `autorix.flask.require_permission` y `autorix.django.require_permission` proporcionan decoradores declarativos de rutas.

Todos los adaptadores admiten verificación en tiempo constante de la firma canónica `v1` HMAC-SHA256 `X-Autorix-Identity-Signature` generada por Aegis. Despliégalos únicamente detrás de un proxy confiable que elimine cabeceras `X-User-*` del cliente.

## Seguridad OAuth y Confiabilidad

- `authorization_url` requiere `state` y `code_challenge` PKCE generados por tu aplicación; el SDK nunca almacena tokens ni verificadores.
- `exchange_code` y `refresh_token` nunca se reintentan automáticamente para proteger códigos y familias de tokens de un solo uso.
- Solo se reintentan operaciones de lectura idempotentes; ante fallos de transporte o servicio, los checks fallan de forma cerrada (`allowed=False`).

## Siguiente Paso

Automatiza operaciones con [`autorixctl`, el Provider de Terraform y APIs Directas](/autorix/sdks/cli-and-apis).
