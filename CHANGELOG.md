# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [semantic versioning](https://semver.org/) from v1.0.0 onward; v0.x breaking changes are permitted between minor versions.

---

## [0.1.1] — 2026-05-01

Additive spec amendments: lifecycle and provenance on `Upactor`. Ships `@prefig/upact-oidc` as the third reference adapter.

### Added

- `IdentityLifecycle` type: `{ expires_at?: Date; renewable: 'reauth' | 'represence' | 'never' }`. Optional on `Upactor.lifecycle`; the OIDC adapter populates it from JWT `exp`. Non-OIDC adapters may omit it.
- `Upactor.provenance?: { substrate: string; instance?: string }` — cross-IDP disambiguation; the OIDC adapter populates it from the OIDC issuer URL. Optional; non-OIDC adapters may omit it.
- `@prefig/upact-oidc`: OIDC reference adapter. PKCE (S256), signed-cookie state, transparent session refresh, scope policy that structurally excludes `email` / `phone` / `address` / `groups` at construction time.

---

## [0.1.0] — 2026-05-01

First public draft. Establishes the `Upactor` primitive, the `IdentityPort` contract, the `AuthError` vocabulary, and the Session opacity guarantee. Ships with two reference adapters (`@prefig/upact-supabase`, `@prefig/upact-simplex`) and the five-test contributor audit.

### Added

- `Upactor` type: `{ id: string; display_hint?: string; capabilities: ReadonlySet<Capability> }` — the minimal port-facing identity object. Named to draw on the UML Actor lineage and the upact brand.
- `Capability` vocabulary: `'email' | 'recovery'` (audit-trimmed; extensible via §5.2 registry process at v0.2+).
- `IdentityPort` interface: `authenticate`, `currentUpactor`, `invalidate`, `issueRenewal`.
- `AuthError` and `AuthErrorCode`: normative six-member error vocabulary (`credential_invalid`, `credential_rejected`, `substrate_unavailable`, `identity_unavailable`, `rate_limited`, `auth_failed`).
- `Session` type and `createSession` factory: opaque runtime value that passes sixteen-vector reflection suite in `tests/runtime.test.ts`.
- `SubstrateUnavailableError`: typed error class for adapter-to-application substrate failure signalling.
- `SPEC.md`: first public draft, covering Upactor (§4), capability vocabulary (§5), port operations (§6), Session opacity and adapter conformance (§7), security considerations (§10), and the deferred-decisions register (§12).
- `CONTRIBUTING.md`: five-test contributor audit and AI-Involvement trailer convention.
- `GOVERNANCE.md`: v0.x maintainer posture and v1.0 working-group target.
- `CONFORMANCE.md`: conformance template with filled-in Supabase reference adapter example.
- `docs/adapter-shapes.md`: Supabase (enforcement camp) and SimpleX (pre-conforming) adapter shape sketches; OIDC forward-looking sketch for Phase C.
- `docs/cross-adapter-findings.md`: F1–F4, F6, G1 cross-substrate observations.

### Changed

- `UserIdentity` deprecated in favour of `Upactor`. The alias `UserIdentity = Upactor` remains for v0.1.x compatibility and will be removed in v0.2.

### Removed (from earlier drafts)

- Speculative capability vocabulary entries (`messaging`, `p2p_matching`, `presence`) — no concrete consumer per audit; SimpleX ships with `[]`.
- Convene, Reticulum, and fediverse-DID adapter sketches — no shipped adapter, no concrete consumer; return to `docs/adapter-shapes.md` when their adapters ship.
