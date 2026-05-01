# upact roadmap

Last updated: 2026-05-01 (rev. 5 — manual SPEC revision pass relaxed: v0.1 ships with AI-co-authored normative paths under disclosure).

Open work for the v0.1 release window. Each item names the committed posture and what is left to do. Closed items are kept here for institutional record until the next release cut.

## Posture (load-bearing for everything below)

upact is a self-binding contract for values-aligned platform builders. The privacy minima at the port — no email, no phone, no IP, opaque sessions, enumerated capabilities — are commitments the application has structurally given up the ability to violate. The architectural cost of later breaking the contract is what makes the commitment durable. Builders who sign the upact are accepting a substrate that encodes a values manifesto in code: an application built on upact cannot quietly pivot to surveillance-driven, data-retention-driven, or third-party-sharing-shaped revenue without ripping out foundations.

upact is not a replacement for OIDC clients (`auth.js`, `lucia`, `openid-client`), identity-broker IDPs (Authentik, Keycloak, ZITADEL), or identity protocols (DIDs, Verifiable Credentials). It is the typed-contract layer above them. The reference adapter strategy: enforcement-camp substrates with OIDC-shaped auth (Supabase, Mastodon, etc.) consume upact via a single `@prefig/upact-oidc` adapter that delegates substrate-specific machinery to a substrate-side IDP (Authentik, etc.); pre-conforming substrates (SimpleX, Reticulum) use direct adapters because no IDP layer fits them. This split is reflected in `docs/adapter-shapes.md`.

The "Manual human-authored revision of SPEC.md" item below now carries a sub-commitment: the manual pass should land this posture explicitly in §0 or §1 of `SPEC.md`, in the maintainer's voice.

## Open

### v0.1 SPEC and runtime authorship — AI-co-authored under disclosure

**Posture (revised 2026-05-01).** The earlier commitment that `SPEC.md` and the runtime kernel must be hand-rewritten by the maintainer before public push has been relaxed for v0.1. Within the OSA submission timeframe the maintainer doesn't have capacity for a manual re-authoring pass at the depth that commitment required. v0.1 ships with AI-co-authored content in normative paths under explicit `AI-Involvement` trailer disclosure.

The transparency posture is preserved — every AI-touched commit still discloses involvement via the trailer convention; the README's posture section still names what upact is. What changed: disclosure replaces authorship-purity as the binding mechanism for the normative paths. *"Done is better than perfect"*; if the AI-co-authored spec text spawns a critique conversation, that's on-brand for a project whose entire pitch is transparency over promise.

**Files affected by the relaxation.**

- `SPEC.md` — MAY land with `AI-Involvement: authored` or `collaborative` for v0.1.
- `src/types.ts`, `src/runtime.ts`, `src/index.ts`, `src/internal.ts`, `src/errors.ts` — MAY land with appropriate trailer disclosure.
- `tests/runtime.test.ts` — unchanged (was already optional).

**Status.** v0.1 ships under the relaxed policy. Revisit for v0.2 — the project may by then have capacity to do a maintainer-authored revision pass, or may decide to keep the AI-co-authored posture as canon (with the disclosure trail as the audit artefact).

**For the OSA narrative.** Honest disclosure of AI co-authorship of a spec for values-aligned platforms is on-brand: the binding upact asks adopters to accept (transparency, not promise) is the same binding the maintainer accepts about the spec's own provenance. Published commits carry the trail.

### `AI-Involvement` trailer convention adoption

**Posture.** Per-commit AI involvement is disclosed via an `AI-Involvement:` trailer with a five-tier vocabulary, adopted across all repos in the prefig org.

**Vocabulary.** Single-word qualifier; cumulative human involvement increases left to right:

| Trailer | When |
|---|---|
| `AI-Involvement: autonomous` | AI executed without human review (e.g. `/ce:review` autofix that committed safe fixes silently) |
| `AI-Involvement: authored` | AI wrote the substantive content; human read, accepted, possibly nudged |
| `AI-Involvement: collaborative` | Substantial back-and-forth; both contributed materially |
| `AI-Involvement: assisted` | Human wrote the substantive content; AI helped with edits, suggestions, formatting |
| `AI-Involvement: commit-message-only` | AI wrote only the commit message; the change itself is fully human |
| *(no trailer)* | No AI involvement |

`Co-Authored-By: <model>` accompanies the trailer for any tier where the AI contributed material substance (`autonomous` through `assisted`). For `commit-message-only`, no `Co-Authored-By` — the AI isn't a substantive author of the change.

**Status.** Convention defined, not yet adopted across the prefig org.

**Files to add.**

- `CONTRIBUTING.md` (this vocabulary plus when-to-use guidance and a note on choosing tiers honestly)
- `README.md` "Acknowledgments and process" section, naming the project's transparency posture and welcoming critique

**Cross-repo rollout.** Apply the trailer convention to all subsequent commits in `prefig/upact`, `prefig/upact-supabase`, `prefig/upact-simplex`, and any future adapter or sibling. Existing commits stay as they are; the README acknowledgment notes the convention start point.

### `SPEC.md` §6.2 amendment for `currentIdentity` throw permission

**Posture.** Decision C from the cross-adapter `/ce:review` (2026-05-01): `§6.2`'s `Promise<UserIdentity | null>` is the normal-flow return type. Adapters MAY throw `SubstrateUnavailableError` (imported from `@prefig/upact`) for substrate-availability failures. Applications that wish to distinguish substrate outage from logged-out state catch the typed error.

**Status.** Runtime export (`SubstrateUnavailableError`) and adapter use shipped. Spec amendment deferred to the manual `SPEC.md` revision pass above; the formal §6.2 wording will land as part of that pass.

### `Upactor` rename across the codebase

**Posture.** Type `UserIdentity` (and its references throughout `src/types.ts`, `src/index.ts`, both adapters, all tests, all docs and spec text) renames to `Upactor`. Method names follow: `currentIdentity` → `currentUpactor`. The port itself stays `IdentityPort` (the port is about identity-as-domain; the value flowing through is the Upactor). Lower-case bare word, no internal capital — `Upactor`, not `UpActor`.

**Status.** Naming decision closed (see Decision 5 in Closed). Rename implementation deferred — sequence with whichever next batch of work touches the type signatures (the manual SPEC pass, or as a standalone refactor commit before the next adapter ships).

**Files in scope.**

- `prefig/upact/SPEC.md` — `UserIdentity` → `Upactor` throughout; introduce naming rationale paragraph in §4 positioning Upactor against the broader Actor lineage (UML's external-entity-at-system-boundary, the actor model's isolated unit, ActivityPub's federation participant), specialized to identity-port-layer work.
- `prefig/upact/src/types.ts`, `src/index.ts`, `src/runtime.ts` (comment refs), `src/errors.ts` (any references in error-message text).
- `prefig/upact/tests/*` — type imports.
- `prefig/upact/README.md`, `prefig/upact/docs/adapter-shapes.md`.
- `prefig/upact-supabase/src/adapter.ts`, `src/identity-mapper.ts` (file rename optional).
- `prefig/upact-supabase/README.md`, tests.
- `prefig/upact-simplex/src/adapter.ts`, `src/identity-mapper.ts` (file rename optional).
- `prefig/upact-simplex/README.md`, tests.

### Architectural decisions surfaced by the primitive-naming conversation (2026-05-01)

The Upactor naming discussion (closed as Decision 5) exposed four structural questions about the primitive and the port. Each is a decision in its own right, sequenced for walk-through after the existing open decisions or whenever the maintainer chooses.

- **Decision 6 — `provenance` field on `Upactor`.** Add a `provenance: { substrate: string; instance?: string }` field that makes the substrate origin explicit at the type level. Apps aggregating Upactors across substrates can disambiguate without inferring from the opaque `id` alone. Substrate slug set by the adapter (`'supabase'`, `'simplex'`, etc.); `instance` is optional for distinguishing multi-instance deployments (two Supabase projects, two SimpleX daemons, two AP home instances). Rationale: the Upactor is the application's local view of someone surfaced by a substrate; provenance makes the source of authority legible at the type level.
- **Decision 7 — `continuation` field on `Upactor`.** Add an optional `continuation: { prior_id: string; kind: 'rotation' | 'migration' | 'rekey' | 'reauth' }` field carrying substrate-known transitions between identifiers. Pull reads (`currentUpactor()`) never carry this — there's no prior to compare against. Watch emissions carry it on the emission immediately following a substrate-known transition. Lets applications migrate user-bound state across rotations/migrations without the substrate's internal continuity link leaking through the opaque identifier. The strongest argument for watch (Decision 8) — substrate-side knowledge that pull-reads cannot carry.
- **Decision 8 — `watch` capability on the port.** Add `IdentityPort.watch(context): AsyncIterable<Upactor | null>` (or equivalent) as an OPTIONAL port operation. Watch is the channel for substrate-side transition events that pull-reads cannot carry — AP `Move` activities, SimpleX rotation, Convex reactive identity shifts. Adapters MAY decline to implement watch; substrates without push semantics can emit-once-and-complete. Decision involves choosing the canonical streaming primitive (AsyncIterable vs Observable vs callback subscription).
- **Decision 9 — `issueRenewal` as OPTIONAL in `§6.4`.** Some substrates have no concept of renewal (Convex reactive subscriptions; SimpleX daemon state without TTL). Marking `issueRenewal` as OPTIONAL lets such adapters decline implementation; consumers receive a typed `not_supported` error or `null`. Pairs with Decision 3's recommended identity-bound semantics.

### Decision 11 — Adapter package back-channel closure (conformance bar)

**Posture.** Conforming adapter packages MUST NOT provide back channels through their public surface that bypass the IdentityPort. The upact contract is convention-and-typed-discipline at the application layer; structurally enforceable at the *adapter-package* layer, where adapter authors who sign the contract keep the binding genuine. The application's freedom to import substrate libraries directly is preserved (transparent coupling, visible in `package.json`); what we close is the asymmetric case where an application uses upact's surface AND quietly cheats the contract through adapter-internal access paths.

**Required of conforming adapter packages.**

- **`exports` field discipline.** Restrict the package's public surface to documented entry points only. No deep imports of internal modules; module resolver enforces the boundary.
- **Substrate state in closure or `#private` fields.** Adapter holds substrate clients (SupabaseClient, MastodonClient tokenset, OAuth tokens) in closure-captured scope or ES2022 `#private` fields, never on enumerable instance properties. `(adapter as any).client` returns `undefined`.
- **Frozen returns.** Return `Object.freeze(...)` for `Upactor` values (or rely on adapter-shaped helpers that produce frozen values). Application can't monkey-patch returned identities.
- **Return only port-shaped values from public surface.** No helper that returns substrate-typed values bypassing the port. Substrate-side operations live inside the adapter and are reached through documented helper paths (out-of-port) or not at all.
- **Use upact's runtime primitives for opacity.** Sessions wrapped via `createSession` from `@prefig/upact`; never roll alternative implementations. The 16-vector opacity audit is a centrally-managed property; per-adapter implementations diverge subtly and dilute the binding.

**Rationale.** The asymmetric-deal posture (see README "Why upact" section) requires conforming adapters to genuinely close back channels. An application that uses `@prefig/upact-supabase` while pulling substrate state through `(adapter as any).supabase` has the *appearance* of upact's binding without the *substance*. The conformance bar prevents this case at the adapter package layer. Direct substrate imports remain available — applications that genuinely want substrate coupling can declare it transparently in their `package.json`, where lint rules and code review can flag it.

**Status.** Conformance bar drafted in conversation 2026-05-01; spec text amendment pending the manual `SPEC.md` revision pass; existing reference adapters (`@prefig/upact-supabase`, `@prefig/upact-simplex`) need an audit-and-retrofit pass to ensure compliance with the closure-capture / `#private` requirement.

### Decisions deferred from the cross-adapter `/ce:review` (2026-05-01)

The full review surfaced 50+ findings across five reviewers. Decision C (above) was the second of four "ready with decisions outstanding" items the maintainer is working through. Remaining open:

- **Decision 3 — `issueRenewal` semantics divergence.** Supabase ignores `identity` and renews the cookie holder; SimpleX detects id rotation and refuses. Pick one as normative in `§6.4`.
- **Decision 4 — `AuthError.code` vocabulary normative in `§6.5`.** Currently a hand-shake between two adapters; should be normative.
- Plus ~25 P2/P3 findings across spec amendments, adapter behaviour, test additions, and TypeScript cleanup. Catalogued in the run artifact at `.context/compound-engineering/ce-review/20260501-102919-fc3bfd2a/summary.md`.

## Closed

### Decision 1 — `OpaqueSubstrateSession._unwrap()` escape hatch (P0)

**Closed 2026-05-01.** Lifted the runtime opacity wrapper into `@prefig/upact` as `createSession` + `_unwrapSession`. Both adapters dropped their local `OpaqueSubstrateSession` class. The opacity guarantee is centrally audited; future adapters get it for free. 16 runtime opacity tests verify the kernel against `JSON.stringify`, `Object.keys`, `Object.getOwnPropertyNames`, `Reflect.ownKeys`, `for-in`, `structuredClone`, `util.inspect`, direct property access, and frozen-state. Runtime kernel is dual-licensed (CC-BY-4.0 spec text and docs; Apache-2.0 code).

### Decision 2 — `currentIdentity` throw-vs-null contract

**Closed 2026-05-01 (option C).** Adapters MAY throw a typed `SubstrateUnavailableError` (from `@prefig/upact`) when the substrate is unreachable, distinct from returning `null` when the user is logged out. Applications that don't care let the error propagate to their framework's error boundary; applications that want to render an outage banner catch the type. The substrate-down distinction is a substrate-choice-time decision, not a per-call-site concern; mapping it to a typed error keeps the common path's return type narrow while leaving the channel open for richer UX. Spec amendment deferred to the manual `SPEC.md` revision pass.

### Decision 10 — Multi-step authentication flows at the port

**Closed 2026-05-01.** Considered growing the `IdentityPort` with flow-aware operations (`beginFlow`/`completeFlow`, or a `FlowStep`-returning `authenticate` variant) to handle OAuth dances, magic-link verification, email-confirmation flows, MFA challenges, etc. The architectural pivot to **Path B (IDP delegation)** resolved this without growing the port: when the substrate is OIDC-shaped, the OAuth dance happens at a substrate-side IDP (Authentik, Keycloak, ZITADEL); the upact adapter consumes the IDP's terminal OIDC tokens via the existing one-shot `authenticate(credential)` shape. Pre-conforming substrates (SimpleX, Reticulum) use direct adapters with presentation-ready credentials (load profile, present capability), so they don't need flow-aware operations either. The port stays one-shot; the architectural complexity moves to a layer (IDP) that's better-equipped to handle it. See `docs/cross-adapter-findings.md` F4.

### Decision 5 — Naming the central primitive

**Closed 2026-05-01.** Renamed `UserIdentity` → `Upactor` as the type passed through the `IdentityPort`. The naming decision is closed; the rename refactor itself is queued in Open as tracked work.

**Rationale.** `UserIdentity` carries an essentialist account-record framing — "the user is a row with attributes" — that quietly imports the substrate model upact is trying to step away from (centralized session-bound auth as the default mental model). For a spec whose central argument is substrate-agnosticism and post-account identity models, the central primitive's name has to do positioning work, not retreat from it.

**Considered alternatives, ruled out and why.**

- `Acquaintance` — semantically right (this app's local view of someone) but ergonomically wrong (long, hard to spell).
- `Identifier` — humble but underclaims the type's contents (the record carries display, capabilities, lifecycle, provenance — properties of the someone, not of the label).
- `Visitor` — collides with the analytics/CMS convention where Visitor specifically means *anonymous, unauthenticated* (Pendo, Adobe, Drupal, Segment). Wrong-on-meaning collision.
- `Actor` — collides with ActivityPub's `Actor` at the wire-format level. In codebases bridging upact and AP, two `Actor` types in the same scope create persistent friction. Naming our primitive `Actor` while shipping no AP adapter would also overclaim the relationship.
- `Subject` — auth-fluent but carries OIDC's universal-record drift (the `sub` claim is meant to be stable across apps); fights the spec's voice.
- `Agent` — heavy AI-agent connotation in 2026.
- `Participant` — safe but does no positive work for the spec's voice.

**Why `Upactor`.**

Coined word in upact's namespace. No external collisions. Draws on the broader Actor lineage — UML's external-entity-at-system-boundary (the closest semantic match), the actor model's isolated unit, ActivityPub's federation participant — without committing to any single tradition's wire format. Brand cohesion (the name signposts the spec ecosystem). Memorability as an adoption asset for a small spec. Self-aware naming consistent with the project's voice. The slight semantic inversion ("one who upacts" technically reads as the contracting party — the builder — rather than the someone being identified) is accepted; spec naming routinely tolerates this looseness, and names accrue meaning from use rather than derivation.

Lower-case bare word, no internal capital — `Upactor`, not `UpActor`. Commits to coining rather than concatenating; cleaner separation from `Actor` as a substring.

**`@prefig/upact-activitypub` adapter explicitly NOT prioritized as a function of this naming.** During the naming discussion an AP adapter was sketched as a way to defend the Upactor positioning if the name were read primarily as a wordplay on ActivityPub's `Actor`. The maintainer has decided that the naming-similarity argument is insufficient justification for sequencing one substrate ahead of genuinely more interesting alternatives. Adapter selection follows substrate merits, not naming positioning. The Upactor name stands on its own (multi-tradition Actor lineage; coined-word brand cohesion).
