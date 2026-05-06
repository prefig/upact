# upact — Identity Port Specification

**Version:** 0.1
**Status:** Working draft. Public release. Breaking changes between v0.x revisions are permitted; v1.0 marks the first stable version.
**License:** CC BY 4.0

> **A note on authorship.** v0.1 of this specification was AI-co-authored. Commits touching normative content carry an `AI-Involvement: <tier>` trailer recording the character of involvement (`autonomous` / `authored` / `collaborative` / `assisted` / `commit-message-only`). The contribution lineage is auditable in `git log`. Future revisions may include a maintainer-only re-authoring pass.

---

## §1. Overview

This document specifies the *identity port* — a typed architectural contract between a social application and any identity provider. The port enforces minimum disclosure architecturally: even when the underlying provider exposes more, an application that conforms to this specification cannot consume what the port does not permit.

The port is intended to be small enough that any reasonable identity substrate — long-lived account-based providers (e.g. OAuth/OIDC), ephemeral presence-renewed providers, threshold-attested providers, peer-to-peer matching providers — can implement it with substrate-appropriate semantics, while the application layer remains substrate-agnostic.

This is the dual of selective-disclosure self-sovereign identity. SSI puts disclosure control at the *user* side: the application asks for what it wants, the user permits or denies. This specification puts a hard bound at the *application* side: the application architecturally cannot ask for what is outside the port, even if the user would permit it.

**The port is a self-binding contract.** The privacy minima at the port are not features the substrate happens to hide. They are commitments the application has structurally given up the ability to violate. The architectural cost of breaking the contract later is what makes the commitment durable: an application built on upact cannot quietly pivot to surveillance-driven, data-retention-driven, or third-party-sharing-shaped revenue without ripping out foundations.

## §2. Terminology

- **Application** — software that consumes identities to serve users.
- **Provider** (also: *adapter*) — software that issues, attests, renews, and invalidates identities. Implements the `IdentityPort` interface (§6).
- **Substrate** — the implementation technology a provider is built on (database, OIDC server, IDP-brokered upstream, peer-to-peer messaging, etc.).
- **Upactor** — a `Upactor` value as defined in §4. The application's view of "who is this." (Renamed from `UserIdentity` in v0.1; deprecated alias `UserIdentity` remains for v0.1.x compatibility.)
- **Session** — provider-defined credential exchange artefact; opaque to the application.
- **Capability** — a self-described provider feature (§5).

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## §3. Conformance

A **provider** (adapter package) conforms to this specification when it:

- exposes the four operations defined in §6,
- returns `Upactor` values matching §4,
- self-declares capabilities using the vocabulary in §5,
- honours every MUST NOT clause in §7,
- holds substrate state out of public reflection per §7.5.

An **application** conforms to this specification when it:

- consumes only `Upactor` values returned by a conforming provider,
- branches behaviour only on capability presence (§5), never on substrate identity, provider type, or out-of-band knowledge of the provider,
- does not reach past the port through reflection on adapter instances or sessions.

Conformance is to a specific version of the spec.

**Application-side conformance is currently a discipline, not a test.** The provider has a sixteen-vector reflection test for §7.5 conformance; the application side has no equivalent automated check. A future v0.2 release SHOULD ship application-side static checks (lint rules forbidding substrate-library imports outside the substrate seam, or equivalent) to mechanise this bar.

### §3.1 Scope: user-tier identity

This specification governs user-facing identity — the relationship between an authenticated person and the application. It does not govern:

- Application-internal authorization (admin, moderator, operator capabilities)
- System-to-system credentials
- Any identity concern that is not a direct person–application relationship

**Authorization is out of scope.** The privacy minima of §7 describe what the application may know about a user; they do not describe what an operator may know about, or do to, the system. How an application implements operator/administrative tooling is its own concern — whether through a substrate-native capability claim, an application-layer role, a separate authentication plane on a different surface, a command-line tool, or no operator surface at all.

`Upactor` attributes and capabilities MUST NOT be used to model authorization roles. The capability vocabulary in §5 governs what user-facing features the application may use (e.g. sending an email to a user); it does not govern what privileged operations a particular caller is permitted to perform.

## §4. Upactor

A `Upactor` is a value of the following shape:

```ts
interface Upactor {
  id: string;
  display_hint?: string;
  capabilities: ReadonlySet<Capability>;
  lifecycle?: IdentityLifecycle;
  provenance?: { substrate: string; instance?: string };
}

interface IdentityLifecycle {
  expires_at?: Date;
  renewable: 'reauth' | 'represence' | 'never';
}
```

Five fields, three of which are optional. `lifecycle` and `provenance` were deferred from the initial draft and brought back by the OIDC adapter (Phase C, v0.1.1) when it concretely needed them. See §12 for the remaining deferred-decisions register.

### §4.1 `id`

An opaque identifier, stable for the lifetime of this identity. The identity MAY be re-issued with a new `id` if the provider's substrate produces one (e.g. a presence-renewed substrate may issue a new `id` at each renewal); applications branch on equality only.

The `id` MUST be opaque to the application. Applications MUST NOT parse, decompose, or attribute meaning to the `id` beyond equality comparison.

### §4.2 `display_hint`

An optional, best-effort string the application MAY render to other users when no petname is available. It MUST NOT be assumed unique. Applications SHOULD prefer petnames or local nicknames where the receiver has set them.

Display hints MUST NOT be email addresses, phone numbers, or other contact identifiers. They are display-only.

### §4.3 `capabilities`

See §5.

### §4.4 `lifecycle` (optional)

When the substrate has an explicit session TTL (e.g. OIDC JWT `exp` claim), providers SHOULD populate `lifecycle`. Substrates with no intrinsic expiry MAY omit this field.

`lifecycle.expires_at` is the absolute expiry time. `lifecycle.renewable` describes how the identity can be renewed: `'reauth'` (full credential exchange required), `'represence'` (presence renewal suffices), or `'never'` (identity does not expire).

Applications that want to render session-expiring-soon UI MAY use `lifecycle.expires_at`. Applications that do not care about lifecycle simply ignore this field.

### §4.5 `provenance` (optional)

When present, `provenance.substrate` names the substrate type (e.g. `'oidc'`, `'supabase'`, `'simplex'`) and `provenance.instance` names the specific instance (e.g. the OIDC issuer URL). Used for cross-substrate discrimination in multi-IDP deployments.

Applications MUST NOT gate behaviour on `provenance.substrate` or `provenance.instance` as a substitute for capability checks. Provenance is informational, not authoritative.

## §5. Capabilities

Capabilities are self-described provider features. The application uses capability presence to gate behaviour. The application MUST NOT branch on substrate identity, provider type, or any out-of-band knowledge of the provider.

### §5.1 Core capability vocabulary (v0.1)

| Capability | Meaning |
|-----------|---------|
| `email` | The provider can deliver email to this identity. |
| `recovery` | The provider supports identity recovery flows. |

**The vocabulary is intentionally minimal.** These two capabilities have shipped consumers: the Supabase reference adapter declares them; dyad's UI gates on them for password-reset and invitation flows. New capabilities land via §5.2 extension when shipped adapters need them.

This minimum-viable discipline is itself part of the binding mechanism. A capability vocabulary that grew speculatively would dilute the contract: applications would gate on capabilities that no substrate genuinely supports, providers would declare capabilities to look feature-rich, and the whole signal would erode. Keeping the vocabulary small and concrete-need-driven keeps the binding genuine.

### §5.2 Capability extension

Providers MAY self-declare capabilities outside the core vocabulary. Applications SHOULD treat unknown capabilities as absent.

A capability registry is maintained out-of-band. New capabilities move into a future revision of the core vocabulary on demonstrated implementation by at least two independent providers and demonstrated consumption by at least one application. Until those conditions are met, the capability remains adapter-local.

### §5.3 Capability access

A capability does not, by itself, grant the application access to the substrate's underlying mechanism. To use a capability, the application invokes a separate, capability-bound operation (e.g. `EmailChannel.send(identity, message)`) defined per-capability and outside the scope of this document. The application MUST NOT bypass the capability boundary by reaching into the provider's substrate directly.

## §6. Operations

A provider implements the following four operations:

```ts
interface IdentityPort {
  authenticate(credential: unknown): Promise<Session | AuthError>;
  currentUpactor(request: Request): Promise<Upactor | null>;
  invalidate(session: Session): Promise<void>;
  issueRenewal(identity: Upactor, evidence: unknown): Promise<Upactor | null>;
}
```

**Multi-step authentication flows are out of scope for the port.** When a substrate is OIDC-shaped (Authentik, Keycloak, ZITADEL, Mastodon-as-broker, GitHub-as-broker, etc.), the OAuth dance happens at a substrate-side IDP; the upact adapter consumes terminal OIDC tokens via the existing one-shot `authenticate` shape. Substrates with presentation-ready credentials (load-profile, single-call password) use `authenticate` directly. The port stays one-shot; flow-shaped complexity moves to a layer (IDP) better-equipped to handle it.

### §6.1 `authenticate(credential)`

Establishes a session from a provider-shaped credential (password + email, OIDC tokenset, presence-event proof, threshold attestation, etc.). Returns a `Session` on success or an `AuthError` (§6.5) on failure. The shape of `credential` is provider-defined; the application either knows the shape because it is wired to that provider, or accepts the provider's UI to gather it.

The returned `Session` is opaque to the application; the application uses `currentUpactor` to obtain the `Upactor`.

### §6.2 `currentUpactor(request)`

Returns the `Upactor` currently associated with a request, or `null` if no authenticated user.

The provider extracts the session credential from the request (cookie, header, captured tokenset, daemon state) according to its own conventions, validates it, and returns a fresh `Upactor` value.

A provider MAY throw a typed error (e.g. `SubstrateUnavailableError` exported by `@prefig/upact`) when the substrate is unreachable, to distinguish "no authenticated user" (logged-out) from "substrate cannot answer" (infrastructure outage). Applications that don't care let the error propagate; applications that want to render an outage-specific UI catch the type. The `null` channel is reserved for "logged-out."

### §6.3 `invalidate(session)`

Invalidates the session. Subsequent calls to `currentUpactor` with a request bearing the same session MUST return `null`. The provider MAY cascade invalidation to associated identities.

### §6.4 `issueRenewal(identity, evidence)`

Renews an existing identity, returning either a renewed identity (which MAY have a new `id`) or `null` if renewal is not possible or not supported. The shape of `evidence` is per-provider — for OIDC providers it is implicit (refresh token held in closure); for password-reauth substrates it is fresh credentials.

**`issueRenewal` is OPTIONAL** (Decision 9, closed normatively). Providers whose substrate has no concept of renewal (e.g. static profiles, never-expiring tokens) MUST return `null`. Consumers MUST treat a `null` response as "renewal not available" rather than as an error.

If the renewed identity has a new `id`, the application MUST treat data tied to the previous `id` according to the application's own data-model contract.

### §6.5 `AuthError` vocabulary

The `AuthError` returned from `authenticate` carries a normative code drawn from a closed vocabulary:

```ts
type AuthErrorCode =
  | 'credential_invalid'        // malformed credential rejected pre-substrate
  | 'credential_rejected'       // substrate rejected the credential
  | 'substrate_unavailable'     // substrate unreachable / network error
  | 'identity_unavailable'      // no such identity on this substrate
  | 'rate_limited'              // substrate rate-limited the operation
  | 'auth_failed';              // unexpected substrate failure

interface AuthError {
  code: AuthErrorCode;
  message: string;
}
```

Providers MUST return one of these codes; substrate-specific detail goes in `message`. Applications branch on `code` for substrate-portable error handling. Adapter packages document their per-substrate mapping (which substrate errors map to which code) in their conformance statement (§10).

Adapters may emit a subset of the vocabulary. Codes that distinguish identity-existence from credential-validity (notably `identity_unavailable`) are reserved for substrates that surface that distinction; the v0.1 reference adapters do not — Supabase conflates "no such user" with "wrong password" as credential-stuffing resistance, OIDC surfaces failures as token errors. Application code can branch on the full vocabulary; some branches will be unreachable for some adapters.

## §7. Privacy minima (normative MUST NOT clauses)

These clauses are normative. A conforming provider MUST observe them.

### §7.1 No identifiers outside the contract

The `Upactor` value MUST NOT contain:

- email addresses
- phone numbers
- legal-name fields (`first_name`, `last_name`, etc.)
- date-of-birth fields
- IP addresses
- device identifiers
- any field of `app_metadata`, `user_metadata`, or substrate-specific extension blocks

If the substrate exposes such fields (Supabase Auth, OIDC, etc.), the provider's implementation of the port MUST strip them before returning a `Upactor` value.

### §7.2 No silent enrichment

Providers MUST NOT add fields to `Upactor` that are not part of this specification. Future versions of this specification may add fields; providers conforming to a specific version MUST NOT include fields from later versions in values returned to applications conforming to the earlier version.

### §7.3 No correlation handles

The `id` field MUST NOT be derivable from any user-supplied identifier (email, phone) by the application. Providers SHOULD use opaque random identifiers; if a provider derives `id` from a stable user attribute, the derivation MUST NOT be reversible by the application, and the provider MUST document the derivation in its conformance statement.

### §7.4 No substrate exposure through Session — runtime kernel is normative

The `Session` value MUST be opaque to the application. Applications MUST NOT decompose, decode, or extract claims from a `Session` directly; the only valid use is to pass it back to the port (e.g. for `invalidate`). Substrate-shaped session structures (JWTs with claims, cookies with metadata, captured tokensets) are an implementation detail of the provider.

**Implementations MAY use `createSession` from `@prefig/upact`**, which provides the normative opacity guarantee tested across the sixteen reflection vectors in `tests/runtime.test.ts`. Implementations that do not use `createSession` MUST pass an equivalent vector suite to claim conformance: `JSON.stringify`, `Object.keys`, `Object.getOwnPropertyNames`, `Reflect.ownKeys`, `Object.getOwnPropertySymbols`, for-in iteration, `structuredClone`, `util.inspect`, direct property access, frozen-state immutability, and the controlled escape hatch via `_unwrapSession` from `@prefig/upact/internal`.

The runtime kernel is normative because the privacy minima at the type level are insufficient on their own — TypeScript's structural typing cannot prevent runtime reflection from leaking substrate state. The kernel turns the type-level guarantee into a runtime guarantee, centrally audited.

### §7.5 Adapter back-channel closure

Conforming adapter packages MUST hold substrate state out of public reflection. Specifically:

- Substrate clients (e.g. `SupabaseClient`, `SimpleXClient`, OIDC token holders) MUST be held in closure-captured scope or ES2022 `#private` fields, never on enumerable instance properties. `(adapter as any).client` MUST be `undefined`.
- Adapter packages MUST restrict their `package.json` `exports` field to documented entry points only. Deep imports of internal modules MUST be unreachable through normal module resolution.
- Adapter packages MUST NOT export helpers that return substrate-typed values bypassing the port. Substrate-side operations live inside the adapter and are reached through documented helper paths (out-of-port) or not at all.
- Adapters MUST use upact's runtime primitives (`createSession`, `_unwrapSession`, `SubstrateUnavailableError`) rather than rolling alternative implementations.

The application's freedom to import substrate libraries directly is preserved — that is a transparent coupling, visible in `package.json` and reviewable in code. What §7.5 closes is the asymmetric case where an application uses upact's surface AND quietly cheats the contract through adapter-internal access paths. The conformance bar at §7.5 keeps the binding genuine.

Conformance verification: adapter packages SHOULD ship a sixteen-vector reflection test (mirroring the pattern in `@prefig/upact-supabase/tests/back-channel.test.ts`) asserting that no sentinel substrate token leaks via any common reflection path. Such tests are the operational form of §7.5.

## §8. Identity lifecycle

Session lifecycle metadata surfaces through `lifecycle` on `Upactor` (§4.4). The field is optional; providers whose substrate has no intrinsic TTL omit it.

**The two patterns:**

- **Explicit TTL** (OIDC JWT `exp`, session-cookie `Max-Age`): providers populate `lifecycle.expires_at` with the absolute expiry time and set `lifecycle.renewable` to `'reauth'` (or `'represence'` for presence-renewal substrates). Providers SHOULD transparently refresh the session in `currentUpactor` when the token has expired and a refresh token is available; they SHOULD populate the updated expiry in the returned Upactor.
- **No intrinsic TTL** (Supabase server-side sessions, SimpleX profiles): providers omit `lifecycle`. The session remains valid until `invalidate` is called or the substrate revokes it.

Substrates with per-encounter rotation (a new `id` at each renewal) are covered by §6.4 and decision §12 D7; lifecycle modelling there waits for a shipped adapter.

## §9. Provider conformance statement

A provider claiming conformance:

1. SHALL ship a written conformance statement listing the version of this spec it conforms to and the capabilities it self-declares.
2. SHALL document its substrate, its threat model, and any deviations from the spec's SHOULD-clauses (its MUST-clauses are not negotiable).
3. SHALL document its `AuthError` mapping table (which substrate errors map to which §6.5 code).
4. SHALL pass a sixteen-vector reflection test on the adapter instance (per §7.5) and document the test's existence in the conformance statement.
5. SHALL pass the conformance test suite associated with its claimed version (test suite TBD; targeted for v0.2 or a funded follow-up).

A `CONFORMANCE.md` template ships in this repository with one filled-in example (the Supabase reference adapter).

## §10. Security considerations

Privacy minima reduce the attack surface for credential theft, account takeover, and data correlation at the application layer. They do not prevent compromise of the substrate or of the provider's own secrets.

This specification does not prescribe a single threat model. Different providers serve different threat models through their substrate choices. Deployments SHOULD select a provider whose threat model fits their deployment context. Concretely:

- **Casual coordination** (e.g. neighbourhood gatherings, alpha tests, community events) is well-served by Supabase-backed or OIDC-brokered providers; the substrate's leakiness is acceptable in exchange for simplicity and ergonomics.
- **Anonymous / pseudonymous coordination** is well-served by pre-conforming substrates such as SimpleX (anonymous unidirectional queues, no central directory). The substrate's natural shape is already aligned with upact's privacy minima.
- **Adversarial-context coordination** (e.g. activist organising, source protection, mutual aid in adverse-power contexts) requires providers with stronger substrates: threshold-attested across non-colluding operators, peer-to-peer matching with no registry, mutual-vouching within a defined social graph. These are different *protocols*, not different parameters of the same provider; sketches deferred until shipped adapters surface.

The capability vocabulary itself is open-ended; an application that branches on a capability inherits whatever threat-model implications that capability carries (e.g. `email` implies the substrate handles email, which has known correlation properties).

## §11. Versioning

This specification is versioned. v0.1 is the first public draft. Breaking changes between v0.x versions are permitted; v1.0 marks the first stable version.

Capabilities present in §5.1 are normative for v0.1. Capabilities outside §5.1 are advisory and follow registry conventions to be specified in v0.2. The registry MAY accept new capabilities on demonstrated implementation by at least two independent providers AND demonstrated consumption by at least one application.

Governance posture: v0.x decisions are made by the maintainer (Theodore Evans). At v1.0, decisions about the core capability vocabulary (§5.1) and MUST clauses (§7) move to a working group of ≥3 conforming-adapter authors. A *conforming-adapter author* is an organisation or individual who maintains a published `@prefig/upact-*` package that passes the sixteen-vector reflection test, has shipped a `CONFORMANCE.md` against a specific spec version, and has actively maintained the adapter (a PR or release in the last twelve months). The working group operates on rough consensus; when rough consensus is absent, the maintainer retains a casting vote. Capability-vocabulary additions and MUST-clause changes after v1.0 require a working-group decision plus implementation by ≥2 independent conforming adapters and consumption by ≥1 shipped application; MUST-clause changes additionally require a migration period during which the old behaviour remains valid.

## §12. Deferred decisions (the register)

v0.1 was scoped to what shipped adapters need. Items below were proposed but did not ship in v0.1 because no adapter required them yet. They reactivate when a shipped adapter forces the question.

| Decision | Substance | Why deferred from v0.1 |
|---|---|---|
| **D3 — `issueRenewal` semantics normative** | Pick identity-bound vs substrate-holder semantics as normative in §6.4 | Recommended Option A (identity-bound) per planning conversation; formal normative wording deferred until divergence between adapters becomes a consumer issue |
| **D7 — `continuation` field on Upactor** | Substrate-known transitions between identifiers (rotation, migration, rekey, reauth) | No shipped substrate currently emits transitions through the port. Reactivated when a substrate that does (Mastodon `Move`, Convex reactive rotation, etc.) ships an adapter. |
| **D8 — `watch` capability on the port** | `watch(context): AsyncIterable<Upactor \| null>` for substrate-side push events | Same as D7. Push-shaped substrates need an adapter first. |
| ~~**D9 — `issueRenewal` OPTIONAL in §6.4**~~ | **Closed v0.1.1.** Normative text added: providers MUST return `null` when renewal is unsupported. | Concrete need surfaced by OIDC adapter (some IDPs issue no refresh token). |
| ~~**D6 — `provenance` field on Upactor**~~ | **Closed v0.1.1.** `provenance: { substrate, instance? }` added to §4.5. | OIDC adapter needs cross-IDP discrimination at the port level. |
| ~~**F3 — Network-legible vs port-opaque identifier**~~ | **Closed v0.1.1.** The OIDC adapter holds `iss + sub` in closure for substrate-side calls; the port `id` is a hash-derived opaque string. The pattern is documented in §7.3 and the adapter's conformance statement. | Phase C adapter ships and names the pattern. |
| ~~**F6 — Lifecycle modelling has multiple shapes**~~ | **Closed v0.1.1.** Two patterns documented in §8: explicit-TTL and no-intrinsic-TTL. Per-encounter-rotation deferred (D7). | `lifecycle` field surfaces two real patterns shipped by OIDC adapter. |
| ~~**G1 — OIDC scope discipline**~~ | **Closed v0.1.1.** `@prefig/upact-oidc` ships `validateScopes` runtime guard and documents the scope allow-list in its conformance statement. | Phase C adapter ships with runtime enforcement. |
| **Convene + Reticulum substrate sketches in `docs/adapter-shapes.md`** | Speculative entries removed | No shipped adapter, no concrete consumer. Sketches return alongside their adapter. |

A Decision exits §12 when a shipped adapter has a concrete need for it (substrate-agnosticism: the change makes sense across at least one enforcement-camp and one pre-conforming substrate), the change preserves the §7 MUST NOTs (binding-integrity), and the spec amendments propagate to the §9 conformance template, the §10 security considerations, and this register where applicable (disclosure).

## §13. Non-normative appendix — provider sketches

Brief sketches of providers shipped or deferred against this port.

**Shipped at v0.1:**

- **`@prefig/upact-supabase`** — Supabase Auth substrate. Capabilities: `email`, `recovery` for users with email; `recovery` only for those without. Identity stable for the account lifetime; renewable via password reset. The port hides email, password, magic-links, JWT claims, `app_metadata`, `user_metadata` from the application; `capabilities.has('email')` gates email-bound features.

- **`@prefig/upact-simplex`** — SimpleX Chat substrate (anonymous unidirectional queues, no central directory). Capabilities: `[]` (no `email`, no `recovery`; substrate affordances for messaging and p2p-matching are real but documented in the adapter README rather than declared as capabilities, since no shipped consumer gates on them). Identity stable per loaded profile; renewable by re-loading the profile. No email, no recovery, no central user database.

**Shipped at v0.1.1:**

- **`@prefig/upact-oidc`** — generic OIDC client adapter delegating substrate-specific machinery to a substrate-side IDP (Authentik, Keycloak, ZITADEL, Dex). One adapter, many configured IDPs; substrate-specific machinery in IDP realm config rather than in adapter code. Adding a substrate (Mastodon-via-broker, GitHub-via-broker, etc.) becomes operational rather than code-level. Ships `lifecycle` (JWT `exp` → `expires_at`, `renewable: 'reauth'`), `provenance` (`substrate: 'oidc'`, `instance: issuer`), and runtime scope enforcement (`validateScopes`). 75 unit tests + 11 Dex integration tests.

**Shipped at v0.1.2:**

- **`@prefig/upact-mastodon`** — direct Mastodon REST API adapter (per-login instance discovery, dynamic OAuth client registration, no token expiry). Substrate is "any Mastodon-API-compatible server"; Mastodon proper validated, forks (Pleroma, Akkoma, GoToSocial) MAY work via API compatibility but are not validated at v0.1.0. Capabilities: `[]`. Lifecycle: `expires_at: undefined`, `renewable: 'reauth'` (Mastodon access tokens never auto-expire per F6). Provenance: `{ substrate: 'mastodon', instance: <origin> }`. Identifier derivation: `sha256(actor.url)[:32]` per F3. Exists alongside `@prefig/upact-oidc` rather than replacing it: deployments with a fixed instance keep Path B (OIDC + Authentik); deployments wanting fediverse-flexibility (any user-chosen instance) use this package. See `docs/adapter-shapes.md` for the deployment-shape table.

The application code does not change across these. The deployment chooses the provider; the port carries the rest.

---

*Document version: 0.1.2. AI-co-authored under disclosure (see authorship note above). Decision lineage is in `git log` and the §12 register.*
