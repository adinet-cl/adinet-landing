---
title: TypeScript & React SDK Reference
navTitle: TypeScript / React SDK
description: Typed fetch-based TypeScript client (@autorix/sdk-js) and optional React hooks for Nexus ReBAC, Themis ABAC, Vulcan Macaroons, Ego sessions, and Janus OAuth2/OIDC.
section: sdks
order: 3
---

Package: `@autorix/sdk-js` · Node.js 18+ or any runtime with `fetch` (React is optional unless importing React hooks)

Every client operation accepts an optional trailing `AbortSignal` for request cancellation. Non-authorization operations throw `AutorixApiError` or `AutorixTimeoutError`; permission and API key verification fail closed by resolving to denied results.

## Create a Client

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

`AutorixConfig` accepts engine URLs, `timeoutMs`, retry/cache settings, server-only `apiKey`, and an injectable `fetch` implementation for testing or custom transports.

## Public Runtime Operations

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

// Vulcan API Keys
const created = await autorix.createApiKey({
  name: "worker",
  ownerId: "service-7",
  scopes: ["reports:read"],
});
```

- **Nexus**: `check`, `checkBatch`, tuple list/write/delete, `expand`, subject and resource lookups.
- **Themis**: `evaluatePolicy`, policy CRUD, version history, validation, and dry runs.
- **Vulcan**: key create/list/verify/attenuate/revoke.
- **Pagination**: List operations return `Page<T>` with `{ data, nextCursor, hasMore }`.

## Janus OAuth 2.0 / OIDC

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

Available helpers: `getOpenIdConfiguration`, `getJwks`, `createAuthorizationUrl`, `exchangeAuthorizationCode`, `refreshToken`, `introspectToken`, and `revokeToken`. Code and refresh exchanges are never automatically retried.

## React Integration & Browser Security Boundary

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
  return <button type="button">Edit</button>;
}
```

Available hooks: `useAutorix`, `useSession`, `usePermission`, `useBatchPermissions`, and `usePolicy`.

> **Never enforce security in browser code**: React hooks only control UI visibility. Never bundle `apiKey`, `clientSecret`, or operator tokens into client-side code. Always re-enforce permissions on your backend and verify `X-Autorix-Identity-Signature` on server-side routes behind Aegis.

## Retry & Cache Notes

- Only idempotent `GET`, `HEAD`, and `OPTIONS` calls retry by default; write operations never auto-retry.
- Nexus decisions are cached in-process for 10 seconds by default.

## Next Step

Explore the [Python SDK](/autorix/sdks/python) or [CLI & Terraform Provider](/autorix/sdks/cli-and-apis).
