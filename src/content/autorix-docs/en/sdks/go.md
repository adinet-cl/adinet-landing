---
title: Go SDK Reference
navTitle: Go SDK
description: Synchronous net/http client for Autorix Nexus, Themis, Vulcan, Ego, Janus, and Argus with PKCE S256 helpers, fail-closed middleware, and HMAC identity header verification.
section: sdks
order: 2
---

Module: `github.com/autorix-cl/autorix/sdk/go` · Go 1.25.6+

The Go SDK provides a synchronous, `context.Context`-aware `net/http` client covering public runtime operations across Nexus, Themis, Vulcan, Ego, Janus, and Argus audit verification.

## Create a Client

```go
package main

import (
	"net/http"
	"time"

	autorix "github.com/autorix-cl/autorix/sdk/go"
)

func newAutorixClient() *autorix.Client {
	return autorix.NewClient(autorix.Config{
		NexusURL:    "http://localhost:8080",
		ThemisURL:   "http://localhost:4488",
		EgoURL:      "http://localhost:4433",
		JanusURL:    "http://localhost:4444",
		VulcanURL:   "http://localhost:4466",
		ArgusURL:    "http://localhost:4400",
		HTTPClient:  &http.Client{Timeout: 10 * time.Second},
		EnableCache: true,
		CacheTTL:    10 * time.Second,
	})
}
```

`NewClient` supplies localhost defaults and a 10-second HTTP timeout when omitted. Functional options `WithBaseURL`, `WithAPIKey`, `WithRetryConfig`, and `WithCache` are also supported.

## Engine Operations

- **Nexus**: `Check`, `CheckBatch`, `Expand`, and `LookupResources`. On transport or service failure, `Check` returns `(false, err)` (fail-closed).
- **Themis**: `Evaluate` against active tenant policies.
- **Vulcan**: `Verify` and `Attenuate` for API keys and Macaroons.
- **Ego**: `WhoAmI` for active session resolution.
- **Argus**: `VerifyAuditTrail` for live SHA-256 ledger validation.

```go
allowed, err := client.Nexus.Check(ctx, autorix.CheckRequest{
	Namespace: "documents",
	Object:    "document-42",
	Relation:  "viewer",
	SubjectID: "user-7",
})

result, err := client.Themis.Evaluate(ctx, autorix.EvaluatePolicyRequest{
	TenantID: "default",
	Context:  map[string]interface{}{"request": map[string]interface{}{}},
})

key, err := client.Vulcan.Verify(ctx, "av_live_...", nil)
audit, err := client.Argus.VerifyAuditTrail(ctx)
```

## Janus OAuth 2.0 / OIDC Helpers

```go
authURL, err := client.Janus.AuthorizationURL(
	"web-client",
	"https://app.example/callback",
	state,
	"openid offline_access",
	codeChallenge,
)

metadata, err := client.Janus.Discovery(ctx)

tokens, err := client.Janus.ExchangeToken(ctx, autorix.TokenRequest{
	GrantType:    "authorization_code",
	ClientID:     "web-client",
	Code:         code,
	CodeVerifier: verifier,
	RedirectURI:  "https://app.example/callback",
})

err = client.Janus.Revoke(ctx, clientID, clientSecret, tokens.RefreshToken, "refresh_token")
```

- `AuthorizationURL` applies PKCE `S256` whenever a `codeChallenge` is supplied.
- `ExchangeToken` and `Revoke` are never retried automatically because authorization codes and rotated refresh tokens are single-use.
- `GetJWKS` caches successful public key responses for 5 minutes.

## `net/http` Middleware & Signed Identity Headers

`Middleware` reads `X-User-ID`, `X-User-Email`, and `X-User-Roles` forwarded by **Aegis**, verifies the canonical `v1` HMAC-SHA256 `X-Autorix-Identity-Signature` in constant time, and attaches the parsed identity to `request.Context()`.

- `RequireAuth` rejects unauthenticated or invalidly signed requests.
- `RequirePermission` performs a live Nexus ReBAC `Check` before invoking the downstream handler.

```go
handler := client.RequirePermission(
	"documents",
	"editor",
	func(r *http.Request) string { return r.PathValue("id") },
	http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, _ := autorix.UserFromContext(r.Context())
		fmt.Fprintln(w, user.ID)
	}),
)
```

## Retry & Cache Notes

- Retries apply to `Nexus.Check`, `Themis.Evaluate`, `Ego.WhoAmI`, `Janus.Discovery`, `Janus.Introspect`, and Vulcan operations.
- `Expand`, `LookupResources`, `GetJWKS`, and `Argus.VerifyAuditTrail` invoke the configured `http.Client` directly.
- Nexus cache entries live in-process (default 10s TTL) and are not invalidated across replicas when tuples mutate.

## Next Step

Explore the [TypeScript & React SDK](/autorix/sdks/typescript) or [Python SDK](/autorix/sdks/python).
