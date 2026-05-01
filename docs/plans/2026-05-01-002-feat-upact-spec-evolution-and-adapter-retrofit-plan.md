---
title: 'feat: upact v0.1 spec evolution + adapter retrofit + public push readiness'
type: feat
status: active
date: 2026-05-01
---

# feat: upact v0.1 spec evolution + adapter retrofit + public push readiness

## Target repos

- **`prefig/upact`** — local: `~/prefig/upact/` — spec, types, runtime kernel. Type changes + spec amendments + governance docs land here.
- **`prefig/upact-supabase`** — local: `~/prefig/upact-supabase/` — Decision 11 closure-capture retrofit + Upactor rename + drop lifecycle from returned objects.
- **`prefig/upact-simplex`** — local: `~/prefig/upact-simplex/` — Decision 11 retrofit + Upactor rename + capability declarations trimmed to `[]` per audit.

**Sibling plan:** `2026-05-01-003-feat-upact-oidc-adapter-plan.md` — the OIDC adapter (`@prefig/upact-oidc`), deferred to a follow-up session. This plan unblocks dyad's M1 (consume `@prefig/upact-supabase`); Phase C ships the OIDC adapter when picked up later.

## Overview

This plan ships **upact v0.1 publicly** — spec, types, runtime kernel, and three reference adapter packages — with the audit-trimmed minimum-viable surface that dyad's M1 redesign can begin against.

**Audit-driven scope.** Every spec change passes the contributor audit (concrete-need, minimum-viable, substrate-agnosticism, binding-integrity, disclosure). Items that fail the concrete-need test for v0.1 are deferred — not abandoned, just held until a real consumer surfaces. The CONTRIBUTING.md document landing in this plan names the audit explicitly so future contributions follow the same discipline.

**Authorship policy.** Per the relaxed v0.1 policy in `~/prefig/upact/ROADMAP.md`, AI contributors land changes in normative paths (`SPEC.md`, `src/types.ts`, `src/runtime.ts`, etc.) under `AI-Involvement` trailer disclosure. Disclosure replaces authorship-purity as the binding mechanism for v0.1.

(See origin: `~/prefig/upact/README.md` "Posture" + "Why upact"; `~/prefig/upact/ROADMAP.md` rev. 5; `~/prefig/upact/docs/cross-adapter-findings.md`.)

## Problem Frame

**What dyad's M1 needs.** dyad's M1 deliverable is "dyad's `IdentityService` swaps to consume `@prefig/upact-supabase`." That swap is unblocked when:
1. `@prefig/upact` and `@prefig/upact-supabase` are public
2. The `Upactor` type is stable enough for dyad's redesign to plan against
3. The capability vocabulary supports dyad's UI gating (`email`, `recovery`)
4. Decision 11 closure-capture conformance is real (binding integrity is genuine, not just convention)

**What this plan delivers.** The spec/kernel/adapter changes that make those four conditions true. dyad's actual M1 work (the substrate-coupling redesign) is gated on this plan landing, but the redesign itself is dyad-internal and not in scope here.

**What this plan does not deliver.** Pre-emptive features. The audit deferred `lifecycle`, `provenance`, multi-substrate aggregation support, OIDC-shaped scope discipline, and continuation/watch streaming — all because no shipped consumer needs them yet. Phase C (OIDC adapter plan) brings back what it concretely needs, alongside the adapter that needs it.

## Requirements Trace

The audit was applied to every Phase A+B spec change. Items that failed are deferred with rationale.

### Spec evolution (R1–R10)

- **R1.** Decision 4 (`AuthError.code` vocabulary normative) closed. `AuthError.code: string` narrowed to `type AuthErrorCode = 'credential_invalid' | 'credential_rejected' | 'substrate_unavailable' | 'identity_unavailable' | 'rate_limited' | 'auth_failed'`. Reactive — both shipped adapters use this vocabulary.
- **R2.** Decision 5 (Upactor rename) implemented. `UserIdentity` → `Upactor` across types, exports, runtime kernel comments, both reference adapters, README/docs, tests. Deprecated `export type UserIdentity = Upactor` alias for v0.1.x compat. `IdentityPort` itself stays neutral.
- **R3.** Decision 11 (adapter back-channel closure conformance) closed. SPEC §7.5 normative text. Adapter packages MUST hold substrate state in closure or `#private`; MUST restrict `exports`; MUST NOT export helpers returning substrate-typed values bypassing the port; MUST use upact's runtime primitives. Reference adapters retrofitted; 16-vector opacity audit pattern extended.
- **R4.** Cross-adapter findings F1, F4 integrated:
  - F1 (capability vocabulary minimum-viable principle) — §5 normative note documenting the audit discipline at spec level
  - F4 (multi-step flows resolved by IDP delegation) — §6 architectural note (Decision 10 closure)
- **R5.** Runtime kernel **explicitly normative** in SPEC §7.4: implementations MAY use `createSession` from `@prefig/upact`; alternatives MUST pass an equivalent vector suite to claim conformance.
- **R6.** Drop speculative substrates from `docs/adapter-shapes.md`: Convene + Reticulum columns removed (no shipped adapter, no consumer). Add note: "Additional substrate sketches land alongside their shipped adapter, not before."
- **R7.** Trim `Capability` vocabulary to `'email' | 'recovery'`. Only these two have shipped consumers. Other values deferred to §5.2 extension.
- **R8.** Drop `lifecycle` field from `Upactor`. No concrete consumer in shipped adapters or dyad. `IdentityLifecycle` and `IdentityDecayAware` types removed entirely. Phase C brings them back when JWT `exp`-driven `expires_at` becomes a real consumer.
- **R9.** **Defer with rationale recorded in §12 of SPEC.md:** Decision 6 (provenance — pre-emptive without multi-substrate consumer); Decision 7 (continuation — substrates that benefit don't have shipped adapters); Decision 8 (watch — same); Decision 9 (issueRenewal OPTIONAL — moot if lifecycle is dropped); F3 (network-legible — pre-emptive); F6 (lifecycle multiple shapes — moot); G1 (OIDC scope discipline — moot until OIDC adapter ships).
- **R10.** SimpleX adapter behavior change: declare `[]` capabilities (audit Option 2). Substrate affordance documented in README prose.

### Public push readiness (R11–R16)

- **R11.** `~/prefig/upact/package.json` updated for npm-publishable shape: version `0.1.0` (drop `-draft`), `main`/`exports` point at `dist/`, `files` whitelist, `engines.node: >=18`, `sideEffects: false`, vitest `^3.0.0`, `@types/node ^22.0.0`, `build` and `prepublishOnly` scripts.
- **R12.** `~/prefig/upact/tsconfig.json` adds `isolatedDeclarations: true`, `verbatimModuleSyntax: true`, `rootDir: "src"`, `sourceMap: true`, `declarationMap: true`. Build emits `dist/`.
- **R13.** `~/prefig/upact/jsr.json` created for JSR dual-publish.
- **R14.** Same npm/JSR prep for `@prefig/upact-supabase` and `@prefig/upact-simplex`. peerDeps `^0.1.0` (caret on 0.x is restrictive — only patches).
- **R15.** Governance docs at `~/prefig/upact/`: `CONTRIBUTING.md` (audit checklist + forward/inverse-kinematics framing + AI-Involvement trailer + worked examples linking to closed Decisions), `GOVERNANCE.md` (v0.x maintainer-only, v1.0 transition commitment), `CHANGELOG.md` (v0.1.0 entry), `SECURITY.md` (vector-violation reporting), `CONFORMANCE.md` (template with Supabase example).
- **R16.** `~/prefig/upact/examples/sveltekit-supabase/` minimal SvelteKit app demonstrating end-to-end consumption against local Supabase. README references local Supabase via dyad's `npm run setup`.

## Scope Boundaries

**In scope:**
- Trimmed type changes (Upactor rename, AuthError narrowing, capability trim, drop lifecycle/IdentityLifecycle/IdentityDecayAware)
- Decision 11 closure-capture retrofit on `@prefig/upact-supabase` and `@prefig/upact-simplex`
- SPEC.md amendments for the audit-passing closures
- adapter-shapes.md trim
- npm/JSR packaging prep for the three packages
- Governance and contribution docs (with audit framing)
- One worked example: SvelteKit-on-Supabase
- Final coordination pass

**Out of scope:**
- The OIDC adapter — separate plan at `2026-05-01-003-feat-upact-oidc-adapter-plan.md`
- Dex POC stabilisation — Phase C
- Toolchain investments (testing utils, eslint plugin, scaffolder, conformance suite) — post-OSA / funded
- dyad's M1/M2 integration — separate Dyad-internal plan
- D3 normative wording, D6, D7, D8, D9, F3, F6, G1 spec amendments — Phase C or v0.2

## Context & Research

### Relevant Code

- `~/prefig/upact-supabase/src/adapter.ts` — class-based `private readonly supabase`. Decision 11 retrofit: factory + `#private` class.
- `~/prefig/upact-simplex/src/client.ts` — `SimpleXClient` interface pattern, preserved.
- `~/prefig/upact-simplex/src/adapter.ts` — class-based `private readonly client`. Same retrofit shape.
- `~/prefig/upact/src/runtime.ts` — `createSession`. Adapter MUST use this.
- `~/prefig/upact/src/errors.ts` — `SubstrateUnavailableError`. Both adapters throw on substrate-down.
- `~/prefig/upact/tests/runtime.test.ts` — 16-vector opacity audit template; extends to adapter-instance reflection.

### Institutional Learnings

From `~/dyad.berlin/docs/research/2026-04-30-substrate-assumption-audit.md`: the user-identity surface in dyad is already clean post-M2 refactor; the harder substrate-coupling work (auth UI, DB schema, id-rotation) is dyad-internal (~10–18 days). **Phase A+B unblocks dyad's redesign; the redesign itself is separate work.**

From `~/dyad.berlin/docs/solutions/architecture/route-rename-with-redirect-pattern.md`: deprecated `UserIdentity = Upactor` alias for v0.1.x; promote to hard breaks in v0.2.

### External References

- [JSR publishing for TypeScript-first packages](https://jsr.io/docs/publishing-packages)
- [npm trusted publishing with OIDC](https://docs.npmjs.com/trusted-publishers/)
- [W3C VC v2.0 test suite](https://w3c.github.io/vc-data-model-2.0-test-suite/) — pattern for CONFORMANCE.md template
- [CEL spec governance](https://github.com/google/cel-spec/blob/master/GOVERNANCE.md) — v1.0 transition language

## Key Technical Decisions

### D-SPEC-1 — `AuthError.code` as discriminated union (Decision 4 closure)

Narrow `AuthError.code: string` to `type AuthErrorCode` (six codes). Reactive — both adapters already use this vocabulary.

### D-SPEC-2 — Decision 11 closure-capture conformance is normative

SPEC §7.5: conforming adapters MUST hold substrate state in closure or `#private`; MUST restrict `exports`; MUST NOT export helpers returning substrate-typed values; MUST use upact's runtime primitives.

### D-SPEC-3 — Runtime kernel explicitly normative in §7.4

`createSession` is normative; alternatives must pass equivalent vector suite.

### D-SPEC-4 — Drop lifecycle and provenance from Upactor for v0.1

Audit-driven. No concrete consumer. Phase C brings back what it needs alongside OIDC adapter.

### D-SPEC-5 — Trim Capability vocabulary to consumed values

`Capability = 'email' | 'recovery'`. SimpleX declares `[]`. New capabilities via §5.2 extension when concrete consumers surface.

### D-PUSH-1 — npm + JSR dual-publish

Three packages publish to both. npm ships compiled `dist/`; JSR ships TypeScript source.

### D-PUSH-2 — `isolatedDeclarations: true` enforced now

For JSR slow-types compliance. Catches violations at typecheck time.

### D-PUSH-3 — Deprecated re-exports for the Upactor rename

`export type UserIdentity = Upactor` ships v0.1; removed in v0.2.

## Open Questions

### Resolved during planning

- Audit checklist contents (five tests in CONTRIBUTING.md)
- One shared example for v0.1 (SvelteKit-on-Supabase); per-adapter examples deferred
- `IdentityDecayAware` interface — drop per audit (no shipped consumer); lands in Unit 1

### Deferred to implementation

- Exact `exports` field shape for upact's `/internal` subpath — verify with `publint`
- Whether to commit each Unit as a separate commit or batch — unit-per-commit default; Unit 4 is one large coherent commit per the original plan

## High-Level Technical Design

### `Upactor` shape after Phase A (audit-trimmed)

```ts
type Capability = 'email' | 'recovery';

type Upactor = {
  id: string;                 // opaque, hashed; SHA-256 prefix per §7.3
  display_hint?: string;      // never email-shaped per §4.2
  capabilities: Capability[]; // declared by adapter; consumed for UI gating
};
```

### `AuthError` shape after Decision 4 closure

```ts
type AuthErrorCode =
  | 'credential_invalid'
  | 'credential_rejected'
  | 'substrate_unavailable'
  | 'identity_unavailable'
  | 'rate_limited'
  | 'auth_failed';

type AuthError = { code: AuthErrorCode; message: string };
```

### Adapter back-channel closure pattern (D-SPEC-2)

```ts
// Factory form (primary)
export function createSupabaseAdapter(supabase: SupabaseClient): IdentityPort {
  return {
    authenticate: async (cred) => { /* uses supabase via closure */ },
    currentUpactor: async (req) => { /* uses supabase */ },
    invalidate: async (sess) => { /* uses supabase */ },
    issueRenewal: async (id, ev) => { /* uses supabase */ },
  };
}

// Class form (escape hatch)
export class SupabaseUpactAdapter implements IdentityPort {
  #supabase: SupabaseClient;
  constructor(supabase: SupabaseClient) {
    this.#supabase = supabase;
  }
}
```

`(adapter as any).supabase === undefined` for both forms. 16-vector opacity tests verify against `JSON.stringify`, `Object.keys`, `Reflect.ownKeys`, `Object.getOwnPropertySymbols`, `for-in`, `structuredClone`, `util.inspect`, `Object.getOwnPropertyNames`, direct property access.

## Implementation Units

### Phase A: Spec evolution + reference adapter retrofit

- [ ] **Unit 1: Upactor rename + AuthError narrowing + Capability trim + drop lifecycle in `@prefig/upact`**

**Goal.** Land the audit-trimmed type-level Phase A changes.

**Requirements.** R1, R2, R7, R8.

**Files (in `prefig/upact/`):**
- Modify: `src/types.ts`:
  - Rename `UserIdentity` → `Upactor`
  - Drop `lifecycle: IdentityLifecycle` field; drop `IdentityLifecycle` type; drop `IdentityDecayAware` interface
  - Narrow `AuthError.code` to `AuthErrorCode` union
  - Trim `Capability` to `'email' | 'recovery'`
  - Add `export type UserIdentity = Upactor` deprecated alias
- Modify: `src/index.ts` — export `Upactor`; remove `IdentityLifecycle` and `IdentityDecayAware` exports
- Modify: `src/runtime.ts` — comment refs `UserIdentity` → `Upactor`
- Modify: `tests/runtime.test.ts`, `tests/errors.test.ts` — type imports

**Test scenarios.**
- All 22 existing tests pass with renamed types
- Type-only assertion: `UserIdentity` resolves to same type as `Upactor`
- Type-only assertion: `Upactor` is exactly `{ id: string; display_hint?: string; capabilities: Capability[] }`
- Type-only assertion: `Capability` is exactly `'email' | 'recovery'`

**Verification.** `npm test` passes; `npm run typecheck` passes.

---

- [ ] **Unit 2: Decision 11 retrofit on `@prefig/upact-supabase` + Upactor rename + drop lifecycle**

**Goal.** Closure-capture or `#private` for `SupabaseClient`. Add 16-vector test. Implement Upactor rename. Drop lifecycle from returned identity.

**Requirements.** R3, R2, R8.

**Files (in `prefig/upact-supabase/`):**
- Modify: `src/adapter.ts` — factory `createSupabaseAdapter(supabase)` + class `SupabaseUpactAdapter` with `#supabase`
- Modify: `src/identity-mapper.ts` — return trimmed `Upactor` (no lifecycle field)
- Modify: `src/capabilities.ts` — declare `['email', 'recovery']` for users with email; `['recovery']` otherwise
- Modify: `src/index.ts` — export both factory and class
- Create: `tests/back-channel.test.ts` — 16-vector closure conformance
- Modify: `tests/*.test.ts` — Upactor rename; remove lifecycle assertions
- Modify: `README.md` — usage updates; conformance table reflects trimmed Upactor

**Test scenarios.**
- All 43 existing tests pass after rename + lifecycle drop
- New 16-vector test passes

**Verification.** `npm test` passes (43 + 16 tests); returned `Upactor` has exactly 3 fields.

---

- [ ] **Unit 3: Decision 11 retrofit on `@prefig/upact-simplex` + capability declaration audit**

**Goal.** Same retrofit pattern as Unit 2. SimpleX declares `[]` capabilities (audit Option 2).

**Requirements.** R3, R2, R8, R10.

**Files (in `prefig/upact-simplex/`):**
- Modify: `src/adapter.ts` — factory `createSimpleXAdapter(client)` + class `SimpleXUpactAdapter` with `#client`
- Modify: `src/identity-mapper.ts` — trimmed Upactor; capabilities declared as `[]`
- Modify: `src/capabilities.ts` — return `[]`. Inline comment: "SimpleX substrate affords messaging and p2p_matching at the substrate layer; capability declarations land when concrete consumers surface (per upact §5.2 extension)."
- Modify: `src/index.ts` — exports
- Create: `tests/back-channel.test.ts` — 16-vector closure conformance
- Modify: `tests/*.test.ts` — Upactor rename; lifecycle assertions removed; capability assertions expect `[]`
- Modify: `README.md` — conformance reflects `[]`; substrate affordance documented in prose

**Test scenarios.**
- All 64 existing tests pass with capability assertions updated
- New 16-vector test passes
- Privacy assertion: returned Upactor capabilities is exactly `[]`

**Verification.** `npm test` passes; SimpleX declares no capabilities; affordance in README prose.

---

- [ ] **Unit 4: Amend `SPEC.md` and `docs/adapter-shapes.md` with audit-trimmed v0.1 changes**

**Goal.** Land the trimmed Phase A spec amendments directly with `AI-Involvement: collaborative` trailer disclosure.

**Requirements.** R1–R10.

**Dependencies.** Units 1–3.

**Files (in `prefig/upact/`):**
- Modify: `SPEC.md`:
  - **§4 (Upactor)** — rename throughout. Type shape: `{ id, display_hint?, capabilities }`. No lifecycle, no provenance.
  - **§5 (capabilities)** — vocabulary trimmed to `'email' | 'recovery'`. F1 normative note: vocabulary intentionally minimal; growth via §5.2 when concrete consumers surface (audit pattern, see CONTRIBUTING.md).
  - **§5.2 (capability extension)** — clarify ≥2-independent-consumers rule.
  - **§6 (operations)** — F4 architectural note: multi-step flows resolved by IDP delegation.
  - **§6.5 (AuthError)** — Decision 4 closure: codes narrowed. Adapter-side mapping in adapter READMEs.
  - **§7.4 (opacity)** — D-SPEC-3: runtime kernel `createSession` is normative.
  - **§7.5 (back-channel closure)** — NEW: Decision 11 normative text.
  - **§8 (lifecycle)** — drop entire section. Replace with deferred-decisions paragraph.
  - **§10 (conformance template)** — adapter conformance statement template.
  - **§12 (governance / future work)** — explicit deferral notes for D6, D7, D8, D9, F3, F6, G1; each names which audit test it failed.
- Modify: `docs/adapter-shapes.md` — remove Convene + Reticulum columns; add note about additional substrates landing alongside their adapter.

**Approach.** Direct amendment per relaxed authorship policy. One coherent commit. `AI-Involvement: collaborative` trailer + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

**Verification.** Every audit-passing decision (D4, D5, D11) has spec text; every audit-deferred decision has §12 entry naming failed audit test; F1 and F4 integrated; lifecycle section dropped.

---

### Phase B: Public push readiness

- [ ] **Unit 5: npm/JSR packaging prep for `@prefig/upact`**

**Goal.** Make upact's package.json + tsconfig publish-ready for both registries.

**Requirements.** R11, R12, R13.

**Dependencies.** Unit 1.

**Files (in `prefig/upact/`):**
- Modify: `package.json` — version `0.1.0`, `main` → `./dist/index.js`, `exports` ESM types-first, `files` whitelist, `engines.node: ">=18"`, `sideEffects: false`, vitest `^3.0.0`, `@types/node ^22.0.0`, `build` and `prepublishOnly` scripts
- Modify: `tsconfig.json` — `isolatedDeclarations: true`, `verbatimModuleSyntax: true`, `rootDir: "src"`, `sourceMap: true`, `declarationMap: true`
- Create: `jsr.json` — `name: "@prefig/upact"`, version, exports point at `src/index.ts`

**Test scenarios.**
- `npm pack --dry-run` shows expected files
- `npx publint` passes
- `npx attw --pack .` passes
- Clean install in throwaway project: import resolves and types resolve

**Verification.** All checks pass.

---

- [ ] **Unit 6: npm/JSR packaging prep for adapters**

**Goal.** Apply same prep to upact-supabase and upact-simplex.

**Requirements.** R14.

**Dependencies.** Unit 5, Units 2–3.

**Files:** `package.json`, `tsconfig.json`, `jsr.json` per adapter repo.

**Specifics:** `peerDependencies: { "@prefig/upact": "^0.1.0" }`; mirror in `devDependencies`; `peerDependenciesMeta`: required.

**Verification.** publint, attw, clean install per package.

---

- [ ] **Unit 7: Governance and contribution docs**

**Goal.** Boilerplate for public-push readiness, with audit framing as contribution discipline.

**Requirements.** R15.

**Files (in `prefig/upact/`):**

- Create: `CONTRIBUTING.md`:
  - **Audit checklist** — five tests (concrete-need / minimum-viable / substrate-agnosticism / binding-integrity / disclosure)
  - **Forward/inverse-kinematics framing** — inverse is dominant; audit is the constraint
  - **Worked examples** — Decisions 1, 2, 5, 11 (closed with audit narrative); 6, 7, 8, 9 (deferred with failed-audit-test rationale)
  - "The roadmap entries ARE the contributor docs"
  - Per-decision contribution flow (issue → audit → smallest amendment → ROADMAP entry → SPEC text follows)
  - AI-Involvement trailer convention (five-tier vocabulary lifted from ROADMAP)
  - Recursive note: maintainer accepts the same audit discipline the spec asks of adopters
- Create: `GOVERNANCE.md` — v0.x maintainer-only; v1.0 transition (capability registry on ≥2 implementations; core port and §7 decisions to working group of ≥3 conforming-adapter authors); pattern reference cel-spec, W3C VC
- Create: `CHANGELOG.md` — Keep-a-Changelog, single v0.1.0 entry summarizing closed decisions and public-push delta
- Create: `SECURITY.md` — reporting (private email, GitHub Security Advisory); specifically opacity-vector violations, back-channel closure violations, scope-policy bypasses
- Create: `CONFORMANCE.md` — adapter author template per upact §10. One filled-in example (Supabase).

**Verification.** Documents render cleanly; CONFORMANCE.md fillable without ambiguity.

---

- [ ] **Unit 8: Examples directory — minimal SvelteKit on `@prefig/upact-supabase`**

**Goal.** Ship one canonical "wire upact into your existing app" reference, dyad-shaped.

**Requirements.** R16.

**Dependencies.** Unit 2.

**Files (in `prefig/upact/`):**
- Create: `examples/sveltekit-supabase/`:
  - `package.json`, `svelte.config.js`, `vite.config.ts`, `tsconfig.json`
  - `src/app.d.ts` — locals types
  - `src/hooks.server.ts` — adapter wiring (per-request `createSupabaseAdapter` from `event.locals.supabase`)
  - `src/routes/+layout.server.ts` — load identity
  - `src/routes/+page.svelte` — login button + identity display
  - `src/routes/auth/login/+page.server.ts` — sign-in form action
  - `src/routes/auth/logout/+page.server.ts` — sign-out form action
  - `README.md` — how to run (local Supabase via dyad's `npm run setup`)
  - `.env.example` — `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`

**Approach.** Minimal scope; no production polish.

**Verification.** Manual: `npm install && npm run dev`, sign in, verify Upactor displayed.

---

- [ ] **Unit 9: README + ROADMAP final coordination**

**Goal.** Adopters / Examples sections; final cross-reference pass; ROADMAP rev 6.

**Files (in `prefig/upact/`):**
- Modify: `README.md`:
  - "Adopters" section — dyad (alpha) listed as worked example
  - "Examples" section — link to `examples/sveltekit-supabase/`
  - Verify all doc links resolve
- Modify: `ROADMAP.md`:
  - Bump rev 6
  - Move D4, D5, D11 to Closed
  - Open section reflects deferrals (D3, D6, D7, D8, D9, F3, F6, G1) → Phase C or v0.2 with audit-failure rationale
  - Note Phase A+B landing publicly

**Verification.** Cross-references resolve; ROADMAP accurately reflects post-plan state.

## System-Wide Impact

- **Interaction graph.** Three packages publish independently; adapters peer-depend on upact. dyad consumes upact-supabase as library import.
- **Error propagation.** `SubstrateUnavailableError` from upact thrown by adapters on substrate-down. `AuthError` returned from `authenticate` per narrowed vocabulary. `null` from `currentUpactor` on no-current-user.
- **State lifecycle.** Adapters hold substrate clients in closure or `#private`. No persistence at this layer.
- **API surface parity.** Three packages, same conformance bar. Phase C extends to four with same shape.
- **Unchanged invariants.** `IdentityPort` shape, `createSession`, `_unwrapSession`, `SubstrateUnavailableError`, runtime opacity.

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| `npm publish` failure on first try | `npm pack --dry-run` + `publint` + `attw` before tagging; clean install test |
| JSR `isolatedDeclarations: true` reveals slow types | Unit 5 surfaces at typecheck time before publish |
| Pre-public `0.1.0-draft` adopters break on rename | Deprecated `UserIdentity = Upactor` alias |
| Decision 11 retrofit breaks consumer code reading `(adapter as any).supabase` | Documented as intentional in CHANGELOG; migration note in adapter READMEs |
| Working-tree drift in upact creates conflicts | Maintainer commits or stashes drift before plan begins |
| dyad's redesign discovers structural Upactor change is needed | Triggers v0.2 amendment; v0.1 is breaking-allowed by design |
| Phase C amendments ripple back to existing adapters | Existing adapters get follow-up commits; deprecated-alias minimizes break |

## Phased Delivery

### Phase A — Spec evolution + reference adapter retrofit (Units 1–4)

dyad-unblocking work. Closes type-level changes and Decision 11 retrofit. Lands `SPEC.md` amendments directly per relaxed v0.1 authorship policy.

### Phase B — Public push readiness (Units 5–9)

Boilerplate, packaging, one example, final coordination. After Phase B, maintainer publishes — no longer gated on a manual SPEC revision pass.

### Phase C — OIDC adapter (deferred to follow-up session)

Tracked at `2026-05-01-003-feat-upact-oidc-adapter-plan.md`. Brings back `lifecycle`, `provenance`, F3, F6, G1, Decision 9 normative wording — driven by concrete OIDC adapter need.

## Documentation Plan

- README updates (Unit 9)
- CONTRIBUTING/GOVERNANCE/CHANGELOG/SECURITY/CONFORMANCE (Unit 7)
- Example app README (Unit 8)
- Adapter READMEs updated (Units 2, 3)

## Operational / Rollout Notes

- Public push **no longer gated** on maintainer-only SPEC revision pass per relaxed v0.1 authorship policy.
- After Phase B lands, maintainer runs `npm publish` + `npx jsr publish` for each package directly.
- npm trusted publishing via OIDC recommended; CI workflow setup is out of scope here.
- CONTRIBUTING.md + CHANGELOG.md (Unit 7) explicitly disclose v0.1 AI co-authorship.
- For OSA narrative: this plan demonstrates v0.1 track record. Funding underwrites toolchain + advocacy + maintenance + eventual maintainer-authored revision pass — not what this plan ships.

## Sources & References

- `~/prefig/upact/ROADMAP.md` — open and closed decisions; posture; AI-Involvement trailer
- `~/prefig/upact/README.md` — posture and "Why upact"
- `~/prefig/upact/docs/cross-adapter-findings.md` — F1, F4 (others deferred)
- `~/prefig/upact/docs/adapter-shapes.md` — substrate-conformance camp split
- `~/dyad.berlin/docs/research/2026-04-30-substrate-assumption-audit.md` — application-level coupling audit
- **Sibling plan:** `~/prefig/upact/docs/plans/2026-05-01-003-feat-upact-oidc-adapter-plan.md`
- `~/prefig/upact-supabase/src/adapter.ts`, `~/prefig/upact-simplex/src/client.ts` — pattern source
- `~/prefig/upact/tests/runtime.test.ts` — 16-vector opacity audit template
- [JSR publishing](https://jsr.io/docs/publishing-packages)
- [W3C VC test suite](https://w3c.github.io/vc-data-model-2.0-test-suite/)
- [CEL governance](https://github.com/google/cel-spec/blob/master/GOVERNANCE.md)
