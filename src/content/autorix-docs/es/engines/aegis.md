---
title: Autorix Aegis — Proxy Inverso PEP Zero-Trust
navTitle: Aegis (Proxy PEP Zero-Trust)
description: Proxy inverso Policy Enforcement Point (PEP) perimetral encargado de emparejamiento de rutas, autenticación JWT/Macaroon/Sesión, autorización con Nexus/Themis y firma HMAC-SHA256 de cabeceras de identidad.
section: engines
order: 5
ports: "4455 / 4456 (admin)"
protocol: "HTTP Proxy / REST"
---

**Autorix Aegis** es el Punto de Aplicación de Políticas (PEP) Zero-Trust y proxy inverso de acceso en el perímetro de tu malla de microservicios. Intercepta solicitudes HTTP entrantes (`:4455`), autentica al cliente, consulta decisiones de autorización en Nexus y Themis, inyecta cabeceras de identidad firmadas criptográficamente y reenvía el tráfico autorizado hacia los servicios internos.

## Ruta Rápida: Proteger un Endpoint Upstream

Registra una regla mediante la API privada de administración (`:4456`) desde Console, una llamada interna o un port-forward autenticado. Define `JWT_ISSUER`, `JWT_AUDIENCE` y `JWT_JWKS_URL` (o `JWT_PUBLIC_KEY_FILE`) al iniciar el proceso; las reglas no pueden sobrescribir la fuente de confianza JWKS.

```bash
curl -X POST http://localhost:4456/rules \
  -H "Content-Type: application/json" \
  -H "X-Autorix-Internal-Token: $INTERNAL_TOKEN" \
  -d '{
    "id": "rule_protect_customer_pii",
    "match": {
      "url": "http://api.enterprise.corp/api/v1/customers/<[0-9a-f-]+>",
      "methods": ["GET"]
    },
    "authenticators": [{ "handler": "jwt" }],
    "authorizers": [
      {
        "handler": "nexus_rebac",
        "config": {
          "namespace": "customers",
          "relation": "viewer",
          "subject_from": "jwt.sub",
          "object_from": "url_param.0"
        }
      }
    ],
    "mutators": [
      {
        "handler": "header",
        "config": { "headers": { "X-User-ID": "{{ .Subject }}" } }
      }
    ],
    "upstream": { "url": "http://customer-svc.internal:8080" }
  }'
```

## Pipeline de Aplicación en 4 Etapas

Toda solicitud entrante en `:4455` atraviesa cuatro etapas deterministas:

1. **Emparejador de Reglas**: Evalúa host, patrón regex de URL y método HTTP según precedencia.
2. **Etapa de Autenticación**: Verifica access tokens JWT (Janus), API keys Macaroon (Vulcan) o sesiones (Ego). Rechaza credenciales inválidas con `401 Unauthorized`.
3. **Etapa de Autorización**: Ejecuta comprobaciones granulares contra **Nexus** (ReBAC) y/o **Themis** (ABAC CEL). Rechaza accesos no autorizados con `403 Forbidden`.
4. **Etapa de Mutación y Firma de Identidad**: Elimina cabeceras falsificadas del cliente, inyecta cabeceras confiables (`X-User-ID`, `X-User-Email`, `X-User-Roles`), calcula la firma canónica `v1` HMAC-SHA256 `X-Autorix-Identity-Signature` y reenvía la petición al backend.

> **Verificación upstream**: Todos los SDKs oficiales de Autorix (Go, TypeScript y Python FastAPI/Flask) verifican `X-Autorix-Identity-Signature` en tiempo constante para demostrar criptográficamente que la identidad proviene de Aegis.

## Referencia de API Administrativa Privada (`:4456`)

Aegis expone sus sondas de salud (`/health/alive`, `/health/ready`, `/info`) y la gestión de reglas únicamente en `:4456`, garantizando que ninguna regla wildcard en `:4455` pueda ocultar los endpoints de salud o administración.

| Operación | Endpoint | Descripción |
| :--- | :--- | :--- |
| Listar reglas | `GET /rules` | Devuelve las reglas activas ordenadas por precedencia |
| Crear regla | `POST /rules` | Registra una nueva regla de enrutamiento PEP |
| Leer / actualizar / eliminar | `GET / PUT / DELETE /rules/{id}` | Administra reglas individuales |
| Reordenar precedencia | `PUT /rules/reorder` | Recibe un arreglo ordenado de `rule_ids` |
| Importación / exportación masiva | `POST /rules/import`, `GET /rules/export` | Sincronización de reglas en JSON / YAML |
| Versionado de reglas | `GET /rules/versions`, `POST /rules/rollback/{version}` | Inspección de historial y reversión segura |
| Catálogo de handlers | `GET /handlers` | Lista autenticadores, autorizadores y mutadores disponibles |

## Simulador de Coincidencia de Reglas (Dry-Run)

Comprueba qué regla coincide con una petición y revisa su traza sin enviar tráfico real al servicio upstream:

```bash
curl -X POST http://localhost:4456/rules/test-match \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "path": "/api/v1/customers/1234",
    "headers": { "Authorization": "Bearer eyJhbGci..." }
  }'
```

## Lista de Verificación para Producción

- [ ] Exponer únicamente el puerto de proxy `:4455` al borde; mantener `:4456` estrictamente interno.
- [ ] Configurar `JWT_JWKS_URL` por HTTPS (nunca activar `JWT_ALLOW_INSECURE_JWKS=true` en producción).
- [ ] Compartir el secreto de firma HMAC entre Aegis y los middlewares upstream para validar `X-Autorix-Identity-Signature`.
- [ ] Validar conflictos de prioridad con `POST /rules/test-match` antes de promover cambios.

## Siguiente Paso

Emite API keys atenuables sin conexión para clientes máquina con [Autorix Vulcan](/autorix/engines/vulcan) o gestiona reglas visualmente en [Autorix Console](/autorix/control-plane/console).
