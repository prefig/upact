# Conformance statement template

Copy this template into your adapter package as `CONFORMANCE.md` and fill in each section. A filled-in example for the Supabase reference adapter follows the template.

---

## Template

```markdown
# Conformance: <adapter package name>

**Spec version:** upact vX.Y
**Package version:** X.Y.Z
**Date:** YYYY-MM-DD

## Substrate

<Name and brief description of the substrate. Include whether it is enforcement-camp or pre-conforming.>

## Threat model

<What threat model does this adapter serve? See SPEC.md §10 for the taxonomy (casual coordination / anonymous-pseudonymous / adversarial-context). What does the substrate protect against, and what does it not protect against?>

## Capabilities self-declared

`[ <list of Capability values this adapter may return, or empty for []> ]`

For each capability listed, name the concrete consumer (the application code that gates on it).

## AuthError mapping table

| Substrate error | AuthErrorCode |
|---|---|
| <substrate error> | <code> |

## Session opacity

This adapter uses `createSession` from `@prefig/upact` for Session construction.

OR

This adapter does not use `createSession`. The adapter's Session implementation passes the sixteen-vector reflection test at `tests/back-channel.test.ts` (vectors: JSON.stringify, Object.keys, Object.getOwnPropertyNames, Reflect.ownKeys, Object.getOwnPropertySymbols, for-in, structuredClone, util.inspect, direct property access by name, Object spread, wrapped JSON.stringify, and cast access to common substrate-property names).

## Adapter back-channel closure

This adapter passes a sixteen-vector reflection test (`tests/back-channel.test.ts`) asserting that no sentinel substrate token leaks through the adapter instance.

## Deviations from SHOULD clauses

<List any SHOULD clauses from the spec that this adapter does not follow, and the reason. If none, write "None.">

## Identifier derivation

<Describe how the `Upactor.id` is derived from the substrate's user identifier. If it is a hashed derivation, name the hash function and any prefix truncation. If it is a direct mapping, explain why the substrate identifier is already opaque.>
```

---

## Example: `@prefig/upact-supabase`

# Conformance: @prefig/upact-supabase

**Spec version:** upact v0.1
**Package version:** 0.1.0
**Date:** 2026-05-01

## Substrate

Supabase Auth — a managed PostgreSQL-backed identity service. `auth.users` is the substrate user record. Enforcement-camp substrate: the Supabase `User` object exposes email, phone, JWT claims, `app_metadata`, and `user_metadata`; the adapter strips all of these except what is needed to populate the three `Upactor` fields.

## Threat model

Casual coordination. Supabase Auth is a centralised service operated by Supabase, Inc. It is not appropriate for adversarial-context deployments where substrate-operator trust is not granted. The adapter is designed for applications where the substrate's leakiness is acceptable in exchange for Supabase's ergonomics and reliability.

## Capabilities self-declared

`['email', 'recovery']` — for users with a confirmed email address (non-empty `user.email`).
`[]` — for users without a confirmed email address.

Concrete consumer: dyad M1 UI gates on `capabilities.has('email')` to show or hide email-related settings. `recovery` is bundled with `email` because the same email address that identifies the user is the recovery channel; they are not independently affords.

## AuthError mapping table

| Substrate error | AuthErrorCode |
|---|---|
| `AuthApiError` (invalid credentials, wrong password) | `credential_rejected` |
| `AuthApiError` (user not found) | `credential_rejected` |
| `AuthApiError` (email not confirmed) | `credential_rejected` |
| `AuthApiError` (rate limit) | `rate_limited` |
| Network error / Supabase unreachable | `substrate_unavailable` |
| Malformed substrate User (no `id` field) | `auth_failed` |
| Unknown error | `auth_failed` |

Note: Supabase conflates "user not found" with "wrong password" as credential-stuffing resistance. Both surface as `credential_rejected`. `identity_unavailable` is not emitted by this adapter.

## Session opacity

This adapter uses `createSession` from `@prefig/upact` for Session construction.

## Adapter back-channel closure

This adapter passes a sixteen-vector reflection test at `tests/back-channel.test.ts`. Sentinel values for `__internalToken`, `__anonKey`, and `__url` on a mock `SupabaseClient` are verified unreachable through JSON.stringify, Object.keys, Object.getOwnPropertyNames, Reflect.ownKeys, Object.getOwnPropertySymbols, for-in, structuredClone, util.inspect, direct property access by name, Object spread, wrapped JSON.stringify, and cast access to `client`, `supabase`, `_client`.

## Deviations from SHOULD clauses

None.

## Identifier derivation

`Upactor.id` is set directly from `user.id` — the Supabase Auth UUID. Supabase UUIDs are opaque random identifiers (`gen_random_uuid()`); they are not derivable from user-supplied identifiers (email, phone). No hashing is applied. The raw UUID is not email-shaped and carries no information about the user visible at the application layer.

---

## Example: `@prefig/upact-simplex`

# Conformance: @prefig/upact-simplex

**Spec version:** upact v0.1
**Package version:** 0.1.0
**Date:** 2026-05-01

## Substrate

SimpleX Chat daemon — a local IPC process exposing a JSON command API. Pre-conforming substrate: the SimpleX local profile carries `localDisplayName`, `agentUserId` (UUID), and a handful of status flags. There is no central directory; profiles are application-scoped and anonymous. The adapter is thin — mostly type translation.

## Threat model

Anonymous / pseudonymous coordination. The SimpleX substrate has no central directory and uses anonymous unidirectional queues. The substrate's natural shape is already aligned with upact's privacy minima. This adapter is appropriate for deployments where pseudonymity is a requirement and correlation across sessions is undesirable.

## Capabilities self-declared

`[]` — no capabilities declared for v0.1.

The SimpleX substrate affords messaging (`sendMessage`, `receiveMessage`) and peer-to-peer matching. Neither is surfaced through the upact port at v0.1: no shipped consumer gates on a `messaging` or `p2p_matching` capability check. Per the minimum-viable discipline (CONTRIBUTING.md), capabilities land when a concrete consumer surfaces them.

## AuthError mapping table

| Substrate error | AuthErrorCode |
|---|---|
| `DaemonError { kind: 'unreachable' }` | `substrate_unavailable` |
| `DaemonError { kind: 'not-found' }` | `identity_unavailable` |
| `DaemonError { kind: 'rejected' }` | `credential_rejected` |
| `DaemonError { kind: 'invalid-profile' }` | `credential_invalid` |
| `DaemonError { kind: 'unknown' }` | `auth_failed` |
| Unknown error | `auth_failed` |
| Malformed substrate User (no `agentUserId`) | `auth_failed` |

## Session opacity

This adapter uses `createSession` from `@prefig/upact` for Session construction.

## Adapter back-channel closure

This adapter passes a sixteen-vector reflection test at `tests/back-channel.test.ts`. Sentinel values for `__internalToken`, `__socketPath`, and `__profileData` on a mock `SimpleXClient` are verified unreachable through all standard reflection vectors and cast access to `client`, `simpleXClient`, `_client`.

## Deviations from SHOULD clauses

None.

## Identifier derivation

`Upactor.id` is derived from `user.agentUserId` (a UUID string) via `SHA-256(agentUserId).slice(0, 32)` — the first 32 hex characters of the SHA-256 digest. The derivation is deterministic per `agentUserId` (stable across sessions for the same profile) and not reversible from the application layer. The hash is implemented with the Web Crypto API (`crypto.subtle.digest`).
