# Cross-adapter findings

Substrate observations that informed upact's spec text, surfaced during cross-adapter validation work. Each finding cites the context that produced it and notes whether it lands as a Decision, a clarification for the manual SPEC pass, or guidance for adapter authors.

## How to read this

These are observations and patterns derived from working through multiple substrates (Supabase, SimpleX, and the Mastodon-as-OIDC analysis that motivated the Path B IDP-delegation architecture). Findings are classified by where they land:

- **Decision-register-relevant**: should land as a closed Decision or evidence appended to an existing open Decision in `SPEC.md` §12.
- **Spec-relevant**: clarification or amendment for the manual `SPEC.md` revision pass.
- **Adapter-author guidance**: recommended pattern, not normative spec text.

## F1. Capability vocabulary minimum-viable principle

**Observation.** Mastodon (via ActivityPub) supports a rich set of affordances: posting, following, DMs, boosting, lists, filters, content warnings. Mapped through upact, only `messaging` (DMs) maps to the existing capability vocabulary. Every other Mastodon affordance is either substrate-specific (no upact equivalent) or a different layer entirely.

**Generalisation to OIDC.** OIDC's scope/claim vocabulary is much richer than upact's capability vocabulary. An OIDC adapter for any provider (Auth0, Clerk, Keycloak-brokered, Authentik) faces the same anemia. The OIDC adapter should *not* grow upact capabilities to match OIDC scopes; capability *absence* is the feature, not a gap to fill.

**The principle.** upact's capability vocabulary is intentionally minimal and stable. Adapter authors do not expand it to fit substrate-rich capability sets. The constraint is what binds; growth defeats the purpose.

**Classification.** Spec-relevant (§5 capabilities note); Decision 11 evidence (binding-mechanism through vocabulary stability).

## F2. Per-user-session adapter binding shape (third pattern)

**Observation.** The adapter pattern that fits Mastodon (and OIDC adapters generally) is *per-user-session*: one adapter constructed per authenticated user, with the user's tokens captured at construction. This is neither the request-bound shape of `@prefig/upact-supabase` (cookies bind the request to a SupabaseClient) nor the process-bound shape of `@prefig/upact-simplex` (the local daemon holds one active user globally).

**Generalisation.** Three substrate-binding shapes are now empirically observed:

| Shape | Substrate examples | When it fits |
|---|---|---|
| Request-bound | Supabase (cookies), session-bound auth | Request carries the binding (cookie, header, JWT in cookie) |
| Process-bound | SimpleX (local daemon), single-tenant local-state systems | Substrate has process-global active user; one adapter per process |
| Per-user-session | OIDC providers, Mastodon, Auth0, Clerk-brokered, IDP-mediated substrates | Each authenticated user has their own token; one adapter per user |

The Supabase request-bound shape is actually the special case (the cookie binds request → user implicitly); per-user-session is the dominant shape for enforcement-camp adapters.

**Classification.** Spec-relevant (`docs/adapter-shapes.md` should enumerate the three binding shapes and note which substrates fit which); Decision 11 evidence (binding-shape consistency across adapters is part of the conformance bar).

## F3. Network-legible identifier vs port-opaque identifier

**Observation.** Adapters often need the legible substrate handle for substrate-side calls, while the Upactor's `id` is opaque per upact §7.3. Examples:

- The Mastodon adapter holds the actor URL (`https://mastodon.social/users/alice`) for any `verify_credentials` or `oauth/revoke` call. The Upactor exposes only `sha256(actorUrl).slice(0, 32)`.
- An OIDC adapter holds `sub` + issuer URL for token refresh and userinfo calls. The Upactor exposes only the hashed identifier.
- Supabase's adapter holds the `User.id` for substrate-side admin lookups. The Upactor exposes only the hashed form.

The legible identifier is *adapter-internal*. The opacity guarantee is at the *port boundary*. Adapter authors who need the legible form for substrate-side operations keep it inside the adapter and never surface it through the port.

**The principle.** Apps that need network-legible handles for cross-substrate operations (e.g., a SvelteKit app that wants to deeplink to a Mastodon profile after the user authenticates via Mastodon) can't get them through the Upactor. They get them either by accepting the substrate-coupling explicitly (importing the substrate library directly) or via an *adapter-internal helper*: a function exposed alongside the adapter that takes an Upactor and returns the legible substrate handle.

The adapter-internal helper is not part of the IdentityPort. Calling it is the application's explicit acknowledgement that it's stepping outside the port for a substrate-specific operation. The fact that the helper exists does not violate the port; surfacing the legible handle *through* the Upactor would.

**Classification.** Spec-relevant (§7 amendment clarifying port-level vs adapter-internal identifiers); adapter-author guidance (recommended pattern for adapter packages).

## F4. Multi-step authentication flows resolved by IDP delegation, not port change

**Observation.** OAuth flows, magic links, email verification, and other multi-step authentication patterns don't fit upact's one-shot `authenticate(credential)` signature. The conversation arc that surfaced this initially considered growing the port surface: a flow-aware variant of `authenticate` returning `Session | AuthError | FlowStep`, or new `beginFlow` / `completeFlow` operations.

The architectural pivot to **Path B (IDP delegation)** resolved this without growing the port. Under Path B, an OIDC-shaped substrate (Mastodon, Supabase OAuth, GitHub, Auth0, etc.) is brokered through a substrate-side IDP (Authentik, Keycloak, ZITADEL). The IDP handles the multi-step machinery; the adapter consumes the IDP's terminal OIDC tokens. The port stays one-shot.

**Generalisation.** When the substrate is OIDC-shaped, the port consumes terminal OIDC tokens, never participates in the OAuth dance. The flow-aware port operation that would otherwise be needed is unnecessary because the IDP exists at a different architectural layer.

**Classification.** Roadmap: Decision 10 closed without port shape change.

## F6. Lifecycle modelling has multiple shapes

**Observation.** Mastodon access tokens do not auto-expire (per docs.joinmastodon.org/api/oauth-tokens: *"tokens will not expire automatically and will become invalid only when deleted by a user or revoked by the app"*). The Mastodon adapter's `lifecycle.expires_at` is therefore `undefined`, distinct from a TTL of zero or an unset-by-oversight `undefined`.

OIDC tokens have an explicit `exp` claim and map naturally to `lifecycle.expires_at`. Convene's encounter identities have `'represence'` rotation. Reticulum's Destination Hashes never expire. Four distinct lifecycle shapes across the substrates currently in scope:

| Pattern | Example | `expires_at` | `renewable` |
|---|---|---|---|
| Explicit TTL | OIDC, Supabase session | concrete timestamp | `'reauth'` |
| No intrinsic TTL | Mastodon OAuth tokens | `undefined` | `'reauth'` (require new flow if revoked) |
| Per-encounter rotation | Convene `'represence'` | concrete timestamp; id rotates on renewal | `'represence'` |
| Never expires | Reticulum Destination Hash | unset | `'never'` (or `'reauth'` only if user rotates keys) |

**Classification.** Spec-relevant: `SPEC.md` §8 (lifecycle) should enumerate these shapes explicitly. The current text under-documents the meaning of `expires_at: undefined` vs unset.

## G1. Minimum-scope request principle for OIDC adapters

**Observation.** Mastodon 4.3+ defines a `profile` scope that grants access only to `verify_credentials` (RFC 8414 metadata discovery available). Pre-4.3 instances need broader scopes (`read:accounts`). The adapter requests the minimum scope set the substrate offers for identity-only access.

**Generalisation to OIDC.** OIDC adapters request scope sets that determine which claims the IdP returns. The privacy-minima discipline translates directly: the OIDC adapter SHOULD request the **minimum scope set** needed to populate the Upactor: typically `openid` only, or `openid profile` for `display_hint`. The adapter SHOULD NOT request `email` even when the IdP offers it; that scope's absence in the request is part of the binding contract.

If an application later wants email for some substrate-specific use, it imports the substrate library directly (transparent coupling, visible in `package.json`). It does not get email through upact.

**The principle.** The OIDC adapter's scope request policy is one of the most concrete expressions of the binding posture: what scopes the adapter requests determines what claims it could surface. Requesting less is a structural commitment that surfacing more becomes architecturally costly.

**Classification.** Implemented: `@prefig/upact-oidc` v0.1.0 enforces this at construction time: `email`, `phone`, `address`, and `groups` scopes throw immediately. Default scopes: `['openid', 'offline_access']`. Spec-relevant note in conformance statement template (§10) recommending that OIDC-based adapters declare their scope policy.

## G2. OIDC error classification: substrate error strings to `AuthErrorCode`

**Observation (from `@prefig/upact-oidc` v0.1.0 implementation).** OIDC error strings are not cleanly orthogonal to upact's six-member error vocabulary. The mapping that shipped:

| Substrate error pattern | `AuthErrorCode` |
|---|---|
| `invalid_grant`, `access_denied`, `interaction_required` | `credential_rejected` |
| `invalid_token`, `invalid_client`, `invalid_request` | `credential_invalid` |
| `server_error`, network/fetch/ECONNREFUSED | `substrate_unavailable` |
| `slow_down`, rate-limit, 429 | `rate_limited` |
| Discovery failure, IDP not found | `identity_unavailable` |
| Any other error | `auth_failed` |

Key tension: `invalid_grant` (refresh token expired) maps to `credential_rejected`, not `credential_invalid`. The distinction: `credential_rejected` means the credential was understood but refused (expired or revoked grant), while `credential_invalid` means it was malformed or unrecognisable. This matches SPEC §6.5 intent.

**Classification.** Adapter-author guidance for any OIDC-shaped adapter. The mapping table is in `@prefig/upact-oidc/CONFORMANCE.md`.

## H1. Empirical confirmation of F1, F2, F3, F6, G1 (2026-05-04)

**Observation.** Findings F1 (capability minimality), F2 (per-user-session binding shape), F3 (network-legible vs port-opaque identifier), F6 (lifecycle multiple shapes), and G1 (minimum-scope discipline) were originally derived from Mastodon-as-analysis during the 2026-05-01 design conversation. With the shipped `@prefig/upact-mastodon` v0.1.0 adapter (Decision 12), each finding now has empirical confirmation in production code, not just analysis:

- **F1 confirmed:** `@prefig/upact-mastodon` ships `capabilities: []`. ActivityPub messaging affordances are real but no consumer gates on a `messaging` capability check; the adapter does not declare it.
- **F2 confirmed:** the per-user-session binding shape is the dominant shape for enforcement-camp adapters with per-user OAuth tokens. Now empirically observed in two shipped adapters (`@prefig/upact-oidc` and `@prefig/upact-mastodon`), not just predicted.
- **F3 confirmed:** `@prefig/upact-mastodon` holds the actor URL (`https://hachyderm.io/users/alice`) in closure for substrate-side calls; the Upactor exposes only `sha256(actor.url).slice(0, 32)`. The 16-vector reflection test asserts the actor URL is unreachable through any common reflection vector.
- **F6 confirmed:** Mastodon access tokens never auto-expire. `lifecycle.expires_at: undefined`, `renewable: 'reauth'` is the explicit representation, distinct from "TTL of zero" or "unset by oversight."
- **G1 confirmed:** `validateScopes` is a runtime guard that throws at construction time on any scope outside the allow-list `['read:accounts', 'profile']`. Default scopes are `['read:accounts']`. The adapter's `CONFORMANCE.md` documents this as the operational form of the privacy-minima discipline.

A future ATProto / Bluesky adapter would re-test the same findings against a different identifier shape (DIDs), different discovery (PLC directory), and a different lifecycle (rotating refresh tokens with DPoP). It would also be the first concrete consumer of the deferred Decision 7 (`continuation`), since DID-based identity is portable across PDS migration.

**Classification.** Confirmation note (no spec change). Recorded for the institutional record.

## F7. Authentication is not admission (open- vs closed-enrolment substrates)

**Observation.** Building the ATProto adapter in dyad forced a distinction the port currently blurs. An ATProto credential proves control of a DID, but *anyone* on the network has one, so authenticating says nothing about whether the person may enter this application. The adapter had to gate `establish` on a separate, app-held durable grant (an `identity_scopes` row); a verified sign-in with no grant is rejected. This is unlike the closed-enrolment substrates the port was first shaped around (e.g. an in-person-issued represence credential), where possession of the credential *is* the admission because the community issued it.

**Generalisation.** Substrates split into two enrolment classes, and it is orthogonal to the binding-shape and lifecycle taxonomies already recorded:
- **Closed enrolment** (represence, invite-issued): authentication implies admission. The provider is the admission authority; its `scope` legitimately asserts access.
- **Open enrolment** (ATProto, most OIDC/social IdPs): authentication is universal. Admission is a separate fact the *application* owns; the provider must not be trusted to assert access.

The `IdentityProvider.scope` field encodes "what a session from this provider grants," which quietly assumes the closed-enrolment model. For open substrates that field is at best a default and at worst misleading: it should name what the credential is *for*, not what the holder is *entitled to*.

**Classification.** Spec-relevant (§ on the provider contract / `scope` semantics) + adapter-author guidance. Recommend `adapter-shapes.md` gain an enrolment-class column, and CONFORMANCE prose stating that open-enrolment adapters must not treat authentication as admission.

## F8. A resolved session must re-validate authorization against durable state, not the credential

**Observation.** This one came out of a red-team pass, from a real (pre-ship) vulnerability. dyad's provider `ScopeSession` bundles the scope into the session and is carried in a signed cookie with a multi-day life. The first implementation trusted the scope *from the credential* when authorizing downstream (it minted the data-layer claim from the session's asserted scope). Result: revoking the durable grant had no effect until the cookie expired, because nothing on the request path re-checked the grant. The fix was to re-read the durable grant on every request and derive authorization from that, intersected with the credential's scope.

**Generalisation.** The port conflates two lifetimes that revocation forces apart: *credential validity* (is this a genuine, unexpired session?) and *current authorization* (is this identity still admitted, right now?). `resolveSession` returning a `ScopeSession` reads as "here is a valid session with these scopes," which invites an adapter author to trust the scope as live. Any substrate whose credential outlives a single request (cookies, refresh tokens, long-lived bearer tokens) is exposed to this: revocation latency bounded by credential TTL, not by the revocation event.

**Classification.** Spec-relevant + CONFORMANCE. The contract for `resolveSession` (and for whatever consumes its scopes) should state normatively that a session's *authorization* must be validated against durable state per request; the credential attests identity and freshness, never standing entitlement. Worth a Decision: does `ScopeSession` even belong to the port, or should the port return identity + credential-validity and leave scope/authorization to the application layer? The bug is structural evidence for splitting them.

## F9. The port is only half of adopting a non-native provider; the authZ bridge is the other half

**Observation.** upact correctly disclaims data access ("upact does not abstract data access ... RLS remains substrate-coupled by design"). But the actual work and the actual vulnerability in adding ATProto to a Supabase-backed app were *not* in authentication (the port) — they were in getting a non-Supabase-Auth identity to authorize under Supabase RLS. That took a separate claim-injection seam: mint a short-lived JWT carrying the identity + scopes that PostgREST/RLS honour, plus a `current_user_id()` wrapper that reads the claim before falling back to `auth.uid()`. Without it, a provider identity can authenticate but can do nothing.

**Generalisation.** For any app whose data layer authorizes on the native auth substrate's identity (Supabase RLS on `auth.uid()`, and analogues), adopting a upact provider from a *different* substrate is impossible on the port alone. There is a predictable companion component — an authorization bridge from "upact resolved identity X" to "the data layer authorizes as X" — that every such adopter must build. It is out of upact's charter to *provide*, but leaving it entirely unmentioned strands adopters at the exact cliff where they hit the port's boundary.

**Classification.** Spec-relevant (a boundary note) + docs. Recommend upact's docs point at the pattern (dyad's is extractable as a sibling library, working name `supabase-rls-claims`) so adopters know the port is authentication and the bridge is authorization, and that the second is theirs to build. Explicitly *not* a `upact-*` package — pairing it under the identity contract is what caused naming confusion in the dyad build.

## F10. Account-less identity leaves the "authenticated but not yet onboarded" state undefined

**Observation.** The Upactor is account-less by design, but real applications have an account/profile concept. dyad's native (Supabase) users get a profile atomically at signup (a DB trigger), so the app-wide invariant "authenticated ⇒ has a profile" held everywhere and was silently assumed by every handler. A provider identity is the first case that can be authenticated with *no* profile, which broke that assumption until it was re-established at a single gate.

**Generalisation.** Adopting any upact provider introduces an intermediate state — admitted and authenticated, but not yet a local account — that the account-native path never produced. Apps must (a) recognise the state exists and (b) enforce account creation at one chokepoint, or every downstream handler inherits a new null-account case. This is not upact's to solve (it is deliberately account-agnostic), but it is a predictable consequence of adopting the port that adapter-author guidance should name.

**Classification.** Adapter-author guidance. Recommend a short "deferred account creation" pattern note: the port gives you identity, not an account; handle the gap at one gate, not per-handler.

## F11. Decision 7 (`continuation`) worked example: DID identity survives host migration

**Observation.** The ATProto adapter is the first shipped consumer of the deferred Decision 7. Member id is derived as `SHA-256(did)[:32]`, which is stable across PDS migration because the DID is the durable anchor and the PDS is only its current host. This is strictly better than the Mastodon adapter's per-instance actor-URL id (F3), which does not survive an instance move. Concrete data point: a stable, opaque, host-independent id from an open substrate is achievable, and the derivation is a plain hash of the portable identifier.

**Classification.** Decision-register evidence for Decision 7. `adapter-shapes.md`'s reserved ATProto row can now be filled from shipped code rather than predicted.

## Sources

- **Conversation arc:** 2026-05-01 spec design discussion (covering the move from direct-adapter to IDP-delegation, the self-binding posture, and the cross-substrate spec stress test).
- **Cross-adapter ce:review:** May 2026 review across upact + upact-supabase + upact-simplex that opened Decisions 3, 4, 6, 7, 8, 9.
- **Decision 12 closure (2026-05-04):** the multi-instance fediverse exception to Path B (closed in `SPEC.md` §12; deployment-shape table in `docs/adapter-shapes.md`). The shipped `@prefig/upact-mastodon` adapter is the empirical confirmation of F1–G1 above.
- **ATProto provider build + Supabase auth cutover in dyad (2026-07-14):** F7–F11. First open-enrolment substrate taken to a working sign-in/join/onboarding flow, plus a full cutover making Supabase Auth one provider among several. F8 came from a red-team pass that found and fixed a real revocation-latency vulnerability before ship. Branch `atproto-provider` (dyad-berlin/dyad PR #115). See also the extraction map in `~/prefig/docs/dyad/research/2026-07-13-atproto-experiment-design.md`.
