---
title: Autorix Nexus — Zanzibar ReBAC Engine
navTitle: Nexus (Zanzibar ReBAC)
description: Ultra-low latency relationship-based access control (ReBAC) engine inspired by Google Zanzibar, with APL schema compiler, graph cycle detection, reverse lookups, and CEL caveats.
section: engines
order: 1
ports: "8080 / 50051"
protocol: "REST / gRPC"
---

**Autorix Nexus** is a fine-grained authorization engine combining **Google Zanzibar** relationship graphs with contextual **Attribute-Based Access Control (ABAC)** caveats powered by Google Common Expression Language (CEL). It resolves complex hierarchical permissions across millions of tuples with sub-5ms latency.

## Quick Path: Check a Permission

Evaluate whether a user holds a permission on a resource, including runtime ABAC caveat context and an optional decision trace (`explain: true`):

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

## Zanzibar Tuple Model & Graph Traversal

Instead of flat RBAC role assignments, Nexus stores permissions in PostgreSQL (`autorix_nexus`) as a B-tree indexed directed graph of relation tuples:

```text
namespace:object#relation@subject_namespace:subject_id[#subject_relation] [with caveat]
```

| Field | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `namespace` | `string` | `documents` | Object resource domain |
| `object` | `string` | `roadmap_2026` | Unique resource instance ID |
| `relation` | `string` | `editor` | Granted relation on the object |
| `subject_namespace` | `string` | `user` / `group` | Namespace of the subject |
| `subject_id` | `string` | `usr_alice` / `eng_team` | Unique identifier of the subject |
| `subject_relation` | `string` (optional) | `member` | Enables subject-set inheritance (usersets) |
| `caveat_name` | `string` (optional) | `office_hours` | Registered CEL caveat evaluated at check time |
| `caveat_context` | `jsonb` (optional) | `{"allowed_ips": ["10.0.0.0/24"]}` | Static parameters bound to the tuple |

During `POST /check`, Nexus performs:
1. Direct tuple lookup.
2. **Userset Rewrites** (`Union` rules such as `viewer = editor || owner`).
3. **TupleToUserset** parent inheritance (e.g., inheriting `viewer` from a parent `folder`).
4. **Cycle detection & depth limiting** (`max_depth = 32`) to guarantee termination on circular graphs.

## Autorix Permission Language (APL)

Nexus ships a built-in **Autorix Permission Language (APL)** compiler (TypeScript-like syntax offering parity with Ory Keto OPL) that compiles directly into Zanzibar rewrite rules:

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

## Dynamic ABAC Caveats

Register reusable CEL caveats via `POST /admin/caveats` (for example, `request_context.hour >= 9 && request_context.hour <= 18`) and bind them when writing tuples so access automatically adapts to time, IP, or runtime context.

## REST (`:8080`) & gRPC (`:50051`) API Reference

### REST Endpoints

| Operation | Endpoint | Description |
| :--- | :--- | :--- |
| Check permission | `POST /check` | Traverses relation graph and evaluates CEL caveats |
| Manage tuples | `POST /tuples`, `GET /tuples`, `DELETE /tuples` | Write, query, or delete relation tuples |
| Expand permission tree | `POST /expand` | Returns the full subject tree for an object/relation |
| Reverse lookup (subjects) | `POST /lookup/subjects` | Lists all subjects who can access a given resource |
| Reverse lookup (resources) | `POST /lookup/resources` | Lists all resource IDs accessible to a subject |
| Namespaces & caveats | `GET / POST / DELETE /admin/namespaces`, `/admin/caveats` | Manage schemas and CEL caveat definitions |

Example tuple creation (`POST /tuples`):

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

### gRPC Service (`:50051`)

Implements `nexus.v1.NexusService` (plus `grpc.health.v1.Health`):
- `Check`, `WriteTuples`, `DeleteTuples`, `WriteCaveats`, `Expand`, `LookupSubjects`, `LookupResources`.

## Implementation Checklist

- [ ] Provision isolated PostgreSQL database `autorix_nexus`.
- [ ] Author namespace schemas via JSON or APL.
- [ ] Register runtime CEL caveats for conditional access.
- [ ] Seed foundational group membership and parent-child relation tuples.
- [ ] Validate check latency and decision traces via Console's Permissions Studio.

## Next Step

Pair relationship authorization with contextual policy rules in [Autorix Themis](/autorix/engines/themis) or enforce checks at the perimeter with [Autorix Aegis](/autorix/engines/aegis).
