---
title: Autorix Themis — Motor de Políticas ABAC (CEL)
navTitle: Themis (ABAC CEL)
description: Motor de control de acceso basado en atributos (ABAC) con latencia submilisegundo impulsado por Google CEL, anillos de prioridad deterministas, versionado, rollback y suites de pruebas.
section: engines
order: 2
ports: "4488 / 50052"
protocol: "REST / gRPC"
---

**Autorix Themis** evalúa políticas contextuales de autorización con latencia submilisegundo. Impulsado por **Google Common Expression Language (CEL)**, ofrece aislamiento multi-tenant, anillos de prioridad deterministas, versionado inmutable con rollback instantáneo y suites automatizadas de fixtures de prueba.

## Ruta Rápida: Crear y Evaluar una Política

Themis expone API REST en el puerto `4488` y gRPC en el puerto `50052`.

1. **Crear una política CEL** (`POST /policies`):

```json
{
  "tenant_id": "default",
  "name": "Block Suspicious Geos",
  "expression": "!['US', 'CA', 'CL', 'BR', 'AR', 'EU'].exists(c, c == context.country_code)",
  "priority": 1,
  "enabled": true
}
```

2. **Evaluar el contexto en tiempo de ejecución** (`POST /policies/evaluate`):

```json
{
  "tenant_id": "default",
  "policy_id": "pol_finance_mfa_lockdown",
  "payload": {
    "request": { "auth": { "mfa": true } },
    "context": { "country_code": "CL" }
  }
}
```

## Arquitectura y Anillos de Prioridad

Themis compila y verifica tipos de las expresiones CEL al registrarlas y luego ejecuta el anillo activo en orden ascendente de prioridad (menor número se evalúa primero):

```text
       [ Solicitud / Contexto de Autorización ]
                        │
                        ▼ (REST :4488 / gRPC :50052)
       ┌────────────────────────────────────────────────────────┐
       │                     Autorix Themis                     │
       │                                                        │
       │  ┌──────────────────────┐  ┌────────────────────────┐  │
       │  │ Compilador CEL       │  │ Bóveda de Versiones    │  │
       │  │ y Verificador Tipos  │  │ (Historial y Rollback) │  │
       │  └──────────┬───────────┘  └────────────────────────┘  │
       │             │                                          │
       │  ┌──────────▼───────────┐  ┌────────────────────────┐  │
       │  │ Motor de Anillos     │  │ Suites de Pruebas      │  │
       │  │ (Prioridad 1..N)     │  │ y Fixtures de Políticas│  │
       │  └──────────┬───────────┘  └────────────────────────┘  │
       └─────────────┼──────────────────────────────────────────┘
                     │
                     ▼
          [ Decisión: Permitir / Denegar ]
```

## Variables Estándar del Contexto CEL

Themis inyecta espacios de nombres fuertemente tipados en cada expresión:

| Variable | Tipo | Descripción |
| :--- | :--- | :--- |
| `request.auth` | `map` | Reclamaciones de identidad y autenticación desde JWT/Sesión (`request.auth.claims.department`, `request.auth.mfa`) |
| `request.ip` | `string` | Dirección IP de origen del cliente |
| `request.method` | `string` | Verbo HTTP o método RPC |
| `request.time` | `timestamp` | Marca de tiempo UTC de la evaluación |
| `resource` | `map` | Atributos del recurso objetivo (`resource.amount`, `resource.classification`) |
| `context` | `map` | Parámetros personalizados de entorno (`context.geo_country`, `context.is_break_glass`) |

## Referencia Completa REST (`:4488`) y gRPC (`:50052`)

| Operación | Endpoint | Descripción |
| :--- | :--- | :--- |
| Listar políticas | `GET /policies` | Lista paginada por cursor para un tenant |
| Crear política | `POST /policies` | Compila, valida y almacena una política CEL |
| Leer / actualizar / eliminar | `GET / PUT / DELETE /policies/{id}` | Toda actualización crea automáticamente una instantánea de la versión previa |
| Evaluar anillo | `POST /policies/evaluate` | Evalúa políticas activas contra un payload de ejecución |
| Compilar y validar | `POST /policies/validate` | Valida sintaxis y tipos CEL sin persistir |
| Simulación (dry-run) | `POST /policies/dry-run` | Ejecuta una expresión transitoria contra datos de prueba |
| Historial de versiones | `GET /policies/{id}/versions` | Lista todas las instantáneas históricas inmutables |
| Rollback | `POST /policies/{id}/rollback/{version}` | Restaura una versión anterior sin tiempo de inactividad |
| Fixtures y pruebas | `/policies/{id}/fixtures`, `/policies/{id}/test-suite` | Gestiona y ejecuta pruebas automatizadas de regresión |

Por gRPC (`:50052`), `themis.v1.ThemisService` expone `Evaluate`, `ValidateExpression`, `ListPolicies`, `GetPolicy` y `CreatePolicy`, además de `grpc.health.v1.Health`.

## Recetas CEL para Producción

- **Acceso de Emergencia (Break-Glass)**:
  ```js
  context.is_break_glass == true && request.auth.claims.security_clearance >= 3
  ```
- **Transferencias de Alto Valor en Horario Hábil**:
  ```js
  request.auth.claims.role == "finance_officer" && request.auth.mfa == true && request.time.hour >= 9 && request.time.hour <= 17 && resource.amount <= 1000000.0
  ```
- **Aislamiento por Subred y Geocerca**:
  ```js
  request.ip.startsWith("10.240.") && ['US', 'CL', 'BR'].exists(c, c == context.geo_country)
  ```

## Lista de Verificación

- [ ] Validar toda expresión CEL con `POST /policies/validate` antes de guardarla.
- [ ] Confirmar que el payload de evaluación coincide con `request`, `resource` y `context`.
- [ ] Adjuntar fixtures automatizados y ejecutar `/policies/{id}/test-suite` antes de pasar a producción.
- [ ] Gestionar políticas repetibles como código con el [Provider de Terraform](/autorix/sdks/cli-and-apis#provider-de-terraform).

## Siguiente Paso

Administra identidades y sesiones en [Autorix Ego](/autorix/engines/ego) o integra la aplicación perimetral con [Autorix Aegis](/autorix/engines/aegis).
