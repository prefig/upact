# upact

A typed architectural contract between a social application and any identity provider. The application sees a small, capability-negotiated `Upactor`; the substrate (Supabase Auth, OIDC, peer-to-peer presence, threshold-attested) stays behind the port.

## Posture

upact is a self-binding contract. The privacy minima at the port — no email, no phone, no IP, opaque sessions, enumerated capabilities — are not features the substrate happens to hide. They are commitments the application has structurally given up the ability to violate. The architectural cost of breaking the contract later is what makes the commitment durable: an application built on upact cannot quietly pivot to surveillance-driven, data-retention-driven, or third-party-sharing-shaped revenue without ripping out foundations. The harshness is the point.

upact is not a replacement for OIDC clients (`auth.js`, `lucia`, `openid-client`), identity-broker IDPs (Authentik, Keycloak, ZITADEL), or identity protocols (DIDs, Verifiable Credentials). Those layers handle plumbing. upact is the typed-contract layer above them: what the application is permitted to know about the someone it serves, and what it has bound itself out of knowing.

## Why upact

The values commitment is what motivates platforms to consider signing the upact in the first place. These benefits accrue to every adopter who honours the contract, regardless of whether the values posture is what brought them in:

- **A small, well-defined identity surface.** The `Upactor` type has three fields. Substrate-shaped User types typically have thirty or more. Tighter signatures, less autocomplete noise, less to grep when reasoning about identity flow.
- **Trivial to mock for tests.** Mocking identity becomes a small literal. No need to mock substrate-specific clients with all their methods.
- **Reduced surface for accidental privacy violations.** If application code can't read `email`, it can't accidentally include it in logs, metrics, error reports, SSR-rendered HTML, or analytics events. The architectural constraint is a debugging-and-monitoring privacy assurance for free.
- **Bounded incident-response surface.** When auditing "what did this code path see about the user?", the answer is the `Upactor` shape — a small, known artefact rather than a sprawling substrate User object.
- **Audited opacity primitives, free.** Sessions cannot be unwrapped via `JSON.stringify`, `structuredClone`, `util.inspect`, or other inspection vectors. The runtime kernel is centrally tested across sixteen vectors; every conforming adapter inherits the guarantee.
- **Substrate-portable capability checks.** `identity.capabilities.has('email')` works the same against Supabase, SimpleX, any OIDC-brokered provider. Substrate-specific code paths collapse into one.
- **Cleaner failure modes.** Substrate outages surface as `SubstrateUnavailableError`, distinct from "no current user." Render outage-specific UI without inspecting error message strings.
- **Onboarding clarity for new contributors.** The identity layer is small and well-documented. New team members grok how identity flows in minutes.
- **The constraint as decision-clarification.** When considering a feature that would need substrate-rich data, the binding forces an explicit choice: do without, add the feature outside upact (visible substrate coupling), or rip out the binding. The discipline is itself a benefit.
- **A pre-written audit artefact.** When a third party (legal, compliance, regulator, partner) asks "what does your application know about users?", the conformance statement is the answer.

The values-posture commitment is what motivates *some* adopters; these ergonomics reward every adopter who honours the contract.

## Adapters

| Package | Substrate | Camp | Status |
|---|---|---|---|
| `@prefig/upact-supabase` | Supabase Auth | Enforcement | v0.1.0 shipped |
| `@prefig/upact-simplex` | SimpleX Chat daemon | Pre-conforming | v0.1.0 shipped |
| `@prefig/upact-oidc` | Any OIDC-compliant IDP (Dex, Authentik, Keycloak, ZITADEL) | Enforcement | v0.1.0 shipped |

## Adopters

| Application | Substrate | Notes |
|---|---|---|
| [dyad.berlin](https://dyad.berlin) | `@prefig/upact-supabase` | First adopter; M1 integration in progress |

If your application uses upact, open a PR to add it here.

## In this repo

- `SPEC.md` — normative specification, v0.1.
- `src/types.ts` — reference TypeScript types (`Upactor`, `IdentityPort`, `AuthError`, `Capability`, `Session`).
- `src/runtime.ts` — small runtime kernel. Exports `createSession`, the canonical factory that produces opaque `Session` values per SPEC.md §7.4. Adapter authors should use it rather than maintain their own opaque-wrapper class — the opacity guarantee is centralised here, audited once.
- `docs/adapter-shapes.md` — type-only sketches of the v0.1 shipped adapters (Supabase, SimpleX, OIDC).
- `docs/cross-adapter-findings.md` — cross-substrate observations that shaped the spec.
- `examples/sveltekit-supabase/` — minimal SvelteKit + Supabase integration showing the three key wiring points: hook, type augmentation, and capability-gated page load.
- `CONTRIBUTING.md` — the five-test contributor audit, AI-Involvement trailer convention.
- `GOVERNANCE.md` — v0.x maintainer posture and v1.0 working-group target.
- `CONFORMANCE.md` — conformance statement template with filled-in examples for both v0.1 adapters.
- `CHANGELOG.md` — per-version change record.
- `ROADMAP.md` — open and closed decisions.

## Status

v0.1.1. Three reference adapters shipped. Breaking changes between v0.x revisions are permitted; v1.0 marks the first stable version.

## Licence

Dual-licensed:

- **`SPEC.md`, `docs/`, this README, and other prose** — CC BY 4.0 (see `LICENSE`).
- **`src/` (TypeScript types and runtime kernel)** — Apache-2.0 (see `LICENSE-CODE`).

Each `src/*.ts` file carries an `SPDX-License-Identifier: Apache-2.0` header. The split follows TC39 / SPDX precedent: spec text is intellectual property meant to be cited and forked under CC; runtime code is software under a conventional permissive licence with a patent grant.
