---
title: 'feat: ship @prefig/upact-oidc v0.1 — generic OIDC adapter via IDP delegation'
type: feat
status: deferred
date: 2026-05-01
---

# feat: ship @prefig/upact-oidc v0.1

> **Status:** deferred to a follow-up session. Phase A+B (spec evolution + reference adapter retrofit + public push readiness for the three existing packages) is the immediate work, tracked in `2026-05-01-002-feat-upact-spec-evolution-and-adapter-retrofit-plan.md`. This plan picks up after Phase A+B has landed and the upact spec is at v0.1 publicly. No re-planning needed; the implementation reference below is self-contained.

## Target repos

- **`prefig/upact-oidc`** — local: `~/prefig/upact-oidc/` — **NEW package, this plan creates it.** Generic OIDC client adapter, validated against Dex (local dev) and prepared for Authentik (prod). Apache-2.0.
- **`prefig/upact-oidc-poc`** — local: `~/prefig/upact-oidc-poc/` — existing Dex POC. This plan stabilises it as the permanent dev rig.
- **`prefig/upact`** — local: `~/prefig/upact/` — spec amendments (bringing back lifecycle, provenance.instance, Decision 9 normative wording, F3, F6, G1) land here as the OIDC adapter's concrete needs surface.

## Overview

This plan ships `@prefig/upact-oidc` — the generic OIDC client adapter that delegates substrate-specific machinery to a substrate-side IDP (Authentik, Keycloak, ZITADEL, Dex). One adapter, many configured IDPs, substrate-specific machinery in IDP realm config rather than in adapter code.

**The Path B claim concretely.** When the substrate is OIDC-shaped (Authentik, Keycloak, ZITADEL; Mastodon-via-broker; Supabase Auth as upstream OAuth provider; GitHub/Google/Auth0 as upstream OAuth providers), one upact-oidc adapter replaces what would otherwise be N substrate-specific adapter packages. Adding a new substrate becomes a Keycloak/Authentik realm config change, not new adapter code.

**What this plan brings back to the spec.** Phase A+B trimmed `lifecycle`, `provenance`, F3, F6, G1, Decision 9 from the v0.1 spec because no shipped adapter or consumer needed them yet. The OIDC adapter is the consumer that needs them:

- `lifecycle.expires_at` from JWT `exp` claim (concrete need)
- `provenance.instance` for cross-IDP discrimination (concrete need when multi-IDP apps surface)
- `issueRenewal` OPTIONAL (some IDPs don't issue refresh tokens — concrete need)
- F3 (network-legible identifier pattern) — adapter holds issuer URL + sub for substrate-side calls
- F6 (lifecycle multiple shapes) — explicit TTL becomes meaningful
- G1 (OIDC scope discipline) — adapter enforces scope allow-list at runtime

These spec amendments land alongside the adapter, not before — that's the audit discipline applied honestly.

## Problem Frame

The Path B commitment was made in Phase A+B planning; this plan executes it. The architectural rationale lives in `~/prefig/upact/ROADMAP.md` Decision 10 (closed) and `~/prefig/upact/docs/cross-adapter-findings.md` F4.

**Why deferred from v0.1 public push.** Dyad's M1 (the immediate OSA-blocking work) needs only `@prefig/upact` + `@prefig/upact-supabase`. The OIDC adapter is M2 work; building it now would delay the v0.1 push without unblocking dyad. Phase A+B locks the contract enough that dyad's redesign can begin against it; Phase C ships the OIDC adapter in a follow-up session.

## Requirements Trace

- **R1.** `@prefig/upact-oidc` exports a `createOidcAdapter(config)` factory function returning an `IdentityPort` per `~/prefig/upact/SPEC.md` §6.
- **R2.** Adapter holds OIDC tokens in **closure-captured state**, not on enumerable instance properties (Decision 11 conformance per Phase A+B closure).
- **R3.** Adapter uses `openid-client@^6.8.0` as runtime dependency. `jose@^6.2.0` as transitive.
- **R4.** Adapter implements OIDC discovery with caching: 1-hour module-scoped TTL on the discovery document; default `jose` JWKS cache.
- **R5.** Adapter validates ID tokens fully: signature via JWKS, issuer match, audience match, expiry + clock skew (5s tolerance), nonce match (PKCE flow).
- **R6.** Adapter enforces **scope discipline at runtime**, not just convention. `validateScopes` rejects forbidden scopes (`email`, `phone`, `address`, `groups`).
- **R7.** Claims-mapping is **allow-list-based**: `mapClaimsToUpactor` reads only `sub`, optionally `preferred_username` or `name` (with email-shape rejection).
- **R8.** Adapter implements all four `IdentityPort` operations.
- **R9.** Adapter handles state during the OAuth round-trip via signed, HttpOnly, Secure, SameSite=Lax cookies at `/auth/callback` path scope.
- **R10.** Adapter declares capabilities **conditionally based on IDP discovery** — initially `[]` for v0.1 (audit-driven; expand when concrete consumers surface).
- **R11.** Adapter is unit-tested against a mock `OidcClient`; integration-tested against the local Dex instance.
- **R12.** Adapter README includes a §10 conformance statement.

### Spec amendments brought back by this adapter (R-SPEC)

- **R-SPEC-1.** Add `lifecycle: IdentityLifecycle` field back to `Upactor` in `~/prefig/upact/src/types.ts`. Shape: `{ expires_at?: Date; renewable: 'reauth' | 'represence' | 'never' }` (drop `issued_at` — the Phase A+B audit found no consumer for it).
- **R-SPEC-2.** Add `provenance: { substrate: string; instance?: string }` field to `Upactor`. The OIDC adapter sets `substrate: 'oidc'` and `instance: <issuer URL>`.
- **R-SPEC-3.** Decision 9 (`issueRenewal` OPTIONAL) closed normatively in SPEC §6.4.
- **R-SPEC-4.** F3 (network-legible vs port-opaque identifier) integrated into SPEC §7.
- **R-SPEC-5.** F6 (lifecycle modelling has multiple shapes) integrated into SPEC §8.
- **R-SPEC-6.** G1 (OIDC scope discipline) integrated into SPEC §10 conformance template.
- **R-SPEC-7.** OIDC error → `AuthError` mapping table integrated into adapter README + `cross-adapter-findings.md`.

## Scope Boundaries

**In scope:**
- The OIDC adapter at v0.1, validated against the local Dex POC and ready for Authentik in production
- The spec amendments listed above (R-SPEC-1 through R-SPEC-7), brought back as concrete need surfaces
- Stabilising `~/prefig/upact-oidc-poc/` as the permanent dev rig
- npm/JSR packaging for `@prefig/upact-oidc`
- SvelteKit-on-Dex example demonstrating dyad-shaped OIDC consumption
- README "Adopters" / "Examples" updates to add the OIDC path

**Out of scope:**
- Toolchain investments (`@prefig/upact-testing`, `eslint-plugin-upact`, etc.) — deferred to post-OSA / funded work
- Authentik production deployment guides (separate work; v0.2)
- DCR (Dynamic Client Registration), step-up auth, FAPI 2.0, DPoP — deferred to v0.2+
- Dyad's M2 swap to `@prefig/upact-oidc` — separate Dyad-internal plan
- Workers KV-backed JWKS cache — Cloudflare-deployment-specific; defer to when production deployments need it

## Context & Research

The full research that informs this plan is in the conversation arc 2026-05-01 (the agents that informed Phase A+B planning also covered OIDC adapter specifics). Key findings consolidated:

### Library choice — `openid-client` v6

`openid-client@^6.8.0` (Filip Skokan's mature library, v6 is Web-Crypto-first and edge-runtime compatible). `jose@^6.2.0` is transitive. Closer to the four `IdentityPort` operations than `oauth4webapi` (lower-level); ~half the code to wrap; same author so migrating to `oauth4webapi` later is mechanical if bundle size becomes a constraint. `arctic` rejected because it doesn't validate ID token signatures by default.

### ID token validation in edge runtimes

`jose`'s `createRemoteJWKSet` + `jwtVerify` is the recommended path. Both run on Web Crypto API only. JWKS caching: default `jose` behaviour (10 min `cacheMaxAge`, 30 s `cooldownDuration`, refetch on missing `kid`). Pass `clockTolerance: '5s'` for clock skew across edge.

### PKCE for confidential clients

OAuth 2.1 (stable January 2026) and RFC 9700 require PKCE for every authorization-code flow, including confidential clients. Use S256, never plain. Defense-in-depth against code injection.

### State management during redirect round-trip

Signed, HttpOnly, Secure, SameSite=Lax cookies for `state` + `code_verifier` + `nonce`, set when building authorize URL, read and immediately deleted in callback. SameSite=Lax (not Strict) required for IDP redirect-back to attach the cookie. Path-scope to `/auth/callback`. ~10 minute TTL.

### Refresh token handling

Pre-emptively refresh when `expires_in - now < 60s`. Authentik/Keycloak/ZITADEL rotate refresh tokens by default; Dex doesn't unless `enableRefreshTokenRotation: true`. Always replace stored refresh_token if the token endpoint returns a new one. Treat `invalid_grant` as session-end (don't retry).

### Dex-specific quirks

- Static client redirect URIs are exact-match (including trailing slashes)
- `offline_access` scope required to receive a refresh token
- Refresh token rotation is opt-in (set `enableRefreshTokenRotation: true`)
- `iss` is the broker (`http://localhost:5556/dex`), not the upstream — so the OIDC adapter sees consistent `iss` regardless of which upstream the user authenticated through
- `federated_claims` (Dex-specific custom claim) carries upstream connector_id and user_id — the adapter ignores these (privacy-relevant, crosses §7 boundary)

### IDP broker patterns (Mastodon-as-broker via Dex/Authentik)

When Dex/Authentik brokers to upstream Mastodon/GitHub/Google:
- The `iss` is the broker, not the upstream. The OIDC adapter sees a single consistent `iss`.
- The `sub` is broker-issued and stable.
- Optional broker-specific claims (e.g., Dex's `federated_claims`) leak through if scope allows; the adapter ignores them.
- The abstraction holds at the iss/sub layer; the adapter must be disciplined about which claims it reads.

### OIDC error → upact `AuthError` mapping

| OAuth/OIDC error | upact `AuthErrorCode` |
|---|---|
| `invalid_grant` | `credential_rejected` |
| `invalid_token` | `credential_invalid` |
| `invalid_client` / `invalid_request` / `unauthorized_client` / `unsupported_grant_type` | `auth_failed` (config error) |
| `access_denied` / `interaction_required` / `login_required` / `consent_required` | `credential_rejected` |
| `server_error` / 5xx / network | `substrate_unavailable` |
| `slow_down` / 429 | `rate_limited` |
| ID token signature fail / iss/aud mismatch / exp passed | `credential_invalid` |
| Discovery 404 / no JWKS | `identity_unavailable` |

### Scope discipline

- **Default scope:** `openid offline_access`
- **Optional scope:** `profile` (only if `display_hint` is wanted; brings `name` and `preferred_username`)
- **Forbidden scopes:** `email`, `phone`, `address`, `groups` — leak privacy-minima fields per upact §7

Enforcement is a **runtime guard** (`validateScopes`), not just documentation. Privacy-load-bearing constraint deserves runtime enforcement.

## Key Technical Decisions

### D-OIDC-1 — `openid-client` v6 as runtime dependency

`openid-client@^6.8.0`. `jose@^6.2.0` transitive. Rejected: `oauth4webapi` (too low-level for our need), `arctic` (no ID token validation by default).

### D-OIDC-2 — Factory function as primary export, class as escape hatch

`createOidcAdapter(config): IdentityPort` is the primary export. Class form `OidcUpactAdapter` exported as advanced-wiring escape hatch with `#private` substrate state.

### D-OIDC-3 — Two credential kinds for `authenticate`

```ts
type OidcCredential =
  | { kind: 'oidc-init'; returnTo?: string; promptMode?: 'login' | 'consent' | 'none' }
  | { kind: 'oidc-callback'; request: Request };
```

Init phase exposed via separate `buildAuthRedirect` adapter method (out of port). `authenticate` only takes `oidc-callback`.

### D-OIDC-4 — Signed cookies for state

HMAC-SHA256, HttpOnly, Secure, SameSite=Lax, `/auth/callback` path scope, 10-minute TTL.

### D-OIDC-5 — Closure-captured token state

Tokens (access, refresh, id) and discovery config in closure scope. `(adapter as any).accessToken === undefined` is the Decision 11 conformance signal.

### D-OIDC-6 — Scope discipline at runtime

`validateScopes()` exported function throws on forbidden scopes. Allow-list: `openid`, `offline_access`, `profile`. Default: `['openid', 'offline_access']`.

### D-OIDC-7 — Allow-list claims mapping

`mapClaimsToUpactor` reads only `sub`, optionally `preferred_username` or `name`. Hardcoded allow-list; explicitly does NOT read other claims.

### D-OIDC-8 — Identity-bound `issueRenewal` (Decision 3 Option A)

Adapter validates refreshed `sub` matches `identity.id`. Mismatch → `null`. No refresh token → `null` (Decision 9 OPTIONAL).

### D-OIDC-9 — `authenticate` only handles callback phase

The init phase (building authorize URL) is exposed via `buildAuthRedirect` adapter method, not through `IdentityPort.authenticate`. Keeps the port signature consistent across substrates.

## Open Questions

### Resolved during planning

- Library choice → `openid-client` v6
- Class or factory → both, factory primary
- Credential shape → tagged union with callback only on `authenticate`
- State management → signed cookies
- Scope policy enforcement → runtime guard
- DCR support → out of scope for v0.1

### Deferred to implementation

- Exact discovery cache eviction strategy → rely on `openid-client` defaults
- Workers KV-backed JWKS cache → defer to deployment need
- Mastodon-as-Dex-connector configuration in POC → optional, documented as commented-out block

## High-Level Technical Design

### OIDC adapter module layout

```
prefig/upact-oidc/
├── package.json              # Apache-2.0; peerDeps @prefig/upact ^0.1.0; dep openid-client ^6.8.0
├── tsconfig.json             # strict, ES2022, isolatedDeclarations
├── jsr.json                  # JSR manifest
├── README.md                 # usage + conformance statement
├── LICENSE
├── src/
│   ├── index.ts              # public exports
│   ├── adapter.ts            # createOidcAdapter factory + class
│   ├── client.ts             # OidcClient interface + default openid-client-backed implementation
│   ├── claims-mapper.ts      # mapClaimsToUpactor pure function
│   ├── capabilities.ts       # capabilitiesFromIDP function
│   ├── scope-policy.ts       # validateScopes guard
│   ├── state-cookies.ts      # signed cookie helpers
│   └── types.ts              # OidcConfig, OidcCredential, IDTokenClaims (allow-list)
└── tests/
    ├── adapter.test.ts
    ├── claims-mapper.test.ts
    ├── capabilities.test.ts
    ├── scope-policy.test.ts
    ├── state-cookies.test.ts
    ├── back-channel.test.ts  # 16-vector closure conformance
    └── integration/
        └── dex-flow.test.ts  # end-to-end against local Dex
```

### End-to-end flow (auth code with PKCE)

```
Application (SvelteKit handle hook)              upact-oidc adapter                      Dex IDP
─────────────────────────────────────            ─────────────────                     ─────────

GET /auth/login →
  url = locals.identity.buildAuthRedirect({       → discovery (cached 1h)
    returnTo: '/'                                 → randomState/PKCEverifier/nonce
  })                                             → set signed cookie {state, verifier, nonce}
                                                 → buildAuthorizationUrl(...)
                                          ←── '...'
  Response.redirect(url, 302) ────────── → Dex /auth → user signs in → Dex callback ──→
                                                                                                ↓
GET /auth/callback?code=...&state=...            
  session = locals.identity.authenticate({       → read & delete signed cookie
    kind: 'oidc-callback', request                → authorizationCodeGrant with PKCE
  })                                             → validate ID token (jose, JWKS, iss/aud/exp/nonce)
                                                 → mapClaimsToUpactor (allow-list)
                                                 → store {access, refresh, id, expires_at} in closure
                                                 → createSession({...tokens})
                                          ←── Session

(later request)
  user = locals.identity.currentUpactor(request)  → re-validate cached ID token (microseconds)
                                                 → if expired and refresh present: issueRenewal
                                                 → mapClaimsToUpactor
                                          ←── Upactor | null

GET /auth/logout
  url = locals.identity.buildLogoutRedirect()    → buildEndSessionUrl with id_token_hint
                                                 → clear closure tokens
                                          ←── logout URL
  Response.redirect(url, 302) ──────────── → Dex /logout → user is logged out
```

## Implementation Units

This plan's implementation units are preserved in detail. When picked up in a follow-up session, execute in order.

- [ ] **Unit 1: Repo scaffold for `@prefig/upact-oidc`** — `package.json`, `tsconfig.json`, `jsr.json`, `.gitignore`, `README.md`, `LICENSE`, `src/index.ts`, `vitest.config.ts`. Mirror upact-simplex pattern. Add `isolatedDeclarations: true` for JSR readiness.

- [ ] **Unit 2: `OidcClient` interface + types** — `src/types.ts` (OidcConfig, OidcCredential, IDTokenClaims allow-list, OidcSessionState); `src/client.ts` (OidcClient interface; default `OpenIdClientBacked` implementation wrapping `openid-client`'s 7 functions: discovery, buildAuthorizationUrl, authorizationCodeGrant, refreshTokenGrant, fetchUserInfo, buildEndSessionUrl, randomState/randomPKCECodeVerifier/calculatePKCECodeChallenge).

- [ ] **Unit 3: `mapClaimsToUpactor` (claims allow-list mapper, test-first)** — Pure function `IDTokenClaims + issuer → Upactor`. id = `sha256(sub + '@' + issuer)` truncated 32 hex. display_hint = preferred_username/name with email-shape rejection. capabilities = []. lifecycle = `{ expires_at: claims.exp, renewable: 'reauth' }`. provenance = `{ substrate: 'oidc', instance: issuer }`. Privacy-stripping tests are exhaustive.

- [ ] **Unit 4: `capabilitiesFromIDP` capability derivation** — Pure function returning `[]` for v0.1 (audit Option 2 for OIDC: no consumer yet). Future: conditional on discovery advertising specific endpoints.

- [ ] **Unit 5: `validateScopes` runtime scope guard** — Throws on forbidden scopes (`email`, `phone`, `address`, `groups`). Allow-list: `openid`, `offline_access`, `profile`. Default `DEFAULT_SCOPES = ['openid', 'offline_access']`. Error message cites upact §7.

- [ ] **Unit 6: Signed-cookie state helpers** — HMAC-SHA256 via Web Crypto. `signState`/`unsignState` for `PendingState` (state, code_verifier, nonce, returnTo). 10-min TTL. Tampered/expired cookies return null.

- [ ] **Unit 7: `createOidcAdapter` factory — `authenticate` (callback phase)** — Closure-captured token state. `authenticate({ kind: 'oidc-callback', request })`: read & delete cookie → `client.exchangeCode` (with PKCE verifier, expected state, expected nonce) → `mapClaimsToUpactor` → `createSession` → return Session. Error mapping per the table above. `buildAuthRedirect` (adapter method, out-of-port) handles init phase.

- [ ] **Unit 8: `currentUpactor` (fast path) + `invalidate`** — `currentUpactor`: re-validate cached ID token via `jose.jwtVerify` (microseconds on warm isolate); transparent renewal if expired; throws `SubstrateUnavailableError` on JWKS/discovery/network failure. `invalidate`: clear closure tokens; `buildLogoutRedirect` (out-of-port) builds end-session URL.

- [ ] **Unit 9: `issueRenewal`** — Identity-bound (Decision 3 Option A). No refresh token → `null` (Decision 9). `invalid_grant` → `null`, clear closure. Sub mismatch → `null`. Otherwise refresh tokens, validate new ID token, return refreshed Upactor.

- [ ] **Unit 10: Decision 11 closure-conformance vector test** — 16-vector opacity audit applied to adapter instance. JSON.stringify, Object.keys, Reflect.ownKeys, structuredClone, util.inspect, direct property access — all assert no token leak. Sentinel substrings.

- [ ] **Unit 11: README and conformance statement** — Public exports finalized. README with §10 conformance: spec version, capabilities `[]`, substrate (any OIDC-compliant IDP), threat model, scope policy, lifecycle (`expires_at` from JWT exp, `renewable: 'reauth'`), per-user-session binding, no SHOULD-clause deviations.

- [ ] **Unit 12: Integration test against local Dex** — `tests/integration/dex-flow.test.ts` mirrors `~/prefig/upact-oidc-poc/smoke-test.sh`. Skipped when `DEX_AVAILABLE` env not set. Full flow: discovery → token (ROPC for testing) → ID token validation → claims mapping → privacy-stripping assertions → refresh → logout.

- [ ] **Unit 17: Stabilise `~/prefig/upact-oidc-poc/` as permanent dev rig** — `oauth2.pkce.enforce: true`, `pkce.codeChallengeMethodsSupported: ['S256']`, `expiry.refreshTokens.enableRefreshTokenRotation: true`, ROPC documented as test-only. Pin Dex version. README explaining the POC.

- [ ] **Unit 18 (bring-back): Add lifecycle and provenance back to upact spec** — In `~/prefig/upact/`:
  - Modify `src/types.ts`: add `IdentityLifecycle` type back; add `lifecycle` and `provenance` fields to `Upactor`; export.
  - Modify `src/index.ts`: re-export `IdentityLifecycle`.
  - Modify `SPEC.md`: §4 Upactor includes lifecycle and provenance; §6.4 issueRenewal OPTIONAL normative (Decision 9 closure); §7 F3 amendment (network-legible vs port-opaque); §8 lifecycle multiple shapes (F6); §10 OIDC scope discipline note (G1); §12 update deferral statuses.
  - Update existing adapters (upact-supabase, upact-simplex) to populate lifecycle and provenance fields when they ship updates.

- [ ] **Unit 19: npm/JSR packaging prep for `@prefig/upact-oidc`** — Same prep as Phase A+B Units 5/6 (in `2026-05-01-002-...-plan.md`). peerDep `@prefig/upact ^0.1.0` (or `^0.2.0` if spec amendments forced a minor bump), peerDep `openid-client`, devDeps mirror.

- [ ] **Unit 21: SvelteKit-on-Dex example** — `~/prefig/upact/examples/sveltekit-oidc/`. Minimal SvelteKit app demonstrating end-to-end consumption against local Dex. Login → callback → identity-bound page → logout. Companion to the Phase B SvelteKit-on-Supabase example.

- [ ] **Unit 22: README updates** — Add the OIDC path to Adopters / Examples. Update ROADMAP with Phase C closure milestone.

## System-Wide Impact

- **Interaction graph.** OIDC adapter calls IDP via `openid-client`; SvelteKit handle hook constructs adapter per-request; Dex/Authentik on substrate side. No background workers.
- **Error propagation.** `SubstrateUnavailableError` from `currentUpactor` on JWKS/discovery/network failure. `AuthError` from `authenticate` per the OIDC error mapping. `null` from `issueRenewal` for renewal-not-supported or identity-mismatch.
- **State lifecycle.** Tokens in closure; not persisted across deployments unless consumer adds it. No reading via reflection.
- **API surface parity.** Same `IdentityPort` shape as upact-supabase, upact-simplex. Decision 11 conformance uniform across all four packages by end of Phase C.
- **Spec evolution.** Phase C brings back lifecycle, provenance, F3, F6, G1, Decision 9 normative wording — driven by concrete OIDC adapter need.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| Dependency on Phase A+B having shipped | This plan picks up after Phase A+B is complete; can re-anchor if Phase A+B amendments shift |
| `openid-client` v6 API changes | Pin `^6.8.0`; v7 is next major; revisit at v0.2 |
| Dex POC config drift | Pin Dex version; POC README documents canonical config |
| Authentik production differs from Dex | v0.1 validates Dex only; flag Authentik as v0.2; document differences in cross-adapter-findings as they surface |
| Edge runtime quirks (Cloudflare Workers) | Vitest defaults run Node + Bun; add edge-runtime smoke test in v0.2 if deployment surfaces issues |
| Spec amendments in Unit 18 ripple to existing adapters | Existing adapters get follow-up commits to populate the new fields; deprecated trailing aliases minimize breaking change scope |

## Sources & References

- Phase A+B plan: `~/prefig/upact/docs/plans/2026-05-01-002-feat-upact-spec-evolution-and-adapter-retrofit-plan.md`
- Roadmap: `~/prefig/upact/ROADMAP.md`
- Cross-adapter findings: `~/prefig/upact/docs/cross-adapter-findings.md`
- Adapter shapes: `~/prefig/upact/docs/adapter-shapes.md`
- Dex POC: `~/prefig/upact-oidc-poc/`
- External: [openid-client v6](https://github.com/panva/openid-client), [jose v6](https://github.com/panva/jose), [Dex IDP docs](https://dexidp.io/docs/), [Authentik docs](https://docs.goauthentik.io/), [PKCE for OAuth 2.1](https://oauth.net/2/pkce/).
