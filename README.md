# upact

A provider-agnostic identity port for TypeScript web apps. The application sees a small, capability-negotiated `Upactor`; the substrate (Supabase Auth, OIDC, an identity wallet, peer-to-peer presence) stays behind the port.

## Posture

upact is named for the Ulysses pact that adopters make when building privacy-first social technologies that are architecturally hostile to extractive practices.

upact is a minimum-disclosure anti-corruption layer between your application and any supported identity-management substrate. The privacy minima at the port (no email, no phone, no IP, opaque sessions, enumerated capabilities) are commitments the application can no longer violate *through the upact-shaped path*. An application built on upact cannot quietly pivot the identity layer toward surveillance, retention, or third-party data-sharing without visible architectural change.

The port does not block pivots reachable through direct substrate-library import. Those remain visible to code review only. See §7.5 below and `SECURITY.md` for the limit.

The constraint also shapes design. When the application cannot know a user's email, you build features that don't need it. This provides friction against reflexes inherited from an extraction- and retention-shaped social media ecosystem.

upact sits on top of OIDC clients (`auth.js`, `lucia`, `openid-client`), identity-broker IDPs (Authentik, Keycloak, ZITADEL), and identity protocols (DIDs, Verifiable Credentials): a typed-contract layer over what the application is permitted to know and what it has bound itself out of knowing.

## Why upact

These benefits accrue to every application using upact, regardless of motivation:

- **Design discipline.** Structural limits on what you can know force design principles and features that don't depend on data you shouldn't have.
- **A small, well-defined identity surface.** The `Upactor` type carries a handful of fields; substrate-shaped User types carry dozens.
- **Privacy guarantees at call sites that use the port.** Code that uses `currentUpactor` cannot accidentally include email in logs, metrics, error reports, SSR-rendered HTML, or analytics events. Code that calls the substrate directly remains a code-review concern; treating substrate-library imports as a marked, audited boundary (e.g. only allowed in the substrate seam, forbidden in service code) extends the guarantee to the rest of the application.
- **Audited opacity primitives.** Sessions cannot be unwrapped via `JSON.stringify`, `structuredClone`, `util.inspect`, or other inspection vectors. The runtime kernel is centrally tested across sixteen vectors; every conforming adapter inherits the guarantee.
- **Swap identity providers without re-architecting the identity layer.** The port carries your privacy posture across providers. Switch from Supabase Auth to an OIDC-brokered provider, and the application's identity-shaped call sites are unchanged. Substrate concerns outside identity (data access, RLS, jobs, admin tooling) remain substrate-coupled by design; upact does not abstract data access.
- **A ready answer for compliance, legal, and regulator questions about user data.** When a third party asks "what does your application know about users?", the conformance statement documents what the adapter returns. It narrows but does not replace an application-level audit, since application code remains free to import substrate libraries directly per §7.5.

## Limits

upact closes the identity boundary architecturally. Application-level misuse of the substrate is not closed:

- An application that ignores the port and calls the substrate library directly (e.g. `supabase.auth.getUser()`) gets back whatever the substrate exposes, including email and other fields the port would have stripped. upact's binding holds only for code that consumes `Upactor` values from the port.
- The application's freedom to import substrate libraries is preserved (§7.5). That coupling is transparent (visible in `package.json` and reviewable in code), but the port does not block it.
- Authorization (admin, moderator, operator) is out of scope (§3.1). upact does not provide a permissions model.

The discipline that makes the binding stick: treat substrate-library imports as a marked, audited boundary, only allowed in the substrate seam (the adapter, the auth callback handler), forbidden in service code. A future v0.2 conformance test suite will mechanise this; today it is convention. See `SECURITY.md` for the full scope.

## Usage

```typescript
import type { IdentityPort } from '@prefig/upact';
import { SubstrateUnavailableError } from '@prefig/upact';

// authenticate returns Session | AuthError; discriminate on 'code':
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

`authenticate` communicates auth failures as return values (`AuthError`); it never throws for wrong passwords or rate limits. `currentUpactor` and `issueRenewal` throw `SubstrateUnavailableError` for substrate outages; they never return error values. The asymmetry is deliberate: auth failures are expected control-flow; substrate outages are exceptional conditions.

## Adapters

| Package | Substrate | Camp | Status |
|---|---|---|---|
| `@prefig/upact-supabase` | Supabase Auth | Enforcement | v0.1.0 shipped |
| `@prefig/upact-simplex` | SimpleX Chat daemon | Pre-conforming | v0.1.0 shipped |
| `@prefig/upact-oidc` | Any OIDC-compliant IDP (Dex, Authentik, Keycloak, ZITADEL) | Enforcement | v0.1.0 shipped |
| `@prefig/upact-mastodon` | Mastodon REST API (any user-chosen instance) | Enforcement | v0.1.0 shipped |
| `@prefig/upact-ember` | ember presence credentials (offline verifier) | Pre-conforming | v0.1.0 shipped |
| `@prefig/upact-eudi` | EUDI wallet, OpenID4VP relying party | Enforcement | v0.1.0 shipped |
| `@prefig/upact-atproto` | ATProto / Bluesky (DID-based OAuth) | Enforcement | v0.1.0 shipped |

## Adopters

| Application | Substrate | Notes |
|---|---|---|
| [dyad.berlin](https://dyad.berlin) | `@prefig/upact-supabase` | Reference adopter; database layer substrate-agnostic, application routes return `Upactor` |

If your application uses upact, open a PR to add it here.

## In this repo

- `SPEC.md`: normative specification, v0.1.
- `src/types.ts`: reference TypeScript types (`Upactor`, `IdentityPort`, `AuthError`, `Capability`, `Session`).
- `src/runtime.ts`: small runtime kernel. Exports `createSession`, the canonical factory that produces opaque `Session` values per SPEC.md §7.4. Adapter authors should use it rather than maintain their own opaque-wrapper class; the opacity guarantee is centralised here, audited once.
- `docs/adapter-shapes.md`: type-only sketches of the shipped adapters.
- `docs/cross-adapter-findings.md`: cross-substrate observations that shaped the spec.
- `examples/sveltekit-supabase/`: minimal SvelteKit + Supabase integration showing the three key wiring points: hook, type augmentation, and capability-gated page load.
- `CONFORMANCE.md`: conformance statement template with filled-in examples.
- `CHANGELOG.md`: per-version change record.

## Status

v0.1.2. Seven adapters shipped (see the table above). Breaking changes between v0.x revisions are permitted; v1.0 marks the first stable version.

Issues welcome at [github.com/prefig/upact/issues](https://github.com/prefig/upact/issues). At v1.0 the core capability vocabulary (§5.1) and MUST clauses (§7) move to a working group of ≥3 conforming-adapter authors (see `SPEC.md` §11).

## Commit conventions

Commits with substantive AI involvement carry an `AI-Involvement: <tier>` trailer recording the character of involvement (`autonomous` / `authored` / `collaborative` / `assisted` / `commit-message-only`), so readers can calibrate the provenance of normative content. The convention is most important on `SPEC.md`, `src/types.ts`, and capability-vocabulary changes.

upact does not use `Co-Authored-By:` for AI authorship. `Co-Authored-By:` claims human co-authorship; `AI-Involvement` records the character of involvement instead.

## Licence

Dual-licensed:

- **`SPEC.md`, `docs/`, this README, and other prose**: CC BY 4.0 (see `LICENSE`).
- **`src/` (TypeScript types and runtime kernel)**: Apache-2.0 (see `LICENSE-CODE`).

Each `src/*.ts` file carries an `SPDX-License-Identifier: Apache-2.0` header. The split follows TC39 / SPDX precedent: spec text is intellectual property meant to be cited and forked under CC; runtime code is software under a conventional permissive licence with a patent grant.
