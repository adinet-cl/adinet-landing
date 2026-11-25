---
title: Autorix Nexus — Motor ReBAC Zanzibar
navTitle: Nexus (ReBAC Zanzibar)
description: Motor de control de acceso basado en relaciones (ReBAC) de latencia ultrabaja inspirado en Google Zanzibar, con compilador APL, detección de ciclos, búsquedas inversas y caveats CEL.
section: engines
order: 1
ports: "8080 / 50051"
protocol: "REST / gRPC"
---

**Autorix Nexus** es un motor de autorización granular que combina grafos de relaciones estilo **Google Zanzibar** con condiciones contextuales **ABAC** evaluadas mediante Google Common Expression Language (CEL). Resuelve jerarquías complejas de permisos sobre millones de tuplas con latencias inferiores a 5 ms.

## Ruta Rápida: Verificar un Permiso

Evalúa si un usuario tiene permiso sobre un recurso incluyendo contexto dinámico para caveats CEL y traza explicativa (`explain: true`):

```bash
curl -X POST http://localhost:8080/check \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "documents",
    "object": "roadmap_2026",
    "relation": "editor",
    "subject_namespace": "user",
    "subject_id": "usr_alice",
    "request_context": {
      "hour": 14,
      "ip": "10.0.4.100"
    },
    "explain": true
  }'
```

## Modelo de Tuplas Zanzibar y Recorrido de Grafos

En lugar de roles planos, Nexus almacena los permisos en PostgreSQL (`autorix_nexus`) como un grafo dirigido de relaciones indexado con árboles B:

```text
namespace:object#relation@subject_namespace:subject_id[#subject_relation] [with caveat]
```

| Campo | Tipo | Ejemplo | Descripción |
| :--- | :--- | :--- | :--- |
| `namespace` | `string` | `documents` | Dominio o tipo de recurso |
| `object` | `string` | `roadmap_2026` | Identificador único de la instancia |
| `relation` | `string` | `editor` | Relación otorgada sobre el recurso |
| `subject_namespace` | `string` | `user` / `group` | Espacio de nombres del sujeto |
| `subject_id` | `string` | `usr_alice` / `eng_team` | Identificador del sujeto |
| `subject_relation` | `string` (opcional) | `member` | Habilita herencia por conjuntos de usuarios (*usersets*) |
| `caveat_name` | `string` (opcional) | `office_hours` | Regla CEL evaluada en tiempo de ejecución |
| `caveat_context` | `jsonb` (opcional) | `{"allowed_ips": ["10.0.0.0/24"]}` | Parámetros estáticos vinculados a la tupla |

Durante `POST /check`, Nexus ejecuta:
1. Búsqueda directa de tupla.
2. **Reescritura de Userset** (reglas `Union` como `viewer = editor || owner`).
3. **TupleToUserset** para herencia desde un objeto padre (por ejemplo, heredar `viewer` desde una carpeta `folder`).
4. **Detección de ciclos y límite de profundidad** (`max_depth = 32`) para evitar recursión infinita en grafos circulares.

## Autorix Permission Language (APL)

Nexus incluye un compilador nativo de **Autorix Permission Language (APL)**, una sintaxis estilo TypeScript con paridad frente a Ory Keto OPL que compila directamente a reglas Zanzibar:

```typescript
import { Namespace, Context } from "@autorix/nexus-types";

class Document implements Namespace {
  related: {
    owner: User[];
    editor: User[];
    viewer: User[];
    parent: Folder[];
  };

  permits = {
    view: (ctx: Context): boolean =>
      this.related.viewer.includes(ctx.subject) ||
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject) ||
      this.related.parent.traverse((p) => p.related.view),

    edit: (ctx: Context): boolean =>
      this.related.editor.includes(ctx.subject) ||
      this.related.owner.includes(ctx.subject),
  };
}
```

## Caveats ABAC Dinámicos

Registra expresiones CEL reutilizables mediante `POST /admin/caveats` (por ejemplo, `request_context.hour >= 9 && request_context.hour <= 18`) y vincúlalas al crear tuplas para restringir acceso por horario, IP o contexto en tiempo real.

## Referencia de API REST (`:8080`) y gRPC (`:50051`)

### Endpoints REST

| Operación | Endpoint | Descripción |
| :--- | :--- | :--- |
| Verificar permiso | `POST /check` | Recorre el grafo de relaciones y evalúa caveats CEL |
| Gestionar tuplas | `POST /tuples`, `GET /tuples`, `DELETE /tuples` | Crear, consultar o eliminar tuplas de relación |
| Expandir árbol | `POST /expand` | Devuelve el árbol completo de sujetos con acceso |
| Búsqueda inversa (sujetos) | `POST /lookup/subjects` | Lista todos los sujetos con permiso sobre un recurso |
| Búsqueda inversa (recursos) | `POST /lookup/resources` | Lista los IDs de recursos accesibles para un sujeto |
| Namespaces y caveats | `GET / POST / DELETE /admin/namespaces`, `/admin/caveats` | Administrar esquemas y reglas CEL |

Ejemplo de creación de tuplas (`POST /tuples`):

```json
{
  "tuples": [
    {
      "namespace": "documents",
      "object": "roadmap_2026",
      "relation": "editor",
      "subject_namespace": "user",
      "subject_id": "bob"
    }
  ]
}
```

### Interfaz gRPC (`:50051`)

Implementa `nexus.v1.NexusService` (y `grpc.health.v1.Health`):
- `Check`, `WriteTuples`, `DeleteTuples`, `WriteCaveats`, `Expand`, `LookupSubjects`, `LookupResources`.

## Lista de Verificación

- [ ] Aprovisionar la base de datos aislada `autorix_nexus`.
- [ ] Definir los esquemas de namespace en JSON o APL.
- [ ] Registrar caveats CEL requeridos para acceso contextual.
- [ ] Cargar tuplas fundacionales de membresía de grupos y jerarquías padre-hijo.
- [ ] Validar latencias y trazas de decisión en el **Permissions Studio** de Console.

## Siguiente Paso

Combina autorización relacional con políticas contextuales en [Autorix Themis](/autorix/engines/themis) o aplica el control en el borde con [Autorix Aegis](/autorix/engines/aegis).
