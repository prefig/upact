# Cross-adapter findings

Substrate observations that informed upact's spec text and roadmap, surfaced during cross-adapter validation work. Each finding cites the context that produced it and notes whether it lands as a roadmap Decision, a clarification for the manual SPEC pass, or guidance for adapter authors.

## How to read this

These are observations and patterns derived from working through multiple substrates (Supabase, SimpleX, and the Mastodon-as-OIDC analysis that motivated the Path B IDP-delegation architecture). Findings are classified by where they land:

- **Roadmap-relevant** — should land as a closed Decision or evidence appended to an existing open Decision in `ROADMAP.md`.
- **Spec-relevant** — clarification or amendment for the manual `SPEC.md` revision pass.
- **Adapter-author guidance** — recommended pattern, not normative spec text.

## F1. Capability vocabulary minimum-viable principle

**Observation.** Mastodon (via ActivityPub) supports a rich set of affordances — posting, following, DMs, boosting, lists, filters, content warnings. Mapped through upact, only `messaging` (DMs) maps to the existing capability vocabulary. Every other Mastodon affordance is either substrate-specific (no upact equivalent) or a different layer entirely.

**Generalisation to OIDC.** OIDC's scope/claim vocabulary is much richer than upact's capability vocabulary. An OIDC adapter for any provider (Auth0, Clerk, Keycloak-brokered, Authentik) faces the same anemia. The OIDC adapter should *not* grow upact capabilities to match OIDC scopes — capability *absence* is the feature, not a gap to fill.

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

**The principle.** Apps that need network-legible handles for cross-substrate operations (e.g., a SvelteKit app that wants to deeplink to a Mastodon profile after the user authenticates via Mastodon) can't get them through the Upactor. They get them either by accepting the substrate-coupling explicitly (importing the substrate library directly) or via an *adapter-internal helper* — a function exposed alongside the adapter that takes an Upactor and returns the legible substrate handle.

The adapter-internal helper is not part of the IdentityPort. Calling it is the application's explicit acknowledgement that it's stepping outside the port for a substrate-specific operation. The fact that the helper exists does not violate the port; surfacing the legible handle *through* the Upactor would.

**Classification.** Spec-relevant (§7 amendment clarifying port-level vs adapter-internal identifiers); adapter-author guidance (recommended pattern for adapter packages).

## F4. Multi-step authentication flows resolved by IDP delegation, not port change

**Observation.** OAuth flows, magic links, email verification, and other multi-step authentication patterns don't fit upact's one-shot `authenticate(credential)` signature. The conversation arc that surfaced this initially considered growing the port surface — a flow-aware variant of `authenticate` returning `Session | AuthError | FlowStep`, or new `beginFlow` / `completeFlow` operations.

The architectural pivot to **Path B (IDP delegation)** resolved this without growing the port. Under Path B, an OIDC-shaped substrate (Mastodon, Supabase OAuth, GitHub, Auth0, etc.) is brokered through a substrate-side IDP (Authentik, Keycloak, ZITADEL). The IDP handles the multi-step machinery; the adapter consumes the IDP's terminal OIDC tokens. The port stays one-shot.

**Generalisation.** When the substrate is OIDC-shaped, the port consumes terminal OIDC tokens, never participates in the OAuth dance. The flow-aware port operation that would otherwise be needed is unnecessary because the IDP exists at a different architectural layer.

**Classification.** Roadmap — Decision 10 closed without port shape change.

## F6. Lifecycle modelling has multiple shapes

**Observation.** Mastodon access tokens do not auto-expire (per docs.joinmastodon.org/api/oauth-tokens — *"tokens will not expire automatically and will become invalid only when deleted by a user or revoked by the app"*). The Mastodon adapter's `lifecycle.expires_at` is therefore `undefined`, distinct from a TTL of zero or an unset-by-oversight `undefined`.

OIDC tokens have an explicit `exp` claim and map naturally to `lifecycle.expires_at`. Convene's encounter identities have `'represence'` rotation. Reticulum's Destination Hashes never expire. Four distinct lifecycle shapes across the substrates currently in scope:

| Pattern | Example | `expires_at` | `renewable` |
|---|---|---|---|
| Explicit TTL | OIDC, Supabase session | concrete timestamp | `'reauth'` |
| No intrinsic TTL | Mastodon OAuth tokens | `undefined` | `'reauth'` (require new flow if revoked) |
| Per-encounter rotation | Convene `'represence'` | concrete timestamp; id rotates on renewal | `'represence'` |
| Never expires | Reticulum Destination Hash | unset | `'never'` (or `'reauth'` only if user rotates keys) |

**Classification.** Spec-relevant — `SPEC.md` §8 (lifecycle) should enumerate these shapes explicitly. The current text under-documents the meaning of `expires_at: undefined` vs unset.

## G1. Minimum-scope request principle for OIDC adapters

**Observation.** Mastodon 4.3+ defines a `profile` scope that grants access only to `verify_credentials` (RFC 8414 metadata discovery available). Pre-4.3 instances need broader scopes (`read:accounts`). The adapter requests the minimum scope set the substrate offers for identity-only access.

**Generalisation to OIDC.** OIDC adapters request scope sets that determine which claims the IdP returns. The privacy-minima discipline translates directly: the OIDC adapter SHOULD request the **minimum scope set** needed to populate the Upactor — typically `openid` only, or `openid profile` for `display_hint`. The adapter SHOULD NOT request `email` even when the IdP offers it; that scope's absence in the request is part of the binding contract.

If an application later wants email for some substrate-specific use, it imports the substrate library directly (transparent coupling, visible in `package.json`). It does not get email through upact.

**The principle.** The OIDC adapter's scope request policy is one of the most concrete expressions of the binding posture: what scopes the adapter requests determines what claims it could surface. Requesting less is a structural commitment that surfacing more becomes architecturally costly.

**Classification.** Implemented: `@prefig/upact-oidc` v0.1.0 enforces this at construction time — `email`, `phone`, `address`, and `groups` scopes throw immediately. Default scopes: `['openid', 'offline_access']`. Spec-relevant note in conformance statement template (§10) recommending that OIDC-based adapters declare their scope policy.

## G2. OIDC error classification — substrate error strings to `AuthErrorCode`

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

## Sources

- **Conversation arc:** 2026-05-01 spec design discussion (covering the move from direct-adapter to IDP-delegation, the self-binding posture, and the cross-substrate spec stress test).
- **Cross-adapter ce:review:** May 2026 review across upact + upact-supabase + upact-simplex that opened Decisions 3, 4, 6, 7, 8, 9.
