# Adapter shape sketches: validating the upact contract across substrates

> **Status:** v0.1-draft sketches. Type-only — no implementations. The purpose is to verify that the upact `IdentityPort` contract is genuinely substrate-agnostic by checking it against three substrates with very different lifecycles and threat models. This document is normative *only* for the Supabase adapter (which exists); the others are forward-looking.

## Why this document exists

The Supabase adapter (`@prefig/upact-supabase`) is the first conforming adapter. If it ships publicly without anyone checking that its design choices generalise, future adapters (Convene, fediverse, OIDC, …) will inherit a Supabase-shaped pattern — possibly one that doesn't fit their substrate's semantics. This document forces that check before the first adapter is set in stone.

The check is type-only. We sketch the *signatures* each adapter would need to expose, not their implementations. The signatures surface the substrate-specific assumptions silently encoded by each adapter's interface.

### Substrates fall into two camps

Per the synthesis (`~/prefig/rebuild/docs/2026-04-30-identity-port-pattern.md` §"Threat-model decoupling"), substrates relate to upact's privacy minima in two distinct ways:

- **Substrates that pre-conform** — e.g. SimpleX (no user identifiers; anonymous unidirectional queues), Reticulum (cryptographic Destination Hashes, no central directory), threshold-attested designs, peer-to-peer matching. The substrate's natural shape is already aligned with upact's MUST-NOTs. Adapters are mostly *type translation*, not architectural enforcement — thin packages.
- **Substrates that require enforcement** — Supabase Auth, OIDC, OAuth issuers, Fediverse account servers. The substrate exposes far more than upact permits; the adapter does the work of stripping, hiding, and capability-bounding — thicker packages.

`@prefig/upact-supabase` is the worked example of the *enforcement* case: Supabase's `User` shape exposes email, phone, JWT claims, `app_metadata`, and admin lookup affordances, all of which the adapter strips or hides. Reticulum and SimpleX adapters (sketched briefly below) would be the worked examples of the *pre-conforming* case if and when they ship.

## Substrates compared

The first three columns (Supabase, Convene, fediverse) are the primary comparison; the right two (SimpleX, Reticulum) are pre-conforming substrates added briefly so the *thin-adapter* case is visible alongside the *thick-adapter* one. The substrate-conformance camp each falls in is given on the second row.

| Property | Supabase | Convene | Fediverse (DID-based) | SimpleX | Reticulum |
|---|---|---|---|---|---|
| Substrate-conformance camp | Enforcement | Enforcement | Mostly enforcement | Pre-conforming | Pre-conforming |
| Identity-id stability | Account lifetime (years) | Per-encounter (~24h) | Tied to the DID itself (decades) | Application-scoped, derived from local profile | Application-scoped, derived from Destination Hash |
| Lifecycle `expires_at` | Never set | Always set | Never set | Optional (per-cycle queue rotation) | Never (Destination Hash is "immutable as a stone") |
| `renewable` mode | `'reauth'` | `'represence'` | `'reauth'` or session-only | `'reauth'` or `'represence'` | `'never'` (or `'reauth'` if user rotates keys) |
| Id rotates on renewal | No | Yes (upact §4.1, §8) | No | Application-defined | No |
| Substrate "user object" | A `User` record in `auth.users` | An encounter record + registry attestation | A DID document fetched over HTTPS / DNS | A local SimpleX profile (no server-side record) | A Destination Hash (cryptographic root) |
| `currentIdentity` synchrony | Cookies bound to request — fast local read | Registry round-trip | DNS / HTTPS fetch | Local read (no server) | Local read (mesh / offline-capable) |
| Capabilities | `{ email, recovery }` | `{ presence_renewal }` | Varies (depends on DID document) | `{ messaging, p2p_matching }` | `{ messaging, p2p_matching, mesh, offline_capable }` |
| Admin / service-role lookup | `auth.admin.getUserById` | No equivalent | No equivalent | No equivalent | No equivalent |
| Recovery semantics | Email-based (Supabase) | None | Cryptographic (DID-controller-key recovery) | None (start a new profile) | None (key-loss = identity-loss) |
| Threat model (upact §11) | Casual coordination | Casual coordination, semi-trusted registry | Varies by DID method | Anonymous / pseudonymous | Adversarial / off-grid / infrastructure-resilient |
| Adapter thickness | Thick (lots to strip) | Medium (registry-mediated) | Medium (DID-method-specific) | Thin (mostly type translation) | Thin (mostly type translation) |

## Adapter constructor signatures

The constructor reveals what substrate state the adapter binds to.

```ts
// Supabase: request-bound SupabaseClient (cookies via @supabase/ssr)
class SupabaseUpactAdapter implements IdentityPort {
  constructor(private supabase: SupabaseClient) {}
}

// Convene: a registry HTTP client + a local store of encounter records
// (the local store varies by deployment — IndexedDB, KV, in-memory)
class ConveneUpactAdapter implements IdentityPort {
  constructor(
    private registry: ConveneRegistryClient,
    private encounters: EncounterStore,
  ) {}
}

// Fediverse (sketch — DID method varies): a DID resolver + a session store
class FediverseUpactAdapter implements IdentityPort {
  constructor(
    private resolver: DidResolver,           // method-specific
    private sessions: FediverseSessionStore, // application-provided
  ) {}
}
```

**Generalisation:** there is no single shape of "substrate client." Each adapter takes whatever its substrate's read interface is. The Supabase adapter's request-bound client is one substrate's answer, not a precedent for others.

## Identity mapper signatures

Whether the per-adapter mapper is sync or async is forced by substrate access patterns.

```ts
// Supabase: substrate User available synchronously after
// supabase.auth.getUser() resolves. Pure mapper is feasible.
function userToIdentity(user: User): UserIdentity { /* ... */ }

// Convene: identity construction may need a registry round-trip to verify
// the encounter is still valid + fresh. Async only.
async function encounterToIdentity(
  encounter: EncounterRecord,
  registry: ConveneRegistryClient,
): Promise<UserIdentity> { /* ... */ }

// Fediverse: identity construction requires DID document resolution. Async only.
async function didToIdentity(
  did: string,
  resolver: DidResolver,
): Promise<UserIdentity> { /* ... */ }
```

**Generalisation:** adapters with substrate-User objects available in-memory (via cookies, JWT, or local cache) MAY expose a sync mapper as a convenience; adapters whose substrate requires a network round-trip MUST be async-only. The port operations themselves (upact §6) are all async, which is correct. The Supabase adapter's sync-mapper convenience is **substrate-specific**, not a port pattern future adapters should inherit.

## Lifecycle differences

```ts
// Supabase
{ issued_at: user.created_at, renewable: 'reauth' }
// no expires_at — Supabase identities don't expire

// Convene
{
  issued_at: encounter.timestamp,
  expires_at: encounter.timestamp + 24h,
  renewable: 'represence',
}
// expires_at always set; id ROTATES on renewal (per upact §4.1, §8)

// Fediverse (DID-based session)
{ issued_at: <session start>, renewable: 'reauth' }
// session-bound; the underlying DID itself doesn't expire
```

**Generalisation:** applications consuming the port MUST be prepared for `expires_at` being set or unset, and for `id` rotation across renewals when `renewable === 'represence'` (upact §8). The Supabase adapter's "no `expires_at`, no rotation" is the simplest case; application code that consumes the adapter should still be written for the general case so substrate-swap doesn't require an application rewrite.

## Capability binding (the `EmailChannel` question)

```ts
// Supabase: 'email' capability bound via service-role admin lookup
class EmailChannel {
  constructor(private adminClient: SupabaseClient, private sendImpl: SendImpl) {}
  send(identity: UserIdentity, message: EmailMessage): Promise<boolean> {
    // looks up email by identity.id via adminClient.auth.admin.getUserById
  }
}

// Convene: 'presence_renewal' capability has no analog of a "delivery channel"
// — there is no application-side delivery mechanism, only renewal evidence the
// application provides. EmailChannel does not generalise to Convene; the
// capability binding is provider-specific.

// Fediverse (DID): 'email' capability MIGHT exist if the DID document includes
// a verification method with email — but there is no service-role admin client.
// The channel would resolve email from the DID document and send via the
// application's own SMTP. Different shape from Supabase's admin-lookup pattern.
```

**Generalisation:** capability-bound channels are **per-capability + per-substrate** constructions. There is no generic "channel pattern" inherited from `EmailChannel`. Per upact §5.3: "channel operations are outside the scope of this document." This is not a contract failure — it is the reason the spec scopes them out. Each adapter exports the channels its substrate supports, with substrate-appropriate signatures.

## What this validates

1. The port operations (`authenticate`, `currentIdentity`, `invalidate`, `issueRenewal`) are all async, which fits every substrate above. ✓
2. The `UserIdentity` shape is substrate-agnostic. ✓
3. Lifecycle modes (`'reauth'`, `'represence'`, `'never'`) cover every substrate above. ✓
4. The capability vocabulary is open-ended and self-described per provider. ✓
5. Channel operations are correctly scoped *out* of the spec — they vary too much across substrates. ✓
6. Pre-conforming substrates produce thinner adapters than enforcement substrates — the spec accommodates both naturally without privileging either. ✓

## What this surfaces as Supabase-specific (NOT to be inherited by future adapters)

1. **A request-bound substrate client at construction.** Convene and fediverse adapters take different substrate state.
2. **A sync `userToIdentity` mapper** alongside the async port operations. Supabase-only convenience.
3. **Service-role admin-client lookup** as the channel-binding pattern. Substrate-specific.
4. **Coupling `recovery` to `email`** in the capability set. Supabase-specific (Supabase recovery is email-based). Convene has no recovery; fediverse recovery is cryptographic.

## Open questions for v0.2

- Should the upact spec define a normative channel-binding pattern, or stay scoped out per §5.3? The Convene + fediverse comparison suggests staying scoped out.
- Should adapters' conformance statements (upact §10) explicitly document substrate quirks like the Supabase `{email, recovery}` coupling, so application authors know which capabilities are independent vs coupled in their substrate?
- For applications consuming the port: what is the recommended pattern for handling `id` rotation across renewals (upact §8)? Worth a brief "adopting upact in an application" guide.

---

*Added 2026-04-30 alongside `@prefig/upact-supabase` v0.1.0-draft, to validate the port pattern against substrates other than Supabase before the first adapter ships publicly.*
