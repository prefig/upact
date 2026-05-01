# upact roadmap

Last updated: 2026-05-01.

Open work for the v0.1 release window. Each item names the committed posture and what is left to do. Closed items are kept here for institutional record until the next release cut.

## Open

### Manual human-authored revision of `SPEC.md` and the runtime kernel

**Posture.** `SPEC.md` and `src/` are normative content. The maintainer commits to a hand review and re-authoring pass before any public push, so the normative core is human-authored in voice and content. This is the load-bearing commitment for the project's transparency posture (see "AI-Involvement trailer convention" below): planning and process documents may be AI-assisted with disclosure, but the spec text and the runtime kernel that enforces SPEC §7.4 must be the maintainer's own.

**Files in scope.**

- `SPEC.md`
- `src/types.ts`
- `src/runtime.ts`
- `src/index.ts`
- `src/internal.ts`
- `tests/runtime.test.ts` (optional — tests verify the kernel rather than constituting the kernel; can carry `AI-Involvement: authored` if the maintainer chooses not to rewrite them)

Drafts in those files before the pass are AI-assisted (`AI-Involvement: authored` or `collaborative` per the trailer vocabulary). After the pass, these commits land with no AI-Involvement trailer.

### `AI-Involvement` trailer convention adoption

**Posture.** Per-commit AI involvement is disclosed via an `AI-Involvement:` trailer with a five-tier vocabulary, adopted across all repos in the prefig org.

**Vocabulary.** Single-word qualifier; cumulative human involvement increases left to right:

| Trailer | When |
|---|---|
| `AI-Involvement: autonomous` | AI executed without human review (e.g. `/ce:review` autofix that committed safe fixes silently) |
| `AI-Involvement: authored` | AI wrote the substantive content; human read, accepted, possibly nudged |
| `AI-Involvement: collaborative` | Substantial back-and-forth; both contributed materially |
| `AI-Involvement: assisted` | Human wrote the substantive content; AI helped with edits, suggestions, formatting |
| `AI-Involvement: commit-message-only` | AI wrote only the commit message; the change itself is fully human |
| *(no trailer)* | No AI involvement |

`Co-Authored-By: <model>` accompanies the trailer for any tier where the AI contributed material substance (`autonomous` through `assisted`). For `commit-message-only`, no `Co-Authored-By` — the AI isn't a substantive author of the change.

**Status.** Convention defined, not yet adopted across the prefig org.

**Files to add.**

- `CONTRIBUTING.md` (this vocabulary plus when-to-use guidance and a note on choosing tiers honestly)
- `README.md` "Acknowledgments and process" section, naming the project's transparency posture and welcoming critique

**Cross-repo rollout.** Apply the trailer convention to all subsequent commits in `prefig/upact`, `prefig/upact-supabase`, `prefig/upact-simplex`, and any future adapter or sibling. Existing commits stay as they are; the README acknowledgment notes the convention start point.

### `SPEC.md` §6.2 amendment for `currentIdentity` throw permission

**Posture.** Decision C from the cross-adapter `/ce:review` (2026-05-01): `§6.2`'s `Promise<UserIdentity | null>` is the normal-flow return type. Adapters MAY throw `SubstrateUnavailableError` (imported from `@prefig/upact`) for substrate-availability failures. Applications that wish to distinguish substrate outage from logged-out state catch the typed error.

**Status.** Runtime export (`SubstrateUnavailableError`) and adapter use shipped. Spec amendment deferred to the manual `SPEC.md` revision pass above; the formal §6.2 wording will land as part of that pass.

### Decisions deferred from the cross-adapter `/ce:review` (2026-05-01)

The full review surfaced 50+ findings across five reviewers. Decision C (above) was the second of four "ready with decisions outstanding" items the maintainer is working through. Remaining open:

- **Decision 3 — `issueRenewal` semantics divergence.** Supabase ignores `identity` and renews the cookie holder; SimpleX detects id rotation and refuses. Pick one as normative in `§6.4`.
- **Decision 4 — `AuthError.code` vocabulary normative in `§6.5`.** Currently a hand-shake between two adapters; should be normative.
- Plus ~25 P2/P3 findings across spec amendments, adapter behaviour, test additions, and TypeScript cleanup. Catalogued in the run artifact at `.context/compound-engineering/ce-review/20260501-102919-fc3bfd2a/summary.md`.

## Closed

### Decision 1 — `OpaqueSubstrateSession._unwrap()` escape hatch (P0)

**Closed 2026-05-01.** Lifted the runtime opacity wrapper into `@prefig/upact` as `createSession` + `_unwrapSession`. Both adapters dropped their local `OpaqueSubstrateSession` class. The opacity guarantee is centrally audited; future adapters get it for free. 16 runtime opacity tests verify the kernel against `JSON.stringify`, `Object.keys`, `Object.getOwnPropertyNames`, `Reflect.ownKeys`, `for-in`, `structuredClone`, `util.inspect`, direct property access, and frozen-state. Runtime kernel is dual-licensed (CC-BY-4.0 spec text and docs; Apache-2.0 code).

### Decision 2 — `currentIdentity` throw-vs-null contract

**Closed 2026-05-01 (option C).** Adapters MAY throw a typed `SubstrateUnavailableError` (from `@prefig/upact`) when the substrate is unreachable, distinct from returning `null` when the user is logged out. Applications that don't care let the error propagate to their framework's error boundary; applications that want to render an outage banner catch the type. The substrate-down distinction is a substrate-choice-time decision, not a per-call-site concern; mapping it to a typed error keeps the common path's return type narrow while leaving the channel open for richer UX. Spec amendment deferred to the manual `SPEC.md` revision pass.
