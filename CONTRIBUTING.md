# Contributing to upact

## How the spec grows

upact operates on **inverse kinematics**: the spec grows from concrete consumer need, not from speculative design. A change to `SPEC.md`, `src/types.ts`, or the capability vocabulary begins with an adapter author or application developer who needs something the current spec does not provide — not the other way around.

Before proposing a spec change, run the five-test audit below. All five tests apply; a change that fails any one does not land.

### The five-test audit

**1. Concrete-need.** Does a shipped or actively-in-development adapter *require* this change to function correctly? "Would be useful for" is not sufficient. Name the adapter and the specific operation that fails without the change.

**2. Minimum-viable.** Is this the smallest change to the spec (types, MUST clauses, capability vocabulary) that satisfies the concrete need? If a narrower change would work, make that one instead.

**3. Substrate-agnosticism.** Does the change make sense for at least two structurally different substrates — one enforcement-camp, one pre-conforming (see `docs/adapter-shapes.md`)? A change that only works for one substrate shape is a substrate-specific extension, not a spec change.

**4. Binding-integrity.** Does the change preserve the self-binding contract? Spec changes MUST NOT:
  - Expose additional substrate fields through the port (email, phone, IP, substrate-internal handles)
  - Add OPTIONAL fields to `Upactor` whose presence reveals substrate-type information to the application
  - Weaken the Session opacity guarantee (§7.4)
  - Weaken the adapter back-channel closure requirement (§7.5)

**5. Disclosure.** Does the change require documentation of a new disclosure obligation for conforming adapters — in the conformance statement (§9), the security considerations (§10), or the deferred-decisions register (§12)?

### Worked example: adding `lifecycle`

When `lifecycle: { expires_at?: number; renewable: ... }` was first proposed for `Upactor`, the audit looked like this:

- **Concrete-need:** OIDC adapter needs `jwt.exp` for cookie renewal decisions. Named consumer: dyad M2 SvelteKit layout, `+layout.server.ts` session check. — *passes.*
- **Minimum-viable:** Could the adapter just re-call `issueRenewal` instead? Yes, for dyad M2. The field is pre-emptive. — *fails.*
- **Result:** Deferred to §12 (D-SPEC-4). Returns when the OIDC adapter concretely needs it.

### Worked example: SimpleX `messaging` capability

When `messaging` was proposed as a capability for `@prefig/upact-simplex`:

- **Concrete-need:** SimpleX affords messaging. No current dyad UI gates on `capabilities.has('messaging')`. No shipped consumer. — *fails.*
- **Result:** `@prefig/upact-simplex` ships with `capabilities = []`. Capability lands when a consumer surfaces.

## Adapter conformance

New adapters MUST pass the five-test audit for any spec amendment their design requires. Adapters that work within the existing spec need not run the audit — the spec is already there.

All adapters MUST:

1. Ship a `CONFORMANCE.md` (template in this repo) declaring the spec version, substrate, threat model, capability self-declaration, and `AuthError` mapping table.
2. Ship a sixteen-vector reflection test (see `@prefig/upact-supabase/tests/back-channel.test.ts`) asserting that no sentinel substrate token leaks through the adapter instance.
3. Use `createSession` from `@prefig/upact` for Session construction, or pass an equivalent sixteen-vector test suite.

## AI-Involvement trailers

upact acknowledges LLM contributions to normative content under an `AI-Involvement` trailer on git commits. The trailer records the character of AI involvement so readers can calibrate the provenance of what they are reading.

```
AI-Involvement: <tier>
```

Five tiers:

| Tier | When to use |
|---|---|
| `autonomous` | AI generated the full commit with no human review of content (rare; avoid for normative paths) |
| `authored` | AI wrote the primary content; human reviewed and accepted with minor edits |
| `collaborative` | Human and AI contributed substantial portions; hard to separate authorship |
| `assisted` | Human wrote the primary content; AI provided suggestions or structured material the human evaluated |
| `commit-message-only` | AI wrote only the commit message; content is human-authored |

The trailer is advisory, not mechanical. Its purpose is honest attribution, not compliance theatre. Use the tier that most accurately describes the commit.

Normative paths (`SPEC.md`, `src/types.ts`, capability vocabulary) that carry `autonomous` or `authored` tiers are permitted at v0.1 — the authorship policy is relaxed because the development timeline cannot support a full human revision pass before the OSA submission deadline. This policy is revisited before v1.0.

## Spec versioning and stability

- v0.x: breaking changes between minor versions are permitted. The maintainer (Theodore Evans) makes decisions.
- v1.0: first stable version. Decisions about the core capability vocabulary (§5.1) and MUST clauses (§7) move to a working group of ≥3 conforming-adapter authors. See `GOVERNANCE.md`.

## What goes in the deferred-decisions register

`SPEC.md §12` is the register of features that passed the concrete-need test *eventually* — meaning a concrete need exists in principle — but failed minimum-viable or substrate-agnosticism, or whose consumer is not yet shipped. Items enter the register with a brief rationale; they reactivate when the consumer surfaces or a shipped adapter forces the question.

Do not treat §12 entries as a backlog. They are a deliberate holding pattern, not a roadmap.

## Submissions

- Open an issue before a PR for anything that touches `SPEC.md` or `src/types.ts`.
- Adapter packages are independent repos under the `@prefig/` namespace; open issues on the relevant adapter repo.
- Discussion happens in issues. Normative decisions land in commits. The commit message carries the decision; the issue carries the context.
