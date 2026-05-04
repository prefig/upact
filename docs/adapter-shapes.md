# Adapter shape sketches

> **Status (v0.1.2):** sketches of substrates against the upact `IdentityPort` contract. **Additional substrate sketches land alongside their shipped adapter, not before** — speculative substrates from earlier drafts (Convene, Reticulum, fediverse-DID-based) were removed by the audit (CONTRIBUTING.md): no shipped adapter, no concrete consumer. Sketches return when an adapter is genuinely on the way.

## Why this document exists

`@prefig/upact-supabase`, `@prefig/upact-simplex`, `@prefig/upact-oidc`, and `@prefig/upact-mastodon` are the four reference adapters at v0.1.2. This document records the shape choices each made and the substrate-conformance camp it falls into, so future adapters inherit the cross-substrate validation that already happened, not a single-adapter pattern.

The check is type-only. We sketch the *signatures* each adapter exposes, not their implementations. The signatures surface the substrate-specific assumptions encoded by each adapter's interface.

### Substrates fall into two camps

- **Pre-conforming substrates** — e.g. SimpleX (no central directory; anonymous unidirectional queues). The substrate's natural shape is already aligned with upact's MUST-NOTs. Adapters are mostly *type translation*, not architectural enforcement — thin packages.
- **Enforcement substrates** — e.g. Supabase Auth, OIDC providers (Phase C). The substrate exposes far more than upact permits; the adapter does the work of stripping, hiding, and capability-bounding — thicker packages.

`@prefig/upact-supabase` is the worked example of the *enforcement* case: Supabase's `User` shape exposes email, phone, JWT claims, `app_metadata`, `user_metadata`, all of which the adapter strips or hides. `@prefig/upact-simplex` is the worked example of the *pre-conforming* case: the SimpleX daemon's local profile carries `localDisplayName`, `agentUserId` (UUID), and a few status flags; the adapter hashes the UUID, sanitises the display name, and that's roughly it. `@prefig/upact-oidc` is the enforcement case for any OIDC-compliant IDP. `@prefig/upact-mastodon` is the enforcement case for Mastodon-API-compatible servers with per-login instance discovery (the multi-instance fediverse exception to Path B; see ROADMAP Decision 12).

## Substrates compared (v0.1.2 shipped reality)

| Property | Supabase | SimpleX | OIDC | Mastodon |
|---|---|---|---|---|
| Substrate-conformance camp | Enforcement | Pre-conforming | Enforcement | Enforcement |
| Identity-`id` stability | Account lifetime (years) | Application-scoped, derived from local profile UUID | Stable within issuer: SHA-256(`sub@iss`)[:32] | Stable per (account, instance): SHA-256(`actor.url`)[:32] |
| Substrate "user object" | A `User` record in `auth.users` | A local SimpleX profile (no server-side record) | ID token claims (sub, iss, exp, preferred_username, name) | `verify_credentials` Account response (id, acct, username, display_name, url; ~25 other fields stripped at the network boundary) |
| Adapter binding shape | Per-request: `event.locals.supabase` is cookie-bound at hook time | Per-instance: long-lived daemon connection, single-tenant per process | Per-request: `event.cookies` (CookieJar) + inbound Request | Per-request: `event.cookies` (CookieJar) + per-process `ClientStore` for OAuth client credentials |
| `currentUpactor` synchrony | Cookies bound to request: fast local read | Daemon round-trip (no remote server, but local IPC) | Cookie read + optional refresh token grant | Cookie read + `verify_credentials` round-trip (cached per-token, default 60s) |
| Capabilities (v0.1.x) | `{ email, recovery }` for users with email; `{ recovery }` otherwise | `[]` | `[]` (IDP-agnostic; application layer assigns capabilities) | `[]` (ActivityPub messaging is real but not declared per F1) |
| `display_hint` source | `user.user_metadata.display_name` if non-empty after trim | `User.localDisplayName` if non-empty after trim AND not email-shaped | `preferred_username` then `name`; email-shaped values rejected | `display_name` then `username`; email-shaped values rejected |
| `lifecycle` | not populated (v0.1.x) | not populated (v0.1.x) | `{ expires_at: new Date(exp * 1000), renewable: 'reauth' }` | `{ expires_at: undefined, renewable: 'reauth' }` (F6: Mastodon access tokens never auto-expire) |
| `provenance` | not populated (v0.1.x) | not populated (v0.1.x) | `{ substrate: 'oidc', instance: issuer }` | `{ substrate: 'mastodon', instance: <origin URL> }` |
| Recovery semantics | Email-based (Supabase Auth) | None (start a new profile) | IDP-managed refresh token rotation | None: revocation is the only path, full re-auth required |
| Threat model | Casual coordination | Anonymous / pseudonymous | Standard OIDC delegate trust | Casual coordination + pseudonymous fediverse use; trusts the user-supplied instance |
| Adapter thickness | Thick (lots to strip) | Thin (mostly type translation) | Thick (scope enforcement, token storage, refresh) | Thick (instance discovery, dynamic client registration, scope enforcement, allow-list claims) |

## Adapter constructor signatures

The constructor reveals what substrate state the adapter binds to. v0.1 ships both adapters as **factory-only** (no class form): Decision 11 / SPEC §7.5 closure-capture conformance is most genuinely satisfied by the factory shape, and the audit found no concrete forward-looking use case the factory does not satisfy.

```ts
// Supabase: request-bound SupabaseClient (cookies via @supabase/ssr).
// Substrate state held in closure scope.
export function createSupabaseAdapter(supabase: SupabaseClient): IdentityPort;

// SimpleX: per-instance, long-lived daemon connection.
// Substrate state held in closure scope.
export function createSimpleXAdapter(client: SimpleXClient): IdentityPort;

// OIDC: per-request CookieJar (SvelteKit event.cookies or equivalent).
// Substrate tokens stored in HMAC-SHA256 signed session cookie.
// Substrate state (tokens, config) held in closure scope.
export function createOidcAdapter(
  config: OidcConfig,
  cookies: CookieJar,
  _client?: OidcClient,
): IdentityPort & OidcAdapterExtensions;

// Mastodon: per-request CookieJar + module-scoped ClientStore (default
// in-memory; pluggable for KV / Redis / Postgres). Per-login instance
// resolution; dynamic OAuth client registration via POST /api/v1/apps
// cached per-instance.
export function createMastodonAdapter(
  config: MastodonConfig,
  cookies: CookieJar,
): IdentityPort & MastodonAdapterExtensions;
```

**Generalisation:** there is no single shape of "substrate client." Each adapter takes whatever its substrate's read interface is. The Supabase adapter's request-bound client is one substrate's answer, not a precedent for others. The Mastodon adapter introduces a third shape detail: per-instance OAuth client credentials cached in a deployment-pluggable `ClientStore` because the substrate is "the user-chosen instance," not a fixed thing the deployment registered at construction.

## Identity mapper signatures

Whether the per-adapter mapper is sync or async is forced by substrate access patterns.

```ts
// Supabase: substrate User available synchronously after
// supabase.auth.getUser() resolves. Pure mapper is feasible.
function userToUpactor(user: User): Upactor;

// SimpleX: id derivation hashes the substrate's UUID via Web Crypto API.
// The substrate-User is available locally, but the id derivation itself
// is async. (Async because Web Crypto is async; nothing about the
// substrate forces an extra round trip.)
async function userToUpactor(user: User): Promise<Upactor>;
```

**Generalisation:** adapters with substrate-User objects available in-memory MAY expose a sync mapper as a convenience; adapters whose mapping requires async work (Web Crypto, network round-trip, file I/O) MUST be async. The port operations themselves (SPEC §6) are all async, which is correct. Sync-mapper convenience is **substrate-specific**, not a port pattern future adapters should inherit.

## Decision 11 closure-capture conformance: all four adapters

All four adapters hold their substrate state in closure scope. `(adapter as any).client` (and equivalent property names) returns `undefined` for each. Each ships a sixteen-vector reflection test (`tests/back-channel.test.ts`) verifying that no sentinel substrate token leaks via any common reflection vector.

The factory pattern is the operational form of §7.5: there is no instance property to reach for. Every adapter's tests assert this directly.

## OIDC adapter specifics (v0.1.1 shipped)

The IDP-delegation pattern (Path B): the OIDC adapter's substrate is "any OIDC-compliant IDP" — Authentik, Keycloak, ZITADEL, or Dex (local dev rig). Mastodon, GitHub, Google, Auth0 etc. become *upstream* OAuth providers federated through the IDP, not direct upact substrates.

Key decisions:
- Scope policy enforces `email`/`phone`/`address`/`groups` exclusion at construction time (throws immediately).
- `id` = SHA-256(`sub@iss`)[:32] — deterministic, not reversible, stable across refresh rotations.
- Tokens stored in HMAC-SHA256 signed session cookie; never on the `Session` or `Upactor`.
- `issueRenewal` is OPTIONAL (Decision 9): returns `null` if no refresh token present.
- Two out-of-port extensions: `buildAuthRedirect()` (init phase) and `buildLogoutRedirect()` (logout).

Convene, Reticulum, and fediverse-DID-based sketches return only if and when shipped adapters arrive: per the audit, sketches don't precede the shipped adapter.

## Mastodon adapter specifics (v0.1.2 shipped)

The fediverse-flexibility pattern (Decision 12): the Mastodon adapter's substrate is "any Mastodon-API-compatible server the user picks at login." Path B (OIDC + Authentik) is incompatible with arbitrary-instance UX because each instance must be preregistered at the IDP; the Mastodon adapter resolves the user-supplied instance and registers an OAuth client at login time.

Key decisions:
- Per-login instance discovery via `GET /api/v1/instance` (with v2 fallback). Bare hostname, WebFinger handle (`@alice@hachyderm.io`), and full URL inputs all resolve to the canonical origin.
- Dynamic OAuth client registration via `POST /api/v1/apps`, cached per-instance in a pluggable `ClientStore` (default `InMemoryClientStore`, 30-day TTL).
- Scope policy: allow-list `['read:accounts', 'profile']`. Default `['read:accounts']`. Forbidden scopes throw at construction time.
- Allow-list claims mapping: only `id`, `acct`, `username`, `display_name`, `url` from `verify_credentials` reach the claims-mapper. The substrate's ~25 additional fields (avatar, header, fields, source, bot, locked, follower/following/statuses counts, last_status_at, created_at, ...) are stripped at the network boundary.
- `id` = SHA-256(`actor.url`)[:32]. The actor URL is the F3 network-legible identifier; the hash is the port-opaque form.
- `lifecycle.expires_at: undefined`, `renewable: 'reauth'` per F6. `issueRenewal` returns `null` unconditionally.
- One out-of-port extension: `buildAuthRedirect()` (init phase). No `buildLogoutRedirect`: Mastodon has no end-session URL analog.
- 16-vector reflection test passes; substrate state (access token, client credentials, instance origin, actor URL, cookie secret) lives entirely in closure.

This is the first adapter in the project where F2's per-user-session binding shape is empirically observed in shipped code rather than predicted from analysis. The next likely candidate is a Bluesky / ATProto adapter, where DID-based identity portability would also exercise the deferred Decision 7 (`continuation`).
