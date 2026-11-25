---
title: Autorix Vulcan — API Keys y Macaroons
navTitle: Vulcan (Claves Macaroon)
description: API keys de alta entropía con prefijos de entorno (av_live_ / av_test_), atenuación descentralizada sin conexión con Macaroons HMAC-SHA256 y verificación en tiempo constante.
section: engines
order: 6
ports: "4466"
protocol: "REST"
---

**Autorix Vulcan** emite API keys de alta entropía con prefijo de entorno respaldadas por **Macaroons HMAC-SHA256**. Los servicios pueden delegar tokens de capacidad restringidos ("atenuados") a trabajadores distribuidos sin conexión, sin llamar a Vulcan ni consultar la base de datos.

## Ruta Rápida: Emitir, Atenuar y Verificar

Vulcan expone su API REST en el puerto `4466`.

1. **Crear una API key con prefijo** (`POST /keys`):

```json
{
  "name": "ETL Ingestion Pipeline",
  "owner_id": "svc_etl_runner",
  "scopes": ["ingest:write", "metrics:read"],
  "is_live": true
}
```

2. **Atenuar sin conexión**: Con el SDK de Autorix o `POST /keys/attenuate`, agrega restricciones (*caveats*) de primera parte como `time_before = NOW + 10m` o `method = POST` antes de delegar el token a un worker.
3. **Verificar el Macaroon** (`POST /keys/verify`):

```json
{
  "macaroon": {
    "location": "http://localhost:4466",
    "key_id": "vk_01...",
    "caveats": ["time_before = 2026-11-25T16:00:00Z", "method = POST"],
    "signature": "e3b0c442..."
  },
  "context": {
    "now": "2026-11-25T15:52:00Z",
    "method": "POST"
  }
}
```

## Encadenamiento Macaroon y Seguridad en Reposo

Cada restricción añadida actualiza la firma HMAC encadenada: `Sig_(i+1) = HMAC-SHA256(Sig_i, Caveat_(i+1))`. Eliminar o alterar cualquier caveat rompe inmediatamente la cadena criptográfica.

```text
  [ Servicio Principal / SDK ] ──(Atenúa sin conexión)──► [ Worker Distribuido ]
                                                                   │
                                                                   ▼ (Invoca API)
  ┌────────────────────────────────────────────────────────────────────────┐
  │                            Autorix Vulcan                              │
  │  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
  │  │ Emisor con Prefijos  │  │ Verificador Macaroon HMAC-SHA256       │  │
  │  │ (av_live_ / av_test_)│  │ (Evalúa caveats y verifica firma)      │  │
  │  └──────────┬───────────┘  └───────────────────┬────────────────────┘  │
  └─────────────┼──────────────────────────────────┼───────────────────────┘
                │                                  │
                ▼                                  ▼
            [ PostgreSQL: autorix_vulcan (api_keys, scopes, metrics) ]
```

- **Prefijos Compatibles con Escáneres de Secretos**: `av_live_` para producción y `av_test_` para entornos staging o pruebas automatizadas.
- **Sin Almacenamiento en Texto Plano**: Vulcan guarda únicamente `key_hash = SHA-256(raw_key)` junto con un breve `key_hint`, aplicando comparación en tiempo constante para evitar ataques de temporización.

## Referencia de API REST (`:4466`)

| Operación | Endpoint | Descripción |
| :--- | :--- | :--- |
| Crear API key | `POST /keys` | Emite una clave con prefijo y Macaroon raíz |
| Listar claves | `GET /keys` | Lista de metadatos paginada por cursor (nunca expone el secreto) |
| Atenuar token | `POST /keys/attenuate` | Añade caveats de primera parte y devuelve el token encadenado |
| Verificar token | `POST /keys/verify` | Valida la cadena HMAC y evalúa los caveats frente al contexto |
| Rotar clave raíz | `POST /admin/keys/{id}/rotate` | Genera nueva clave de firma manteniendo período de gracia |
| Revocar clave | `DELETE /keys/{id}` | Revoca inmediatamente la clave y sus Macaroons derivados |
| Scopes del sistema | `GET / POST /admin/scopes` | Administra alcances permitidos para API keys |

## Patrón de Producción: Delegación Offline a Workers

1. El servicio principal posee el Macaroon raíz `M0`.
2. Antes de despachar una tarea en segundo plano, deriva `M1` localmente en memoria con caveats `time_before = NOW + 10m` y `scope = reports:read`.
3. El worker invoca tu API con `M1`; Aegis y Vulcan verifican la firma y las restricciones sin consultas adicionales de permisos.

## Lista de Verificación

- [ ] Usar `av_test_` en entornos de prueba y reservar `av_live_` para producción.
- [ ] Activar escáneres de secretos para detectar prefijos `av_live_`.
- [ ] Atenuar tokens delegados al alcance mínimo y con expiración corta.

## Siguiente Paso

Federa proveedores corporativos vía SAML 2.0 y SCIM 2.0 en [Autorix Hermes](/autorix/engines/hermes).
