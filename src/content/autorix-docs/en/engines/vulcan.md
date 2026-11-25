---
title: Autorix Vulcan — API Keys & Macaroons
navTitle: Vulcan (Macaroon Keys)
description: High-entropy, environment-prefixed API keys (av_live_ / av_test_) with decentralized offline HMAC-SHA256 caveat attenuation and constant-time verification.
section: engines
order: 6
ports: "4466"
protocol: "REST"
---

**Autorix Vulcan** issues high-entropy, environment-prefixed API keys backed by **HMAC-SHA256 Macaroons**. Services can delegate restricted ("attenuated") capability tokens to downstream workers offline—without calling Vulcan or querying a database.

## Quick Path: Mint, Attenuate & Verify

Vulcan serves its REST API on port `4466`.

1. **Create a prefixed API key** (`POST /keys`):

```json
{
  "name": "ETL Ingestion Pipeline",
  "owner_id": "svc_etl_runner",
  "scopes": ["ingest:write", "metrics:read"],
  "is_live": true
}
```

2. **Attenuate offline**: Using an Autorix SDK or `POST /keys/attenuate`, append first-party caveats such as `time_before = NOW + 10m` or `method = POST` before delegating the token to a worker.
3. **Verify the Macaroon** (`POST /keys/verify`):

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

## Macaroon Chaining & Storage Security

Every appended caveat updates the HMAC signature chain: `Sig_(i+1) = HMAC-SHA256(Sig_i, Caveat_(i+1))`. Removing or tampering with any caveat breaks the cryptographic chain.

```text
  [ Primary Service / SDK ] ──(Attenuates token offline)──► [ Distributed Worker ]
                                                                   │
                                                                   ▼ (Calls API)
  ┌────────────────────────────────────────────────────────────────────────┐
  │                            Autorix Vulcan                              │
  │  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
  │  │ Prefixed Key Minter  │  │ HMAC-SHA256 Chained Macaroon Verifier  │  │
  │  │ (av_live_ / av_test_)│  │ (Evaluates caveats & verifies sig)     │  │
  │  └──────────┬───────────┘  └───────────────────┬────────────────────┘  │
  └─────────────┼──────────────────────────────────┼───────────────────────┘
                │                                  │
                ▼                                  ▼
            [ PostgreSQL: autorix_vulcan (api_keys, scopes, metrics) ]
```

- **Secret-Scanner Friendly Prefixes**: `av_live_` for production credentials; `av_test_` for staging and CI testing.
- **Zero Plaintext Storage**: Vulcan stores only `key_hash = SHA-256(raw_key)` plus a short `key_hint`, validating credentials in constant time to prevent timing attacks.

## REST API Reference (`:4466`)

| Operation | Endpoint | Description |
| :--- | :--- | :--- |
| Create API key | `POST /keys` | Mints a prefixed key and root Macaroon |
| List keys | `GET /keys` | Cursor-paginated metadata list (never returns raw secret) |
| Attenuate token | `POST /keys/attenuate` | Appends first-party caveats and returns chained token |
| Verify token | `POST /keys/verify` | Validates HMAC chain and evaluates caveats against runtime context |
| Rotate root key | `POST /admin/keys/{id}/rotate` | Generates a new root signature key with grace-period overlap |
| Revoke key | `DELETE /keys/{id}` | Immediately revokes key and derived Macaroons |
| System scopes | `GET / POST /admin/scopes` | Manage allowed API key scopes |

## Production Pattern: Offline Worker Delegation

1. Primary service holds root Macaroon `M0`.
2. Before dispatching a background job, the service derives `M1` locally in memory with caveats `time_before = NOW + 10m` and `scope = reports:read`.
3. The worker calls your API with `M1`; Aegis/Vulcan verifies the signature chain and caveat context with zero extra permission lookups.

## Implementation Checklist

- [ ] Use `av_test_` in non-production and `av_live_` exclusively in production.
- [ ] Configure GitHub Secret Scanning or CI scanners for `av_live_` prefixes.
- [ ] Attenuate delegated worker tokens to minimum required scope and short expiration.

## Next Step

Federate enterprise IdPs via SAML 2.0 and SCIM 2.0 in [Autorix Hermes](/autorix/engines/hermes).
