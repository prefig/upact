# Contributing to upact

## Proposing changes

Open an issue before opening a PR if the change touches `SPEC.md`, `src/types.ts`, or the capability vocabulary. Adapter packages are independent repos under the `@prefig/` namespace; open issues on the relevant adapter repo for substrate-specific work.

Discussion happens in issues. Decisions land in commits. The commit message carries the decision; the issue carries the context.

## What counts as a spec change

A spec change affects every adapter that implements upact. Three constraints have to hold. A change that fails any of these isn't a spec change: either it's a substrate-specific concern that belongs in an adapter, or it's a contract revision that waits for the v1.0 working group per `GOVERNANCE.md`.

### Substrate-agnosticism

The change has to make sense for at least one enforcement-camp substrate (Supabase, OIDC, Mastodon: substrates that hold the privacy minima because the adapter strips fields) and at least one pre-conforming substrate (SimpleX, Reticulum: substrates whose natural shape already matches the minima).

A change that only works for one substrate shape is a substrate-specific extension. Adapters add fields to their own conformance documentation. They do not add fields to `Upactor` for their own substrate's convenience.

See `docs/adapter-shapes.md` for the substrate map.

### Binding-integrity

The change MUST preserve §7's MUST NOTs:

- §7.1: no email, phone, legal-name, IP, device-ID, or `app_metadata` / `user_metadata` blocks in `Upactor`.
- §7.2: no silent enrichment (fields beyond what the conformed-to spec version permits).
- §7.4: Session opacity (no decoded JWTs, no claim extraction at the application).
- §7.5: adapter back-channel closure (substrate clients held in closure, no enumerable instance properties).

A change that weakens any of these is a contract revision, not a v0.x amendment.

### Disclosure

If the change adds normative content adapters must observe, it surfaces in:

- §9 conformance statement template, so adapter authors document their position.
- §10 security considerations, if it has threat-model implications.
- §12 deferred-decisions register, if it revisits a previously deferred decision.

A change that lands without updating these sections leaves adapter authors implementing against an incomplete contract.

## Worked example: `provenance`

`provenance: { substrate: string; instance?: string }` was added to `Upactor` in v0.1.1, on the OIDC adapter's behalf.

- **Substrate-agnosticism.** The field works across substrate shapes. Supabase declares `'supabase'`. SimpleX declares `'simplex'`. OIDC declares `'oidc'` with the issuer URL as instance. The field is optional, so substrates with no useful value omit it.
- **Binding-integrity.** The field exposes only the substrate type and instance URL, both already visible in the adapter's `package.json` and deployment config. No contact identifiers, no substrate state. Applications MUST NOT gate on `provenance` as a capability check (§4.5), so it doesn't open an end-run around §5.
- **Disclosure.** §4.5 documents the field. The §9 conformance template includes a row for it. The OIDC adapter's `CONFORMANCE.md` fills the row in.

The field was deferred as D6 in earlier drafts. The OIDC adapter shipping with multiple IDPs made cross-instance discrimination at the port level necessary, and the field landed.

## Worked counter-example: `webfinger_url`

A proposal to add `webfinger_url: string` to `Upactor` so applications can verify fediverse handles via WebFinger.

- **Substrate-agnosticism.** Mastodon and ATProto adapters could populate this. Supabase, SimpleX, and OIDC have no WebFinger endpoint. The field would be present-or-absent based on substrate type, which the application then has to handle as a substrate distinction. Fails.
- **Binding-integrity.** A WebFinger URL is a public-graph contact identifier. §7.1 forbids it in `Upactor`. Fails.

A WebFinger URL is real and useful for fediverse adapters. It belongs in the adapter's documented helper paths, outside the port. Applications that want WebFinger verification opt into the adapter's surface for it.

## Adapter conformance

Adapters that implement the spec without amending it don't propose anything. They MUST still:

1. Ship a `CONFORMANCE.md` (template in this repo) declaring the spec version, substrate, threat model, capability self-declaration, and `AuthError` mapping table.
2. Ship a sixteen-vector reflection test (e.g. `@prefig/upact-supabase/tests/back-channel.test.ts`) asserting that no sentinel substrate token leaks through the adapter instance.
3. Use `createSession` from `@prefig/upact` for Session construction, or pass an equivalent sixteen-vector test suite.

## AI-Involvement trailers

Commits with substantive AI involvement carry an `AI-Involvement` trailer recording its character, so readers can calibrate the provenance of normative content:

```
AI-Involvement: <tier>
```

| Tier | When to use |
|---|---|
| `autonomous` | AI generated the full commit with no human review of content |
| `authored` | AI wrote the primary content; human reviewed and accepted with minor edits |
| `collaborative` | Human and AI contributed substantial portions |
| `assisted` | Human wrote the primary content; AI provided suggestions or structured material |
| `commit-message-only` | AI wrote only the commit message; content is human-authored |

The trailer is most important on normative paths (`SPEC.md`, `src/types.ts`, capability vocabulary). Prose and chore commits MAY carry it too. Use the tier that fits the commit.

Normative paths that carry `autonomous` or `authored` tiers are permitted at v0.x. The posture is revisited at the v1.0 working-group convening per `GOVERNANCE.md`.

### Co-Authored-By trailers

upact does not use the `Co-Authored-By:` trailer for AI authorship. `Co-Authored-By:` claims human co-authorship; `AI-Involvement` records the character of involvement. They aren't interchangeable, and the licensing implications under CC-BY-4.0 / Apache-2.0 differ.

If your editor or coding assistant adds a `Co-Authored-By: Claude...` (or any AI-named) trailer by default, strip it before committing.

## Spec versioning and stability

- v0.x: breaking changes between minor versions are permitted. The maintainer (Theodore Evans) makes decisions.
- v1.0: first stable version. Decisions about the core capability vocabulary (§5.1) and MUST clauses (§7) move to a working group of ≥3 conforming-adapter authors. See `GOVERNANCE.md`.

## The deferred-decisions register

`SPEC.md §12` records features that surfaced in design but did not ship in v0.1 because no adapter needed them yet. Items reactivate when a shipped adapter forces the question.

§12 is not a backlog. Items reactivate when a shipped adapter forces the question, not when someone has time to pick one up.
