# Changelog

All notable changes to this project are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses [semantic versioning](https://semver.org/) from v1.0.0 onward; v0.x breaking changes are permitted between minor versions.

---

## [Unreleased]

## [0.2.0] — 2026-08-31

### Changed (breaking)

- **Per-adapter session boxes replace the global session API.** `createSessionBox(): { seal, unseal }` is exported from `@prefig/upact/internal`; each adapter creates its own box in its factory closure and can unseal only sessions it sealed. `createSession` (main entry) and `_unwrapSession` (`./internal`) are removed. `unseal` is total: it returns the sealed reference for this box's sessions and `undefined` for everything else, and never throws; `seal(undefined)` throws so `undefined` unambiguously means "not sealed by this box"; `seal(null)` round-trips (adapters that may seal `null` check `=== undefined`, never truthiness). SPEC §7.4/§7.5 rewritten accordingly; §7.5 no longer names concrete symbols as a MUST, resolving the earlier MAY/MUST tension with §7.4.
- Hardening note: under the global WeakMap, any importer of `@prefig/upact/internal` could unseal any session in the process, including sessions another adapter sealed (e.g. `respondToWallet` unwrapping a Supabase session as EUDI session data). Per-instance boxes close both the application escape hatch and the cross-adapter confusion. A session is now meaningful only to the adapter instance that created it.

### Removed

- `UserIdentity` deprecated alias (announced for v0.2 at its deprecation).

### Fixed

- `jsr.json` synced to the package version (was stale at 0.1.0).

### Release order (0.2.0 train)

Publish core `@prefig/upact` 0.2.0 first (npm under a `next` dist-tag if staging; JSR has no dist-tags, so stage there with `0.2.0-rc.N` if needed — JSR cannot unpublish). Then the eight adapters at 0.2.0 with peer `^0.2.0`, then promote dist-tags, then a clean `npm install` smoke test of one adapter from the registry. Mixed installs (new adapter, old core pinned by the app) do not fail at install time: npm nests a private core copy under the adapter. Same-instance session flows stay correct under duplication (a session is meaningful only to the adapter instance that sealed it), but bump the whole train together.

### Fixed (documentation accuracy pass, 2026-08-28)

- Corrected the runtime-kernel test description: nine reflection vectors plus frozen-state immutability and the `_unwrapSession` escape hatch (`tests/runtime.test.ts`); the sixteen-case count belongs to the adapter back-channel suite. Affected `README.md`, `SPEC.md` §7.4, `CONFORMANCE.md`.
- Rewrote citations of Decisions 10/11/12 (which lived in the deleted `ROADMAP.md`) to cite the normative clauses directly (§6, §7.5, the Path B exception). Affected `SECURITY.md` and `docs/`.
- Removed the unshipped `cascade_on_identity_expiry` annotation and its "SPEC §9" citation from the workshop docs; §9 is the conformance statement.
- Corrected `SPEC §4` → `§3.1` (authorization out of scope) and `§10` → `§9` (conformance statement) miscites.
- Adapter table: all seven adapters at v0.1.1; EUDI row scoped to "OpenID4VP 1.0 relying party, ecosystem in pilot until Dec 2026".
- `SPEC.md` §13: added ember, eudi, atproto entries; footer version aligned.
- Factual corrections from an external fact-check: Supabase Auth ids are GoTrue `uuid.NewV4()` (not `gen_random_uuid()`); SimpleX `agentUserId` is an Int64 row id, not a UUID (identifier-derivation prose now states the confirmability consequence); Pleroma/Akkoma/GoToSocial described as independent Mastodon-API-compatible implementations, not forks; `lucia` (deprecated, never an OIDC client) replaced in the README client list; TC39 licensing precedent claim replaced with the SPDX project's actual spec/code split, with a note that CC BY 4.0 grants no patent rights.
- Workshop docs reframed as standalone materials (the DWeb Camp 2026 session has passed); removed the four-week write-up promise.
- Security contact moved to fiore@prefig.tech; supply-chain delegation no longer points at adapter security policies that do not exist.

## [0.1.3] — 2026-07-16

### Added

- `PresentationRequest` and `Presentation` types: the presentation evidence contract an adapter consumes as authentication or renewal evidence (documented in `src/types.ts`; first included in the 2026-07-14 npm build of 0.1.2, recorded here for the register).

### Changed

- Package description and README copy pass: affirmative framing, current adapter table (all seven shipped adapters), published-install instructions.
- `SPEC.md`: stripped audit-framing references in §4, §5.1, §11, §12, §13 prose, leaving the substantive content intact. The footer no longer points at deleted documents.
- `package.json` `files` array: drops the deleted documents from the published package.

### Removed

- `CONTRIBUTING.md`, `GOVERNANCE.md`, `ROADMAP.md`. Load-bearing content folded into `README.md` (maintenance posture, commit conventions including the `Co-Authored-By:` exclusion) and `SPEC.md` (working-group definition self-contained in §11; authorship note self-contained at the top). Decision lineage lives in `git log` and the `SPEC.md` §12 register. The Decision 12 deployment-shape table moved to `docs/adapter-shapes.md`. The repo's earlier institutional shape exceeded what a single-maintainer experiment in v0.x earns.

---

## [0.1.2] — 2026-05-04

Documentation-only release in this package. The substantive change is a new external adapter (`@prefig/upact-mastodon`) shipped separately.

### Added

- ROADMAP Decision 12 (closed): multi-instance fediverse exception to Path B. The default adapter strategy (Path B / OIDC + Authentik) is incompatible with substrates whose UX requires per-login instance flexibility; `@prefig/upact-mastodon` is the first direct adapter shipped under this exception.
- `SPEC.md §13` non-normative entry for `@prefig/upact-mastodon`.
- `docs/adapter-shapes.md`: Mastodon column added to the comparison table; Mastodon-specifics section documents the per-login instance discovery + dynamic OAuth client registration pattern; F2 (per-user-session binding) is now empirically observed in two shipped adapters rather than predicted.
- `docs/cross-adapter-findings.md`: H1 confirmation note for F1/F2/F3/F6/G1 (originally Mastodon-as-analysis findings; now empirically supported by the shipped adapter).
- `README.md`: `@prefig/upact-mastodon` row added to the Adapters table.

### Changed

- ROADMAP line 13 (adapter strategy): nuanced from blanket "Path B for all OIDC-shaped substrates" to "Path B for stable per-deployment instance configuration; direct adapters for per-login instance flexibility per Decision 12."

### Unchanged (explicit non-changes)

- No changes to `SPEC.md §1` through `§12` (normative spec text).
- No changes to `src/types.ts`, `src/runtime.ts`, `src/errors.ts`, `src/index.ts`, or any test under `tests/`.
- No changes to the capability vocabulary (still `'email' | 'recovery'`).
- No changes to MUST clauses in §7.

The runtime kernel is unchanged from v0.1.1.

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
