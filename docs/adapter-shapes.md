# Adapter shape sketches

> **Status (v0.1):** sketches of substrates against the upact `IdentityPort` contract. **Additional substrate sketches land alongside their shipped adapter, not before** — speculative substrates from earlier drafts (Convene, Reticulum, fediverse-DID-based) were removed by the audit (CONTRIBUTING.md): no shipped adapter, no concrete consumer. Sketches return when an adapter is genuinely on the way.

## Why this document exists

`@prefig/upact-supabase` and `@prefig/upact-simplex` are the two reference adapters at v0.1. This document records the shape choices each made and the substrate-conformance camp it falls into, so future adapters (notably `@prefig/upact-oidc` in Phase C) inherit the cross-substrate validation that already happened — not a single-adapter pattern.

The check is type-only. We sketch the *signatures* each adapter exposes, not their implementations. The signatures surface the substrate-specific assumptions encoded by each adapter's interface.

### Substrates fall into two camps

- **Pre-conforming substrates** — e.g. SimpleX (no central directory; anonymous unidirectional queues). The substrate's natural shape is already aligned with upact's MUST-NOTs. Adapters are mostly *type translation*, not architectural enforcement — thin packages.
- **Enforcement substrates** — e.g. Supabase Auth, OIDC providers (Phase C). The substrate exposes far more than upact permits; the adapter does the work of stripping, hiding, and capability-bounding — thicker packages.

`@prefig/upact-supabase` is the worked example of the *enforcement* case: Supabase's `User` shape exposes email, phone, JWT claims, `app_metadata`, `user_metadata`, all of which the adapter strips or hides. `@prefig/upact-simplex` is the worked example of the *pre-conforming* case: the SimpleX daemon's local profile carries `localDisplayName`, `agentUserId` (UUID), and a few status flags; the adapter hashes the UUID, sanitises the display name, and that's roughly it.

## Substrates compared (v0.1 shipped reality)

| Property | Supabase | SimpleX |
|---|---|---|
| Substrate-conformance camp | Enforcement | Pre-conforming |
| Identity-`id` stability | Account lifetime (years) | Application-scoped, derived from local profile UUID |
| Substrate "user object" | A `User` record in `auth.users` | A local SimpleX profile (no server-side record) |
| Adapter binding shape | Per-request: `event.locals.supabase` is cookie-bound at hook time | Per-instance: long-lived daemon connection, single-tenant per process |
| `currentUpactor` synchrony | Cookies bound to request — fast local read | Daemon round-trip (no remote server, but local IPC) |
| Capabilities (v0.1) | `{ email, recovery }` for users with email; `{ recovery }` otherwise | `[]` (substrate affords messaging and p2p_matching, but no v0.1 consumer surfaces them through the port — see SPEC §5 audit) |
| `display_hint` source | `user.user_metadata.display_name` if non-empty after trim | `User.localDisplayName` if non-empty after trim AND not email-shaped (per §4.2 MUST NOT) |
| Recovery semantics | Email-based (Supabase Auth) | None (start a new profile) |
| Threat model | Casual coordination | Anonymous / pseudonymous |
| Adapter thickness | Thick (lots to strip) | Thin (mostly type translation) |

## Adapter constructor signatures

The constructor reveals what substrate state the adapter binds to. v0.1 ships both adapters as **factory-only** (no class form): Decision 11 / SPEC §7.5 closure-capture conformance is most genuinely satisfied by the factory shape, and the audit found no concrete forward-looking use case the factory does not satisfy.

```ts
// Supabase: request-bound SupabaseClient (cookies via @supabase/ssr).
// Substrate state held in closure scope.
export function createSupabaseAdapter(supabase: SupabaseClient): IdentityPort;

// SimpleX: per-instance, long-lived daemon connection.
// Substrate state held in closure scope.
export function createSimpleXAdapter(client: SimpleXClient): IdentityPort;
```

**Generalisation:** there is no single shape of "substrate client." Each adapter takes whatever its substrate's read interface is. The Supabase adapter's request-bound client is one substrate's answer, not a precedent for others.

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

## Decision 11 closure-capture conformance — both adapters

Both adapters hold their substrate client in closure scope. `(adapter as any).client` (and equivalent) returns `undefined` for both. Each ships a sixteen-vector reflection test (`tests/back-channel.test.ts`) verifying that no sentinel substrate token leaks via any common reflection vector.

The factory pattern is the operational form of §7.5: there is no instance property to reach for. Both adapters' tests assert this directly.

## Forward-looking sketches (Phase C)

`@prefig/upact-oidc` is planned for a follow-up session (see `docs/plans/2026-05-01-003-feat-upact-oidc-adapter-plan.md`). When it ships:

- Constructor takes `OidcConfig` (discovery URL, client ID/secret, scopes, redirect URI) plus a per-request cookie jar and the inbound `Request`.
- Substrate state held in closure scope, same shape as the v0.1 adapters.
- Brings back `lifecycle: { expires_at }` to the `Upactor` type (concrete consumer: JWT `exp` claim).
- Brings back `provenance: { substrate: 'oidc', instance: <issuer URL> }` (concrete consumer: cross-IDP discrimination when applications aggregate).
- Capability declaration audit: starts at `[]`; capabilities land via SPEC §5.2 extension when concrete consumers surface.

The IDP-delegation pattern (Path B) means the OIDC adapter's substrate is "any OIDC-compliant IDP" — Authentik, Keycloak, ZITADEL, or Dex (used as the local dev rig). Mastodon, GitHub, Google, Auth0 etc. become *upstream* OAuth providers federated through the IDP, not direct upact substrates.

When the OIDC adapter ships, this document expands with its column. Convene, Reticulum, and fediverse-DID-based sketches return only if and when shipped adapters arrive — per the audit, sketches don't precede the shipped adapter.
