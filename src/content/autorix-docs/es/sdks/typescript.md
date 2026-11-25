---
title: Referencia del SDK de TypeScript y React
navTitle: SDK de TypeScript / React
description: Cliente tipado basado en fetch (@autorix/sdk-js) y hooks opcionales de React para Nexus ReBAC, Themis ABAC, Macaroons Vulcan, sesiones Ego y OAuth2/OIDC Janus.
section: sdks
order: 3
---

Paquete: `@autorix/sdk-js` · Node.js 18+ o cualquier runtime con `fetch` (React es opcional si no importas los hooks)

Cada operación del cliente acepta un parámetro final opcional `AbortSignal` para cancelar peticiones. Las operaciones estándar lanzan `AutorixApiError` o `AutorixTimeoutError`, mientras que las comprobaciones de permisos y API keys resuelven en *fail-closed* (denegado).

## Crear un Cliente

```ts
import { AutorixClient } from "@autorix/sdk-js";

const autorix = new AutorixClient({
  nexusUrl: "https://nexus.example.internal",
  themisUrl: "https://themis.example.internal",
  janusUrl: "https://login.example.com",
  egoUrl: "https://identity.example.com",
  timeoutMs: 10_000,
  enableCache: true,
  cacheTtlMs: 10_000,
});
```

`AutorixConfig` acepta URLs de motores, `timeoutMs`, configuración de reintentos/caché, `apiKey` (solo servidor) y una implementación inyectable de `fetch` para pruebas o transportes personalizados.

## Operaciones Públicas

```ts
// Nexus ReBAC
const decision = await autorix.check({
  namespace: "documents",
  object: "document-42",
  relation: "viewer",
  subject: "user-7",
});

await autorix.writeTuples([
  { namespace: "documents", object: "document-42", relation: "viewer", subjectId: "user-7" },
]);

// Themis ABAC
const policies = await autorix.listPolicies({ tenantId: "default", limit: 20 });
await autorix.createPolicy(policy);

// API Keys Vulcan
const created = await autorix.createApiKey({
  name: "worker",
  ownerId: "service-7",
  scopes: ["reports:read"],
});
```

- **Nexus**: `check`, `checkBatch`, lectura/escritura/eliminación de tuplas, `expand`, búsqueda de sujetos y recursos.
- **Themis**: `evaluatePolicy`, CRUD de políticas, historial de versiones, validación y dry-run.
- **Vulcan**: creación, listado, verificación, atenuación y revocación de claves.
- **Paginación**: Las listas devuelven `Page<T>` con `{ data, nextCursor, hasMore }`.

## OAuth 2.0 / OIDC con Janus

```ts
const authorizationUrl = autorix.createAuthorizationUrl({
  clientId: "spa-client",
  redirectUri: "https://app.example/callback",
  state,
  codeChallenge,
});

const tokens = await autorix.exchangeAuthorizationCode({
  clientId: "spa-client",
  code,
  redirectUri: "https://app.example/callback",
  codeVerifier,
});

const refreshed = await autorix.refreshToken(tokens.refresh_token!, "spa-client");
```

Métodos disponibles: `getOpenIdConfiguration`, `getJwks`, `createAuthorizationUrl`, `exchangeAuthorizationCode`, `refreshToken`, `introspectToken` y `revokeToken`. Los intercambios de código y refresh nunca se reintentan automáticamente.

## Integración con React y Frontera de Navegador

```tsx
import { AutorixProvider, usePermission, useSession } from "@autorix/sdk-js";

export function App({ children }: { children: React.ReactNode }) {
  return (
    <AutorixProvider config={{ egoUrl: "https://identity.example.com" }}>
      {children}
    </AutorixProvider>
  );
}

export function EditButton({ id }: { id: string }) {
  const { isAuthenticated } = useSession();
  const { allowed, checking } = usePermission("documents", id, "editor");
  if (!isAuthenticated || checking || !allowed) return null;
  return <button type="button">Editar</button>;
}
```

Hooks disponibles: `useAutorix`, `useSession`, `usePermission`, `useBatchPermissions` y `usePolicy`.

> **Nunca impongas seguridad en el navegador**: Los hooks de React son únicamente auxiliares visuales. Nunca empaquetes `apiKey`, `clientSecret` ni credenciales de operador en el cliente. Revalida siempre permisos en tu backend y verifica `X-Autorix-Identity-Signature` detrás de Aegis.

## Notas sobre Reintentos y Caché

- Solo se reintentan llamadas idempotentes `GET`, `HEAD` y `OPTIONS`; las escrituras nunca reintentan automáticamente.
- Las decisiones Nexus se almacenan en caché local durante 10 segundos por defecto.

## Siguiente Paso

Explora el [SDK de Python](/autorix/sdks/python) o el [CLI y Provider de Terraform](/autorix/sdks/cli-and-apis).
