# upact

A typed architectural contract between a social application and any identity provider. The application sees a small, capability-negotiated `UserIdentity`; the substrate (Supabase Auth, OIDC, presence-renewed ephemeral, threshold-attested, peer-to-peer) stays behind the port.

## In this repo

- `SPEC.md` — normative specification, v0.1-draft.
- `src/types.ts` — reference TypeScript types.
- `docs/adapter-shapes.md` — type-only sketches of Supabase, Convene, fediverse (DID-based), SimpleX, and Reticulum adapters.

## Adapters

`@prefig/upact-supabase` is the first reference adapter, at [github.com/prefig/upact-supabase](https://github.com/prefig/upact-supabase). OIDC, DID, and Convene adapters will follow.

## Status

v0.1-draft. Breaking changes between v0.x revisions are permitted; v1.0 marks the first stable version.

## Licence

CC BY 4.0.
