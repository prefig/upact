# Coordination: upact v0.1.0 → dyad Phase A/B

Written 2026-05-01 by the upact session for the dyad session. Purpose: surface what changed during the post-ship review pass, confirm what the dyad plan got right, and name the open decisions that dyad implementation will force.

## Fixes applied in this session (upact v0.1.0 + post-ship patch)

These are now committed / reflected in the working tree. The dyad session does not need to work around them.

### OTP credential type removed from `@prefig/upact-supabase`

`SupabaseCredential` is now `{ kind: 'password'; email: string; password: string }` only. OTP / magic-link is a redirect-based multi-step flow that cannot fit `authenticate() → Session | AuthError` (Decision 10 / SPEC §10). The redirect dance belongs in a dedicated `/auth/callback` route outside the port. If dyad's auth UI needs magic-link, that route stays substrate-native — it is not a gap in the upact contract.

Consequence for dyad: the existing `(auth)` route group and Supabase's email OTP flow are *not* affected by this change. They operate outside the port by design. The dyad plan was already correct to defer `(auth)` retargeting to Phase C.

### `authenticate()` no longer wraps null sessions

Previously `createSession(data.session)` was called on the OTP path where `data.session === null`. This produced a Session-shaped value wrapping null — opaque but wrong. Removed with the OTP type.

### `currentUpactor` and `issueRenewal` now emit `SubstrateUnavailableError`

Both operations now wrap substrate exceptions in `SubstrateUnavailableError` rather than letting raw Supabase errors propagate. The type is now re-exported from `@prefig/upact-supabase` so dyad can catch it without importing from the core package directly:

```ts
import { SubstrateUnavailableError } from '@prefig/upact-supabase';
```

### Example hooks pattern: error boundary added

`examples/sveltekit-supabase/src/hooks.server.ts` now wraps `currentUpactor` in try/catch and throws a 503. The dyad plan's hooks pattern (pre-populated `locals.user` + sync `userToUpactor`) avoids the async call entirely and is *better* than the reference example was. The fix brings the example closer to what dyad already planned.

### `kind: 'password'` discriminant is REQUIRED

`examples/sveltekit-supabase/src/routes/auth/sign-in/+page.server.ts` was calling `authenticate({ email, password })` without the `kind` field. This is wrong — the guard `isSupabaseCredential` checks `kind === 'password'` first, so an object without `kind` always returns `credential_invalid`. Fixed to `authenticate({ kind: 'password', email, password })`.

**Action for dyad:** Any call site that invokes `adapter.authenticate()` must include `kind: 'password'`. The dyad plan doesn't wire `authenticate()` in Phase A (correct — auth flows are deferred). This is informational for Phase C wiring.

### Identity-mapper email-pattern guard added

`readDisplayHint` in the supabase adapter now rejects values matching an email pattern (per SPEC §4.2). Supabase populates `user_metadata.display_name` sometimes from email fallbacks. The guard ensures display_hint is never email-shaped. Transparent to dyad unless a seed user has an email-shaped `display_name`.

### CONFORMANCE.md capability and AuthError corrections

The previous `CONFORMANCE.md` incorrectly claimed:
- `['recovery']` for users without a confirmed email — code actually returns `[]`
- `identity_unavailable` for "user not found" — Supabase conflates this with "wrong password" as credential-stuffing resistance; code emits `credential_rejected`

**Impact on dyad:** None. Dyad's seed users all have confirmed emails, so `['email', 'recovery']` is what they will see. The AuthError correction only affects the documentation claim, not runtime behavior.

### jsr.json imports field added to both adapter packages

Both `upact-supabase/jsr.json` and `upact-simplex/jsr.json` now declare the `imports` field mapping `@prefig/upact` to `jsr:@prefig/upact@^0.1.0`. This was missing; JSR publication would have failed without it. Transparent to dyad (dyad consumes via github: URL pins, not JSR).

---

## What the dyad plan got right

**Naming: `identityPort` over `identity`.** The dyad plan uses `identityPort: IdentityPort` in `App.Locals`. The reference example used `identity`. `identityPort` is clearer (the value *is* an IdentityPort, not "the identity") and less ambiguous with `locals.user`. **Recommendation: adopt `identityPort` as the canonical field name.** The upact example will be updated to match in a follow-up.

**Hooks pattern: sync `userToUpactor` over async `currentUpactor`.** The dyad plan constructs the identityPort per-request but derives `locals.upactor` synchronously from `locals.user` via `userToUpactor`. This is more efficient (no extra Supabase round-trip) and avoids the error-boundary problem that the reference example had. This is the correct pattern for substrates where `locals.user` is already populated by the request lifecycle.

**D1 `requireIdentity` stays sync.** The plan keeps `requireIdentity(locals): Upactor` synchronous. This is correct and works with the exported `userToUpactor` helper. The async port operations on the adapter are not needed for this path.

**OTP / redirect flows deferred.** The plan explicitly defers `(auth)` route group retargeting to Phase C. This is correct — those flows cannot fit the `authenticate()` port at v0.1.

**Admin migration sequencing.** Phase B's REVOKE before granting self-update is the right order. The column grant is the load-bearing privilege-escalation guard; R4 gets this correct.

**Backfill in same migration.** R7's requirement to backfill `profiles.is_admin = true` in the same migration that adds the column is correct per the upact review. A separate backfill migration creates a window where the column exists but admins are not yet flagged, which is a silent partial-outage window.

---

## Open decisions that dyad implementation will surface for upact

These are questions where the dyad Phase A/B implementation will produce concrete evidence that should shape upact v0.2. Flag them as they surface — the upact session should be watching.

### D-A: `locals.identityPort` vs `locals.identity` naming

The example uses `identity`; the dyad plan uses `identityPort`. The spec is silent on convention — `App.Locals` field naming is application choice. But as the reference adopter, dyad's convention will be what future readers copy.

**Recommendation:** dyad proceeds with `identityPort`. The example will align in a follow-up. No upact spec change needed.

### D-B: `userToUpactor` export surface

The dyad plan consumes `userToUpactor` directly as the sync path. This function is exported from both `@prefig/upact-supabase`'s public surface and the adapter-internal module. Confirm the import path used in dyad is the public one (`import { userToUpactor } from '@prefig/upact-supabase'`), not an internal import. If dyad needs something the public surface doesn't expose, that surfaces a gap in what the adapter exports.

### D-C: `capabilities` as `ReadonlySet` — runtime immutability

`capabilitiesFromUser` returns `Object.freeze(new Set())`. At the type level this is `ReadonlySet<Capability>` — the `.add()` method is not present in the type. But at runtime, `Object.freeze(new Set())` does NOT prevent `.add()` from succeeding: `Object.freeze` freezes enumerable properties, and Set internals are private slots, not properties. If dyad ever receives a capabilities set and accidentally mutates it (unlikely but possible in test or data flow code), that mutation is silent. This is a known limitation; the type-level guard is sufficient for v0.1. Flag if dyad's integration tests expose any mutation.

### D-D: `isAdmin(locals)` reads `profiles.is_admin` — no upact capability

The admin role migration correctly moves admin status to `profiles.is_admin` and keeps this entirely outside the upact port. Admin is a dyad application role, not an identity capability — there is no `'admin'` capability in upact's `Capability` union. This is the right layering. No upact change needed unless a future use case requires a cross-substrate "operator" capability.

### D-E: `provenance` field (Decision 6) — not needed for dyad M1

The dyad deployment is single-substrate (Supabase only). `provenance: { substrate: 'supabase', instance: <URL> }` is Decision 6, deferred. If dyad M2 or a future multi-IDP deployment surfaces a concrete need to discriminate between identity sources in application code, that triggers Decision 6 work. No action until then.

### D-F: Phase C login wiring — what credential shape does dyad use?

When dyad eventually wires `authenticate()` for its login form, the credential will be `{ kind: 'password', email, password }`. Magic-link / OTP stays outside the port (substrate-native callback route). Confirm this is the intended UX for dyad before Phase C planning.

---

## Snapshot

After this session's fixes, the upact working tree state is:

- `@prefig/upact`: 22 tests passing. `SubstrateUnavailableError` exported. Packaging clean.
- `@prefig/upact-supabase`: 45 tests passing. OTP removed, `currentUpactor`/`issueRenewal` wrapped, email-pattern guard, `SubstrateUnavailableError` re-exported. CONFORMANCE.md corrected.
- `@prefig/upact-simplex`: 65 tests passing. No changes in this pass.
- Examples: `kind: 'password'` fixed, hooks.server.ts error boundary added.
- CONFORMANCE.md (central): capabilities and AuthError table corrected.

The dyad session can proceed with Phase A and Phase B. The fixes above are already in the working tree.
