# upact

A typed architectural contract between a social application and any identity provider. The application sees a small, capability-negotiated `Upactor`; the substrate (Supabase Auth, OIDC, peer-to-peer presence, etc.) stays behind the port.

## Posture

upact is named for the Ulysses pact that adopters make when building privacy-first social technologies that are architecturally hostile to extractive practices.

upact is a minimum-disclosure anti-corruption layer between your application and any supported identity-management substrate. The privacy minima at the port (no email, no phone, no IP, opaque sessions, enumerated capabilities) are commitments the application can no longer violate *through the upact-shaped path*. An application built on upact cannot quietly pivot to surveillance-driven, data-retention-driven, or third-party-sharing-shaped revenue *through the identity layer* without visible architectural change. Pivots reachable through direct substrate-library import remain a code-review concern, not an architectural one — see §7.5 below and `SECURITY.md` for the limit.

The constraint also shapes design. When the application cannot know a user's email, you build features that don't need it. This provides friction against reflexes inherited from an extraction- and retention-shaped social media ecosystem. That friction matters especially with LLM-assisted development, where those patterns are efficiently automated by tools trained on that ecosystem.

upact is not a replacement for OIDC clients (`auth.js`, `lucia`, `openid-client`), identity-broker IDPs (Authentik, Keycloak, ZITADEL), or identity protocols (DIDs, Verifiable Credentials). It is the typed-contract layer that sits on top of these substrates and provides a contract on what the application is permitted to know and what it has bound itself out of knowing.

## Why upact

The values commitment is what motivates platforms to consider adopting upact. These benefits accrue to every adopter who honours the contract, regardless of whether the values posture is what brought them in:

- **Design discipline.** Structural limits on what you can know force design principles and features that don't depend on data you shouldn't have.
- **A small, well-defined identity surface.** The `Upactor` type has three fields. Substrate-shaped User types typically have >=30.
- **Reduced surface for accidental privacy violations along the upact-shaped path.** Code that uses `currentUpactor` cannot accidentally include email in logs, metrics, error reports, SSR-rendered HTML, or analytics events. Code that calls the substrate directly remains a code-review concern; treating substrate-library imports as a marked, audited boundary (e.g. only allowed in the substrate seam, forbidden in service code) extends the guarantee to the rest of the application.
- **Audited opacity primitives.** Sessions cannot be unwrapped via `JSON.stringify`, `structuredClone`, `util.inspect`, or other inspection vectors. The runtime kernel is centrally tested across sixteen vectors; every conforming adapter inherits the guarantee.
- **Swap identity providers without re-architecting the identity layer.** The port carries your privacy posture across providers — switch from Supabase Auth to an OIDC-brokered provider and the application's identity-shaped call sites are unchanged. Substrate concerns outside identity (data access, RLS, jobs, admin tooling) remain substrate-coupled by design — upact does not abstract data access.
- **A pre-written audit artefact for the identity boundary.** When a third party (legal, compliance, regulator, partner) asks "what does your application know about users?", the conformance statement documents what the adapter returns. It narrows but does not replace an application-level audit, since application code remains free to import substrate libraries directly per §7.5.

## Limits — what upact does not prevent

upact closes the identity boundary architecturally. It does not, by itself, prevent application-level misuse of the substrate:

- An application that ignores upact and calls the substrate library directly (e.g. `supabase.auth.getUser()`) gets back whatever the substrate exposes, including email and other fields the port would have stripped. upact's binding holds only for code that consumes `Upactor` values from the port.
- The application's freedom to import substrate libraries is preserved (§7.5). That coupling is transparent — visible in `package.json` and in code review — but it is not architecturally blocked.
- Authorization (admin, moderator, operator) is out of scope for the port (§3.1). upact does not provide a permissions model.

The discipline that makes the binding stick: treat substrate-library imports as a marked, audited boundary in the application — only allowed in the substrate seam (the adapter, the auth callback handler), forbidden everywhere else. A future v0.2 conformance test suite will mechanise this; today it is convention. See `SECURITY.md` for the full scope.

## Usage

```typescript
import type { IdentityPort } from '@prefig/upact';
import { SubstrateUnavailableError } from '@prefig/upact';

// authenticate returns Session | AuthError — discriminate on 'code':
const result = await port.authenticate({ kind: 'password', email, password });
if ('code' in result) {
  switch (result.code) {
    case 'credential_rejected': /* wrong password */ break;
    case 'rate_limited':        /* back off */ break;
    default:                    /* substrate_unavailable, auth_failed */ break;
  }
  return;
}
// result is an opaque Session

// currentUpactor returns null when logged out; throws SubstrateUnavailableError when the substrate is unreachable:
try {
  const actor = await port.currentUpactor(request);
  if (!actor) { /* not logged in */ return; }
  if (actor.capabilities.has('email')) { /* capability gated */ }
} catch (err) {
  if (err instanceof SubstrateUnavailableError) { /* show maintenance page */ }
}
```

`authenticate` communicates auth failures as return values (`AuthError`) — it never throws for wrong passwords or rate limits. `currentUpactor` and `issueRenewal` throw `SubstrateUnavailableError` for substrate outages — they never return error values. The asymmetry is deliberate: auth failures are expected control-flow; substrate outages are exceptional conditions.

## Adapters

| Package | Substrate | Camp | Status |
|---|---|---|---|
| `@prefig/upact-supabase` | Supabase Auth | Enforcement | v0.1.0 shipped |
| `@prefig/upact-simplex` | SimpleX Chat daemon | Pre-conforming | v0.1.0 shipped |
| `@prefig/upact-oidc` | Any OIDC-compliant IDP (Dex, Authentik, Keycloak, ZITADEL) | Enforcement | v0.1.0 shipped |

## Adopters

| Application | Substrate | Notes |
|---|---|---|
| [dyad.berlin](https://dyad.berlin) | `@prefig/upact-supabase` | Reference adopter; FK chain and RLS layer substrate-agnostic, application routes return `Upactor` |

If your application uses upact, open a PR to add it here.

## In this repo

- `SPEC.md` — normative specification, v0.1.
- `src/types.ts` — reference TypeScript types (`Upactor`, `IdentityPort`, `AuthError`, `Capability`, `Session`).
- `src/runtime.ts` — small runtime kernel. Exports `createSession`, the canonical factory that produces opaque `Session` values per SPEC.md §7.4. Adapter authors should use it rather than maintain their own opaque-wrapper class; the opacity guarantee is centralised here, audited once.
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
