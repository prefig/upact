# Authoring a conforming adapter

**Status: draft for maintainer review.**

The path from "my substrate isn't covered" to a published `@prefig/upact-*`
package. Everything here is distilled from the seven shipped adapters
(supabase, simplex, oidc, mastodon, ember, eudi, atproto) and the findings in
[cross-adapter-findings.md](cross-adapter-findings.md); nothing is
speculative. Normative requirements live in [SPEC.md](../SPEC.md); where this
guide and the spec disagree, the spec wins.

If you arrived from the workshop worksheet: your Part 3 migration sketch names
the adapter you need. This is how to build it.

## Before you write code: three classifications

**1. Which camp is your substrate?** (adapter-shapes.md)

- *Pre-conforming*: the substrate already matches the privacy minima; nothing
  to strip. Your adapter is mostly type translation and will be thin
  (simplex, ember).
- *Enforcement*: the substrate exposes more than the port permits; your
  adapter strips, hides, and capability-bounds. It will be thick
  (supabase, oidc, mastodon).

**2. Which binding shape?** (finding F2; three shapes observed empirically)

| Shape | Fits when | Shipped example |
|---|---|---|
| Request-bound | the request carries the binding (cookie, header) | supabase |
| Process-bound | the substrate holds one process-global user | simplex |
| Per-user-session | each user has their own token; dominant for OAuth/OIDC-shaped substrates | oidc, mastodon |

**3. Which lifecycle shape?** (finding F6)

| Pattern | `expires_at` | `renewable` | Shipped example |
|---|---|---|---|
| Explicit TTL | concrete timestamp | `'reauth'` | oidc |
| No intrinsic TTL | `undefined`, deliberately | `'reauth'` | mastodon |
| Per-encounter rotation | concrete; id rotates on renewal | `'represence'` | ember |
| Never expires | unset | `'never'` | (sketched: Reticulum) |

## The steps

1. **Package and constructor.** `@prefig/upact-<substrate>`, factory-only
   (no class form): closure capture is how §7.5 conformance is most genuinely
   satisfied (SPEC §7.5). The constructor signature should reveal exactly
   what substrate state the adapter binds to; see the signature catalogue in
   adapter-shapes.md.

2. **Derive the opaque `id`.** Hash the substrate's legible identifier
   (shipped pattern: `sha256(<legible>).slice(0, 32)`). Keep the legible form
   adapter-internal for substrate-side calls; it must be unreachable through
   the port (finding F3). If applications genuinely need the legible handle,
   expose an adapter-internal helper beside the port, never a field on the
   Upactor.

3. **`display_hint`.** Best-effort only: trim, reject empty, and reject
   email-shaped values (every shipped enforcement adapter does this). It is
   never a contact identifier.

4. **Declare almost no capabilities.** The core vocabulary is `email` and
   `recovery` (§5.1). Declare a capability only if a real consumer gates on
   it; substrate affordances with no consumer stay undeclared (finding F1:
   mastodon ships `capabilities: []` despite ActivityPub's richness; ember
   ships `[]` and carries its real affordance in
   `lifecycle.renewable: 'represence'` instead). Capability absence is the
   feature. Do not grow the vocabulary to fit your substrate.

5. **Request the minimum.** If your substrate has scopes or claims, request
   the smallest set that populates the Upactor, and enforce it structurally:
   `@prefig/upact-oidc` throws at construction time if configured with
   `email`, `phone`, `address`, or `groups` scopes (finding G1). What your
   adapter refuses to request is part of the binding contract.

6. **Populate `lifecycle` and `provenance`.** Pick the lifecycle shape from
   the table above and represent it deliberately (mastodon's
   `expires_at: undefined` is a statement, not an omission). `provenance` is
   informational: `{ substrate: '<short-id>', instance: <issuer or origin> }`.
   Applications must never branch on it (§4.5).

7. **Map errors onto the six-member `AuthErrorCode` vocabulary** (§6.5).
   The distinction that trips people: `credential_rejected` means understood
   but refused (expired or revoked grant); `credential_invalid` means
   malformed or unrecognisable. The worked OIDC mapping table is in finding
   G2 and `@prefig/upact-oidc/CONFORMANCE.md`.

8. **Prove conformance, then register.** Pass the sixteen-case back-channel reflection
   test (no session or legible identifier reachable via `JSON.stringify`,
   `structuredClone`, `util.inspect`, or the other vectors; every shipped
   adapter's test suite includes it). Write a `CONFORMANCE.md` against the
   spec version you target: substrate description, threat model stated
   honestly, capabilities declared and why, lifecycle choice, error mapping,
   scope policy if applicable (`@prefig/upact-ember/CONFORMANCE.md` is the
   current best exemplar). Then register the adapter in the README table via
   PR.

## What not to do

- Do not widen the port for multi-step authentication flows. OAuth dances,
  magic links, and verification flows are resolved by IDP delegation
  (Path B): the adapter consumes terminal tokens; the port stays one-shot
  (finding F4; SPEC §6 keeps the port one-shot).
- Do not surface network-legible identifiers through the Upactor, whatever
  the convenience (finding F3).
- Do not model authorization as capabilities. Roles are application-owned;
  the port refuses them by design (SPEC §3.1).
- Do not declare capabilities speculatively to look feature-rich (§5.1's
  growth discipline exists precisely because that erodes the signal).

## Why author one at all

A published, conforming, maintained adapter is the unit of standing in
upact's governance: at v1.0, decisions about the core vocabulary and the MUST
clauses move to a working group of conforming-adapter authors (SPEC §11).
Authoring an adapter is how your substrate's shape gets a vote.

Sources: [adapter-shapes.md](adapter-shapes.md) ·
[cross-adapter-findings.md](cross-adapter-findings.md) · the seven shipped
`CONFORMANCE.md` files. Draft 2026-07-03; adapter count updated 2026-08-28.
