---
title: Autorix Hermes — SAML 2.0 & SCIM 2.0 Federation
navTitle: Hermes (SAML & SCIM)
description: Enterprise identity federation bridge connecting Okta, Microsoft Entra ID, Google Workspace, and PingIdentity to Autorix via SAML 2.0 Web SSO and SCIM 2.0 directory sync.
section: engines
order: 7
ports: "4477"
protocol: "REST / XML"
---

**Autorix Hermes** connects external enterprise Identity Providers (**Okta**, **Microsoft Entra ID / Azure AD**, **Google Workspace**, **PingIdentity**) to the Autorix suite using **SAML 2.0 Web SSO** and **SCIM 2.0** (RFC 7643 / RFC 7644) automated directory provisioning.

## Quick Path: Connect an Enterprise IdP

1. Ensure Hermes is running on port `4477` (`--profile extended` in local Compose).
2. Download Hermes's Service Provider (SP) metadata XML:
   ```bash
   curl -fsS http://localhost:4477/saml/metadata -o hermes-sp-metadata.xml
   ```
3. In your IdP (e.g., Okta or Entra ID), create a SAML 2.0 application using the SP Entity ID and Assertion Consumer Service (ACS) URL from the metadata.
4. Register the IdP SSO URL, X.509 signing certificate, and attribute mappings via `POST /admin/saml/providers`.
5. Initiate federated sign-in via `GET /saml/login?provider={id}`.

## Architecture & Sync Pipeline

Hermes acts as a SAML 2.0 Service Provider—generating signed `AuthnRequest` XML messages and validating incoming `SAMLResponse` assertions at its ACS endpoint—while simultaneously serving SCIM 2.0 directory webhooks:

- **User provisioning**: Incoming SCIM `/Users` operations upsert identities and dynamic traits in **Autorix Ego**.
- **Group authorization**: Incoming SCIM `/Groups` memberships map into **Autorix Nexus** relation tuples (`group:<name>#member@user:<id>`).

## API Reference (`:4477`)

### SAML 2.0 Single Sign-On

| Operation | Endpoint | Description |
| :--- | :--- | :--- |
| SP Metadata | `GET /saml/metadata` | XML Service Provider descriptor for IdP import |
| Initiate SSO | `GET /saml/login?provider={id}` | Builds `AuthnRequest` and redirects user to IdP |
| ACS Callback | `POST /saml/acs` | Validates signed `SAMLResponse` assertion and establishes session |

### Provider Administration (Internal)

- `POST /admin/saml/providers` — Register a SAML 2.0 IdP with certificate and attribute mapping
- `GET /admin/saml/providers`, `PATCH /admin/saml/providers/{id}`, `DELETE /admin/saml/providers/{id}` — List, update, enable/disable, or delete providers

### SCIM 2.0 Directory Synchronization

- `GET /scim/v2/ServiceProviderConfig` — SCIM capability discovery
- `GET / POST / PUT / PATCH / DELETE /scim/v2/Users` — Automated user onboarding and offboarding
- `GET / POST / PUT / PATCH / DELETE /scim/v2/Groups` — Automated group membership sync
- `GET /admin/scim/sync-history` — Inspect historical SCIM webhook deliveries and sync outcomes

## Implementation Checklist

- [ ] Export SP metadata from `GET /saml/metadata` and register ACS URL in your enterprise IdP.
- [ ] Upload the IdP's X.509 signing certificate and map `email`, `name`, and `groups` assertions.
- [ ] Enable SCIM 2.0 bearer token provisioning in your IdP for automatic deprovisioning when employees leave.
- [ ] Review sync logs in Console's **Enterprise Studio** (`/enterprise`).

## Next Step

Govern your entire cluster and cryptographic audit trail with [Autorix Argus](/autorix/control-plane/argus).
