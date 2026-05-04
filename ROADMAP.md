# upact roadmap

Last updated: 2026-05-04 (rev. 8: v0.1.2 shipped: Decision 12 closed, `@prefig/upact-mastodon` direct adapter for fediverse-flexibility deployments).

Open work for the v0.2 release window. Closed items are retained for institutional record.

## Posture (load-bearing for everything below)

upact is a self-binding contract for values-aligned platform builders. The privacy minima at the port — no email, no phone, no IP, opaque sessions, enumerated capabilities — are commitments the application has structurally given up the ability to violate. The architectural cost of later breaking the contract is what makes the commitment durable.

upact is not a replacement for OIDC clients (`auth.js`, `lucia`, `openid-client`), identity-broker IDPs (Authentik, Keycloak, ZITADEL), or identity protocols (DIDs, Verifiable Credentials). It is the typed-contract layer above them.

**Adapter strategy.** Path B (consuming upact via `@prefig/upact-oidc` brokered through Authentik / Keycloak / ZITADEL) is the default for OIDC-shaped enforcement substrates (Supabase, Auth0, Mastodon-as-fixed-instance, etc.) with stable per-deployment instance configuration. Substrates whose UX requires per-login instance flexibility (multi-instance fediverse, user-chosen instances) ship as direct adapters per Decision 12. Pre-conforming substrates (SimpleX, Reticulum) use direct adapters. This split is reflected in `docs/adapter-shapes.md`.

## Open

### Decision 3 — `issueRenewal` semantics normative

**Posture.** Supabase adapter renews the cookie holder (substrate-holder semantics); SimpleX adapter compares the freshly-read agentUserId against the prior `Upactor.id` and refuses renewal on mismatch (identity-bound semantics). Option A (identity-bound) is recommended per planning conversation — it is the more honest posture for a substrate where id stability is part of the contract.

**Status.** Deferred in `SPEC.md §12` (D3) until divergence between adapters becomes a concrete consumer issue. The §6.4 wording remains advisory.

### Decision 6 — `provenance` field on `Upactor`

`provenance: { substrate: string; instance?: string }` for cross-substrate disambiguation. Shipped with the OIDC adapter (Phase C); concrete consumer: cross-IDP discrimination in multi-IDP deployments. Open question: whether Supabase and SimpleX adapters should also populate provenance for parity.

### Decision 7 — `continuation` field on `Upactor`

`continuation: { prior_id: string; kind: 'rotation' | 'migration' | 'rekey' | 'reauth' }` for substrate-known identifier transitions. No shipped substrate currently emits transitions through the port. Reactivated when AP `Move`, SimpleX rotation, or similar arrives with a shipped adapter.

### Decision 8 — `watch` on `IdentityPort`

`IdentityPort.watch(context): AsyncIterable<Upactor | null>`. Push-shaped substrates need an adapter first; the streaming-primitive choice (AsyncIterable vs Observable vs callback) deferred until a concrete push substrate ships.

### v0.2 conformance test suite

**Posture.** A published conformance test suite (referenced in `SPEC.md §9` as "TBD") that adapter authors run to claim conformance mechanically. Currently only the sixteen-vector reflection test is standardised; the rest of the conformance bar is prose.

**Status.** Targeted for v0.2. Funding would accelerate this.

## Closed

### v0.1.2 (2026-05-04)

**Shipped.** `@prefig/upact-mastodon` direct Mastodon REST API adapter (separate package). Decision 12 closed; spec amendments to `SPEC.md §13`, `docs/adapter-shapes.md`, `docs/cross-adapter-findings.md`, and the Adapters table in this README.

---

### Decision 12 — Multi-instance fediverse exception to Path B

**Closed 2026-05-04.** Path B (the OIDC adapter brokered through an IDP) is the right answer for OIDC-shaped substrates with stable per-deployment instance configuration. It is the wrong answer for substrates whose UX requires per-login instance flexibility: each user picks their home instance at login time, and that instance is not knowable until the user types it. Mastodon and the rest of the fediverse fit this shape; Authentik's federation-source registration is per-instance and admin-mediated, which cannot be done at login time for an arbitrary instance.

The three deployment shapes:

| Deployment | Adapter | Why |
|---|---|---|
| App authenticates against ONE fixed instance (your-org.social) | `@prefig/upact-oidc` + Authentik with that instance preregistered | Path B works; smallest surface |
| App authenticates against ANY user-chosen Mastodon instance | `@prefig/upact-mastodon` (the direct adapter) | Path B's preregistration loop is incompatible with arbitrary-instance UX |
| App authenticates against a closed list of partner instances | Either; lean upact-oidc unless the partner list churns | Path B if list is stable; the direct adapter if list is dynamic |

`@prefig/upact-mastodon` is the first of this shape. A future `@prefig/upact-atproto` (Bluesky) adapter would also qualify: DID-based identity is portable across PDSes, and the per-login resolution path is even more inherent. Concrete consumer drove this Decision; the strategy nuance to ROADMAP line 13 makes the exception explicit so future adapter authors know where the line is.

---

### v0.1.1 (2026-05-01)

**Shipped.** OIDC adapter (Phase C), lifecycle + provenance spec amendments, Dex integration test suite.

---

### Phase C: `@prefig/upact-oidc` adapter

**Closed 2026-05-01.** Third reference adapter shipped: enforcement-camp, OIDC-shaped. `createOidcAdapter(config, cookies)` factory — closure-captured cookie jar, no enumerable substrate state. PKCE (S256) + authorization-code flow, signed-cookie state and session management, transparent refresh on expiry, HMAC-SHA256 signed cookies. Scope policy enforces `email`/`phone`/`address`/`groups` exclusion at construction time. 75 unit tests + 11 Dex integration tests. Permanent Dex dev rig at `upact-oidc-poc/`.

### Decision 9 (close) — `issueRenewal` normatively OPTIONAL

**Closed 2026-05-01.** See above; moved from Open.

### `lifecycle` + `provenance` on `Upactor` (v0.1.1 spec amendment)

**Closed 2026-05-01.** Optional `lifecycle?: IdentityLifecycle` and `provenance?: { substrate: string; instance?: string }` added to `Upactor`. `IdentityLifecycle = { expires_at?: Date; renewable: 'reauth' | 'represence' | 'never' }`. Purely additive — existing adapters continue to work without populating these fields. The OIDC adapter populates both. Normative text in `SPEC.md §4.4` and `§4.5`.

---

### v0.1.0 (2026-05-01)

**Shipped.** First public draft of spec and runtime. All items below were completed as part of the v0.1.0 release window.

---

### `Upactor` rename across the codebase

**Closed 2026-05-01.** `UserIdentity` → `Upactor` throughout: `SPEC.md`, `src/types.ts`, `src/index.ts`, both adapter packages (`src/adapter.ts`, `src/identity-mapper.ts`, tests). Deprecated alias `UserIdentity = Upactor` retained for v0.1.x compatibility; removed at v0.2. Method `currentIdentity` → `currentUpactor` on the port.

### Decision 4 — `AuthErrorCode` vocabulary normative in `§6.5`

**Closed 2026-05-01.** Six-member normative union: `credential_invalid`, `credential_rejected`, `substrate_unavailable`, `identity_unavailable`, `rate_limited`, `auth_failed`. Both reference adapters declare their mapping table in `CONFORMANCE.md`. Applications branch on `code` for substrate-portable error handling.

### Decision 11 — Adapter package back-channel closure (conformance bar)

**Closed 2026-05-01.** Normative text added to `SPEC.md §7.5`: conforming adapters MUST hold substrate state in closure scope (factory pattern) or `#private` fields, not on enumerable instance properties. `(adapter as any).client` MUST return `undefined`. Both reference adapters (upact-supabase, upact-simplex) retrofitted to factory-only; `SupabaseUpactAdapter` and `SimpleXUpactAdapter` class forms removed. Both ship sixteen-vector back-channel reflection tests at `tests/back-channel.test.ts`.

### `AI-Involvement` trailer convention

**Closed 2026-05-01.** Five-tier vocabulary documented in `CONTRIBUTING.md` and `ROADMAP.md`. Adopted across the prefig org for subsequent commits. Existing commits pre-convention carry no trailer; the convention start point is the v0.1.0 release.

### v0.1 SPEC authorship policy (relaxed)

**Closed 2026-05-01.** The earlier commitment to a hand-rewritten normative spec before public push was relaxed for v0.1. `SPEC.md`, `src/types.ts`, and the runtime kernel ship with `AI-Involvement: authored` or `collaborative` trailer disclosure. The transparency posture (disclosure replaces authorship-purity as the binding mechanism) is consistent with the project's own values.

### SPEC §6.2 amendment — `currentUpactor` throw permission

**Closed 2026-05-01.** Adapters MAY throw `SubstrateUnavailableError` (from `@prefig/upact`) when the substrate is unreachable, distinct from returning `null` when the user is not authenticated. Normative text in `SPEC.md §6.2`.

### Decision 2 — `currentIdentity` throw-vs-null contract

**Closed 2026-05-01 (option C).** Typed `SubstrateUnavailableError` for substrate-down, `null` for logged-out. Both distinctions needed for quality UX without substrate coupling.

### Decision 10 — Multi-step authentication flows at the port

**Closed 2026-05-01.** IDP delegation (Path B) resolves multi-step auth without growing the port. The OAuth dance happens at a substrate-side IDP; the upact adapter consumes terminal OIDC tokens. The port stays one-shot.

### Decision 1 — `OpaqueSubstrateSession._unwrap()` escape hatch

**Closed 2026-05-01.** Lifted into `@prefig/upact` as `createSession` + `_unwrapSession`. Both reference adapters use `createSession`. Sixteen-vector opacity suite centrally maintained in `tests/runtime.test.ts`.

### Decision 5 — Naming the central primitive

**Closed 2026-05-01.** `UserIdentity` → `Upactor`. Draws on the UML Actor lineage; coined word in the upact namespace; no external collisions; brand cohesion. Lower-case bare word — `Upactor`, not `UpActor`.
