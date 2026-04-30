# upact — Identity Port Specification

**Version:** 0.1-draft
**Status:** Working draft. Not yet stable.
**License:** CC BY 4.0

---

## §1. Overview

This document specifies the *identity port* — a typed architectural contract between a social application and any identity provider. The port enforces minimum disclosure architecturally: even when the underlying provider exposes more, an application that conforms to this specification cannot consume what the port does not permit.

The port is intended to be small enough that any reasonable identity substrate — long-lived account-based providers (e.g. OAuth/OIDC), ephemeral presence-renewed providers, threshold-attested providers, peer-to-peer matching providers — can implement it with substrate-appropriate semantics, while the application layer remains substrate-agnostic.

This is the dual of selective-disclosure self-sovereign identity. SSI puts disclosure control at the *user* side: the application asks for what it wants, the user permits or denies. This specification puts a hard bound at the *application* side: the application architecturally cannot ask for what is outside the port, even if the user would permit it.

## §2. Terminology

- **Application** — software that consumes identities to serve users.
- **Provider** — software that issues, attests, renews, and invalidates identities.
- **Substrate** — the implementation technology a provider is built on (database, OIDC server, blockchain, etc.).
- **Identity** — a `UserIdentity` value as defined in §4. The application's view of "who is this."
- **Session** — provider-defined credential exchange artefact; opaque to the application.
- **Capability** — a self-described provider feature (§5).

The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## §3. Conformance

A **provider** conforms to this specification when it:

- exposes the four operations defined in §6,
- returns `UserIdentity` values matching §4,
- self-describes capabilities using the vocabulary in §5,
- honours every MUST NOT clause in §7.

An **application** conforms to this specification when it:

- consumes only `UserIdentity` values returned by a conforming provider,
- branches behaviour only on capability presence (§5), never on substrate identity, provider type, or out-of-band knowledge of the provider,
- honours the data-model contract in §9.

Conformance is to a specific version of the spec.

## §4. Identity

A `UserIdentity` is a value of the following shape:

```ts
interface UserIdentity {
  id: string;
  display_hint?: string;
  lifecycle: IdentityLifecycle;
  capabilities: ReadonlySet<Capability>;
}

interface IdentityLifecycle {
  issued_at: string;          // ISO 8601
  expires_at?: string;        // ISO 8601
  renewable: 'reauth' | 'represence' | 'never';
}
```

### §4.1 `id`

An opaque identifier, stable for the lifetime of this identity. The identity MAY be re-issued with a new `id` if the lifecycle's `renewable` mode produces a new identity (e.g. a presence-renewed provider may issue a new `id` at each renewal).

The `id` MUST be opaque to the application. Applications MUST NOT parse, decompose, or attribute meaning to the `id` beyond equality comparison.

### §4.2 `display_hint`

An optional, best-effort string the application MAY render to other users when no petname is available. It MUST NOT be assumed unique. Applications SHOULD prefer petnames or local nicknames where the receiver has set them.

Display hints MUST NOT be email addresses, phone numbers, or other contact identifiers. They are display-only.

### §4.3 `lifecycle`

`issued_at` MUST be the time at which this `id` first became valid.

`expires_at`, when present, indicates the time at which this identity will cease to be valid. Applications MUST treat any data tied to the identity (per §9) according to the lifecycle.

`renewable` indicates how the identity may be refreshed:

- `'reauth'` — by re-presenting credentials (e.g. password, OIDC reauth)
- `'represence'` — by participating in a fresh presence event (e.g. a Convene encounter)
- `'never'` — the identity is one-shot; once expired it cannot be reissued with the same `id`

### §4.4 `capabilities`

See §5.

## §5. Capabilities

Capabilities are self-described provider features. The application uses capability presence to gate behaviour. The application MUST NOT branch on substrate identity, provider type, or any out-of-band knowledge of the provider.

### §5.1 Core capability vocabulary (v0.1)

| Capability | Meaning |
|-----------|---------|
| `email` | The provider can deliver email to this identity. |
| `push` | The provider can deliver web push notifications to this identity. |
| `webauthn` | The provider can verify WebAuthn assertions for this identity. |
| `presence_renewal` | The identity is renewable through a fresh presence event. |
| `threshold_attestation` | The identity's lifecycle is attested across non-colluding operators. |
| `p2p_matching` | The provider supports matching without a central registry. |
| `recovery` | The provider supports identity recovery flows. |

### §5.2 Capability extension

Providers MAY self-declare capabilities outside the core vocabulary. Applications SHOULD treat unknown capabilities as absent.

A capability registry is maintained out-of-band. Convergence happens through use; capabilities that see broad implementation across providers move into a future revision of the core vocabulary.

### §5.3 Capability access

A capability does not, by itself, grant the application access to the substrate's underlying mechanism. To use a capability, the application invokes a separate, capability-bound operation (e.g. `EmailChannel.send(identity, message)`) defined per-capability and outside the scope of this document. The application MUST NOT bypass the capability boundary by reaching into the provider's substrate directly.

## §6. Operations

A provider implements the following four operations:

```ts
interface IdentityPort {
  authenticate(credential: unknown): Promise<Session | AuthError>;
  currentIdentity(request: Request): Promise<UserIdentity | null>;
  invalidate(session: Session): Promise<void>;
  issueRenewal(identity: UserIdentity, evidence: unknown): Promise<UserIdentity | null>;
}
```

### §6.1 `authenticate(credential)`

Establishes a session from a provider-shaped credential (password + email, OIDC code, presence-event proof, threshold attestation, etc.). Returns a `Session` on success or an `AuthError` on failure. The shape of `credential` is provider-defined; the application either knows the shape because it is wired to that provider, or accepts the provider's UI to gather it.

The returned `Session` is opaque to the application; the application uses `currentIdentity` to obtain the `UserIdentity`.

### §6.2 `currentIdentity(request)`

Returns the `UserIdentity` currently associated with a request, or `null` if none.

The provider extracts the session credential from the request (cookie, header, etc.) according to its own conventions, validates it, and returns a fresh `UserIdentity` value.

### §6.3 `invalidate(session)`

Invalidates the session. Subsequent calls to `currentIdentity` with a request bearing the same session MUST return `null`. The provider MAY cascade invalidation to associated identities.

### §6.4 `issueRenewal(identity, evidence)`

Renews an existing identity, returning either a renewed identity (which MAY have a new `id`) or `null` if renewal is not possible. The shape of `evidence` is per-provider — for `'represence'` providers it is a fresh presence event; for `'reauth'` it is fresh credentials.

If the renewed identity has a new `id`, the application MUST treat data tied to the previous `id` according to the data-model contract in §9.

## §7. Privacy minima (normative MUST NOT clauses)

These clauses are normative. A conforming provider MUST observe them.

### §7.1 No identifiers outside the contract

The `UserIdentity` value MUST NOT contain:

- email addresses
- phone numbers
- legal-name fields (`first_name`, `last_name`, etc.)
- date-of-birth fields
- IP addresses
- device identifiers
- any field of `app_metadata` or `user_metadata` beyond what this specification permits

If the substrate exposes such fields (Supabase Auth, OIDC, etc.), the provider's implementation of the port MUST strip them before returning a `UserIdentity` value.

### §7.2 No silent enrichment

Providers MUST NOT add fields to `UserIdentity` that are not part of this specification. Future versions of this specification may add fields; providers conforming to a specific version MUST NOT include fields from later versions in values returned to applications conforming to the earlier version.

### §7.3 No correlation handles

The `id` field MUST NOT be derivable from any user-supplied identifier (email, phone) by the application. Providers SHOULD use opaque random identifiers; if a provider derives `id` from a stable user attribute, the derivation MUST NOT be reversible by the application, and the provider MUST document the derivation in its conformance statement.

### §7.4 No substrate exposure through Session

The `Session` value MUST be opaque to the application. Applications MUST NOT decompose, decode, or extract claims from a `Session` directly; the only valid use is to pass it back to the port (e.g. for `invalidate`). Substrate-shaped session structures (JWTs with claims, cookies with metadata) are an implementation detail of the provider.

## §8. Identity lifecycle

Identities have a lifecycle defined by §4.3. Applications MUST honour the lifecycle:

- An expired identity MUST NOT be treated as valid. `currentIdentity` MUST NOT return an expired identity.
- A `'never'`-renewable identity, once invalidated or expired, MUST NOT be reissued with the same `id`.
- A `'represence'`-renewable identity MAY have its `id` changed at each renewal at the provider's discretion. The application MUST be prepared for `id` rotation across renewals.

## §9. Decay-aware data model

The application's persisted data model MUST treat every record that references an identity according to one of two contracts:

```ts
interface IdentityDecayAware {
  belongs_to_identity: string;
  cascade_on_identity_expiry: 'preserve' | 'expire';
}
```

### §9.1 `'preserve'`

The record persists past identity expiry. Examples: published content the application chooses to keep accessible after the author's identity has expired (rendered with anonymised author display); audit-trail records that survive deletion for legal reasons.

When the identity expires, the application MUST replace any identity-bearing fields in the record with a tombstone value or anonymised display, according to the application's policy.

### §9.2 `'expire'`

The record expires with the identity. Examples: draft content; pending invitations; presence-only ephemeral state.

When the identity expires, the application MUST delete or expire-mark the record within a documented retention window.

### §9.3 No silent permanence

Applications MUST NOT rely on `id` permanence for records not annotated as `'preserve'`. If an identity has `renewable: 'represence'` and the application persists records under its `id`, the application MUST handle id-rotation at renewal — typically by tying records to a renewable parent identity (out of band) or by accepting that records expire on each renewal.

## §10. Provider conformance statement

A provider claiming conformance:

1. SHALL ship a written conformance statement listing the version of this spec it conforms to and the capabilities it self-declares.
2. SHALL document its substrate, its threat model, and any deviations from the spec's SHOULD-clauses (its MUST-clauses are not negotiable).
3. SHALL pass the conformance test suite associated with its claimed version (test suite TBD; targeted for v0.2).

## §11. Security considerations

Privacy minima reduce the attack surface for credential theft, account takeover, and data correlation at the application layer. They do not prevent compromise of the substrate or of the provider's own secrets.

This specification does not prescribe a single threat model. Different providers serve different threat models through their substrate choices. Deployments SHOULD select a provider whose threat model fits their deployment context. Concretely:

- **Casual coordination** (e.g. neighbourhood gatherings, alpha tests, community events) is well-served by Supabase-backed or Convene-style providers; the substrate's leakiness is acceptable in exchange for simplicity.
- **Adversarial-context coordination** (e.g. activist organising, source protection, mutual aid in adverse-power contexts) requires providers with stronger substrates: threshold-attested across non-colluding operators, peer-to-peer matching with no registry, mutual-vouching within a defined social graph. These are different *protocols*, not different parameters of the same provider.

The capability vocabulary itself is open-ended; an application that branches on a capability inherits whatever threat-model implications that capability carries (e.g. `email` implies the substrate handles email, which has known correlation properties).

## §12. Versioning and capability registry

This specification is versioned. v0.1 is a working draft. Breaking changes between v0.x versions are permitted; v1.0 marks the first stable version.

Capabilities present in §5.1 are normative for v0.1. Capabilities outside §5.1 are advisory and follow registry conventions to be specified in v0.2. The registry MAY accept new capabilities on demonstrated implementation by at least two independent providers.

## §13. Non-normative appendix — provider sketches

Brief sketches of providers against this port. These are illustrative; only Supabase-backed and Convene-v0 are implemented or near-implementation at the time of this draft.

**Supabase-backed.** Capabilities: `email`, `push`. Identity stable for the account lifetime; renewable via password reset (`'reauth'`). The port hides email, password, magic-links, and JWT claims from the application; `capabilities.has('email')` gates email-bound features.

**Convene v0.** Capabilities: `presence_renewal`. Identity stable for ~24h, renewable by participating in a fresh Convene encounter (proving co-presence with another identity via shared `encounter_secret`). No email, no recovery, no central user database. Threat model: low-to-medium-stakes coordination; semi-trusted registry operator. Suitable for casual gatherings; not suitable for activist organising or source protection.

**Threshold-attested ("Conspire").** Capabilities: `presence_renewal`, `threshold_attestation`. Identity attested by threshold cryptography across non-colluding operators. Attendance unfalsifiable to operators individually. Suitable for adversarial-context coordination where attendance lists are poison.

**Mutual-vouching.** Capabilities: `presence_renewal`. Identity issued by N existing identities vouching for a new one within a defined social graph. Suitable for tight-trust communities.

**Peer-to-peer.** Capabilities: `p2p_matching`. No registry; participants exchange `encounter_secret` directly via QR-code or NFC at the meeting. Suitable for high-trust low-scale settings; degrades gracefully without infrastructure.

The application code does not change across these. The deployment chooses the provider; the port carries the rest.

---

*Document version: 0.1-draft. Authored 2026-04-30, distilled from the synthesis at `~/prefig/rebuild/docs/2026-04-30-identity-port-pattern.md`.*
