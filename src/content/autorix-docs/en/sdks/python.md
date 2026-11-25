---
title: Python SDK Reference
navTitle: Python SDK
description: Typed Python 3.9+ client (autorix) with public runtime coverage for Nexus, Themis, Vulcan, Ego, and Janus, plus FastAPI, Flask, and Django adapters.
section: sdks
order: 4
---

Package: `autorix` · Python 3.9+

The Python SDK covers public runtime APIs for **Ego**, **Janus**, **Nexus**, **Themis**, and **Vulcan**, returning typed results, cursor `Page` objects, `AutorixError` / `AutorixHTTPError` exceptions, and ready-to-use adapters for **FastAPI**, **Flask**, and **Django**.

## Installation

```bash
pip install autorix

# Optional web framework adapters
pip install 'autorix[fastapi]' 'autorix[flask]' 'autorix[django]'
```

## Quick Start

```python
from autorix import AutorixClient

with AutorixClient(nexus_url="http://localhost:8080") as client:
    decision = client.check("documents", "document-42", "viewer", "user-7")
    if not decision.allowed:
        raise PermissionError(decision.reason)
```

## Public Runtime Coverage

- **Nexus**: `check`, batch checks, tuple read/write/delete, `expand`, and subject/resource lookups.
- **Themis**: policy evaluation, CRUD, CEL validation, dry runs, version history, fixtures, and automated test suites.
- **Vulcan**: key create/list/revoke, plus Macaroon verification and offline attenuation (unsupported token shapes fail closed locally).
- **Ego**: user registration, password login, `whoami`, and logout.
- **Janus**: OIDC discovery, JWKS, PKCE S256 authorization URLs, authorization-code exchange, refresh rotation, client credentials, introspection, and revocation.

List responses return `Page` objects exposing `data`, `next_cursor`, and `has_more`. Administrative endpoints and Argus, Aegis, and Hermes are outside the public client scope.

## Framework Adapters (FastAPI, Flask & Django)

- **FastAPI**: `AutorixSecurity` provides route dependencies that validate forwarded identity headers and enforce Nexus permissions.
- **Flask & Django**: `autorix.flask.require_permission` and `autorix.django.require_permission` provide declarative route decorators.

All framework adapters support constant-time verification of Aegis's canonical `v1` HMAC-SHA256 `X-Autorix-Identity-Signature`. Deploy them only behind a trusted proxy that strips client-supplied `X-User-*` headers.

## OAuth Safety & Reliability

- `authorization_url` requires caller-generated `state` and PKCE `code_challenge`. The SDK never persists tokens or verifiers.
- `exchange_code` and `refresh_token` are never retried automatically to protect single-use OAuth grants and refresh families.
- Only safe read operations retry on transient failures; permission checks always fail closed (`allowed=False`) on transport or service errors.

## Next Step

Automate operations with [`autorixctl`, Terraform Provider, and Direct REST/gRPC](/autorix/sdks/cli-and-apis).
