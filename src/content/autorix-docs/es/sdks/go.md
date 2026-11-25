---
title: Referencia del SDK de Go
navTitle: SDK de Go
description: Cliente síncrono net/http para Autorix Nexus, Themis, Vulcan, Ego, Janus y Argus con soporte PKCE S256, middleware fail-closed y verificación HMAC de cabeceras de identidad.
section: sdks
order: 2
---

Módulo: `github.com/autorix-cl/autorix/sdk/go` · Go 1.25.6+

El SDK de Go ofrece un cliente HTTP síncrono compatible con `context.Context` para operaciones en tiempo de ejecución sobre Nexus, Themis, Vulcan, Ego, Janus y verificación criptográfica en Argus.

## Crear un Cliente

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

`NewClient` provee direcciones `localhost` y un timeout de 10 segundos por defecto. También dispone de las opciones `WithBaseURL`, `WithAPIKey`, `WithRetryConfig` y `WithCache`.

## Operaciones por Motor

- **Nexus**: `Check`, `CheckBatch`, `Expand` y `LookupResources`. Ante errores de red o del servicio, `Check` devuelve `(false, err)` (*fail-closed*).
- **Themis**: `Evaluate` contra políticas activas del tenant.
- **Vulcan**: `Verify` y `Attenuate` para API keys y Macaroons.
- **Ego**: `WhoAmI` para resolución de sesión activa.
- **Argus**: `VerifyAuditTrail` para validación en vivo de la cadena SHA-256.

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

## OAuth 2.0 / OIDC con Janus

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

- `AuthorizationURL` aplica PKCE `S256` cuando se proporciona `codeChallenge`.
- `ExchangeToken` y `Revoke` nunca reintentan automáticamente al operar con credenciales de un solo uso.
- `GetJWKS` almacena en caché las claves públicas durante 5 minutos.

## Middleware `net/http` y Firma de Identidad

`Middleware` lee `X-User-ID`, `X-User-Email` y `X-User-Roles` inyectadas por **Aegis**, valida la firma canónica `v1` HMAC-SHA256 `X-Autorix-Identity-Signature` en tiempo constante e inyecta la identidad en `request.Context()`.

- `RequireAuth` rechaza peticiones sin autenticación o con firma inválida.
- `RequirePermission` ejecuta una comprobación Nexus ReBAC en vivo antes de delegar al manejador siguiente.

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

## Notas sobre Reintentos y Caché

- Los reintentos se aplican a `Nexus.Check`, `Themis.Evaluate`, `Ego.WhoAmI`, `Janus.Discovery`, `Janus.Introspect` y métodos de Vulcan.
- `Expand`, `LookupResources`, `GetJWKS` y `Argus.VerifyAuditTrail` llaman directamente al `http.Client` configurado.
- La caché de Nexus es local al proceso (TTL de 10 s por defecto) y no se invalida automáticamente entre réplicas.

## Siguiente Paso

Explora el [SDK de TypeScript y React](/autorix/sdks/typescript) o el [SDK de Python](/autorix/sdks/python).
