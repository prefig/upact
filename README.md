# upact

A typed architectural contract between a social application and any identity provider. The application sees a small, capability-negotiated `UserIdentity`; the substrate (Supabase Auth, OIDC, presence-renewed ephemeral, threshold-attested, peer-to-peer) stays behind the port.

## In this repo

- `SPEC.md` — normative specification, v0.1-draft.
- `src/types.ts` — reference TypeScript types.
- `src/runtime.ts` — small runtime kernel. Exports `createSession`, the canonical factory that produces opaque `Session` values per SPEC.md §7.4. Adapter authors should use it rather than maintain their own opaque-wrapper class — the opacity guarantee is centralised here, audited once.
- `docs/adapter-shapes.md` — type-only sketches of Supabase, Convene, fediverse (DID-based), SimpleX, and Reticulum adapters.

## Adapters

`@prefig/upact-supabase` is the first reference adapter, at [github.com/prefig/upact-supabase](https://github.com/prefig/upact-supabase). OIDC, DID, and Convene adapters will follow.

## Status

v0.1-draft. Breaking changes between v0.x revisions are permitted; v1.0 marks the first stable version.

## Licence

Dual-licensed:

- **`SPEC.md`, `docs/`, this README, and other prose** — CC BY 4.0 (see `LICENSE`).
- **`src/` (TypeScript types and runtime kernel)** — Apache-2.0 (see `LICENSE-CODE`).

Each `src/*.ts` file carries an `SPDX-License-Identifier: Apache-2.0` header. The split follows TC39 / SPDX precedent: spec text is intellectual property meant to be cited and forked under CC; runtime code is software under a conventional permissive licence with a patent grant.
