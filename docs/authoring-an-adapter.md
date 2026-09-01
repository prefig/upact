# Authoring an adapter

You have a substrate (an auth service, a protocol, a credential format) and you want application code to reach it through upact's `IdentityPort`. This guide walks the path the seven shipped adapters took, and every instruction below is grounded in code one of them ships.

Read `src/types.ts` in the core first. The port is four operations (`authenticate`, `currentUpactor`, `invalidate`, `issueRenewal`) and one identity shape (`Upactor`: `id`, optional `display_hint`, `capabilities`, optional `lifecycle`, optional `provenance`). Everything below is about conforming to that surface without letting the substrate show through it.

## 1. Package shape

Name the package `@prefig/upact-<substrate>` and export a single factory function, `create<Substrate>Adapter`, returning `IdentityPort`. No class form ships anywhere; `createSupabaseAdapter(supabase: SupabaseClient): IdentityPort` in `upact-supabase/src/adapter.ts` is the smallest example. The constructor signature should say what the adapter binds to: a per-request client (`createSupabaseAdapter(supabase)`), a config plus per-request cookie jar (`createOidcAdapter(config, cookies)`, `createMastodonAdapter(config, cookies)`), or config alone (`createEudiAdapter(config)`).

Substrate state lives in the factory closure, never on the returned object. The Supabase adapter's methods call `supabase.auth.*` from closure scope; `(adapter as any).supabase` is `undefined` and `JSON.stringify(adapter)` includes no substrate state. The OIDC adapter keeps tokens in an HMAC-signed cookie rather than on the object at all. Two imports are all an adapter needs from the core: types from `@prefig/upact`, and `createOpaqueSession` from `@prefig/upact/internal` (every `Session` your adapter returns comes from it; step 8).

In `package.json`, follow `upact-supabase/package.json`: ESM (`"type": "module"`), a single `"."` export with `types` and `import` conditions, `"engines": { "node": ">=18" }`, `"sideEffects": false`, and `@prefig/upact` plus your substrate SDK as **peerDependencies** (`"@prefig/upact": "^0.1.0"`), duplicated in `devDependencies` for tests.

If your adapter needs out-of-port methods (OAuth redirects, challenge minting), type them as a separate extensions interface and return `IdentityPort & <X>AdapterExtensions`, as `upact-oidc/src/adapter.ts` does with `buildAuthRedirect`/`buildLogoutRedirect`. Port-only consumers stay substrate-agnostic; consumers needing the extras cast locally.

## 2. Deriving the opaque `id`

`Upactor.id` is compared by equality and means nothing else, so hash your substrate identifier rather than passing it through. The shipped derivations:

- **oidc** (`src/claims-mapper.ts`): `SHA-256(sub + '@' + iss)`, first 32 hex chars, via `crypto.subtle.digest`.
- **mastodon** (`src/claims-mapper.ts`): `sha256(actor.url)[:32]`; the actor URL stays in the adapter.
- **atproto** (`src/claims-mapper.ts`): `createHash('sha256').update(did, 'utf8').digest('hex').slice(0, 32)`; the DID is chosen as the anchor because it survives a PDS migration.
- **simplex** (`src/identity-mapper.ts`): SHA-256 of the substrate's `agentUserId` (an Int64 local row id, serialised as a string), hex, first 32 chars.
- **ember** (`src/claims-mapper.ts`): a salted, domain-tagged hash: `hex(SHA-256(utf8('upact-ember/id/v1') || pepper || scopeId || subjectPk))[:32]`. The scope id salt makes ids per-scope (the member key is stable across scopes, so an unsalted hash would be a cross-application correlation handle); the optional deployment pepper breaks cross-deployment confirmability; the domain tag prevents cross-protocol hash reuse.
- **eudi** (`src/claims-mapper.ts`): sha256 over substrate, transaction nonce and issuers, truncated the same way.
- **supabase** (`src/identity-mapper.ts`) is the one exception: it passes `user.id` through directly, since the Supabase UUID is already opaque and app-scoped.

Pick the most durable identifier your substrate offers, hash it, truncate to 32 hex characters. If your substrate's raw identifier is stable across contexts you do not want linked, salt it the way ember does.

## 3. `display_hint` hygiene

Every mapper that emits a hint sanitises it the same way: trim, omit when empty, reject email-shaped values, and never fall back to a contact identifier. The regex form (supabase, simplex, oidc): `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, with rejection meaning the field is omitted. Mastodon and ember use a narrower structural check (`looksEmailShaped`: single `@`, non-empty local part, dotted domain) so unicode and emoji names pass freely. Ember additionally strips U+FFFD, because its substrate byte-truncates names and can tear a multibyte character. Supabase sources the hint only from `user_metadata.display_name`, never from email; atproto emits no hint at all (the handle is discarded). Use the spread-if-defined pattern all mappers share, so an absent hint is truly absent: `...(displayHint !== undefined ? { display_hint: displayHint } : {})`.

## 4. Capabilities

Read the shipped `capabilities.ts` files before declaring anything. OIDC, simplex, mastodon, ember and atproto all return `Object.freeze(new Set<Capability>())`. Only supabase declares capabilities, and only conditionally: `email` and `recovery` when `user.email` is a non-empty string (`upact-supabase/src/capabilities.ts`). The simplex file states the reasoning: no shipped consumer branches on a simplex capability, and declaring a capability nobody consumes is pre-emptive. Declare a capability only when your substrate genuinely provides it for this user and some consumer gates on it; otherwise ship the frozen empty set.

## 5. Request the minimum from the substrate

Three adapters guard, at construction time and before any network activity, what they will ask the substrate for:

- **oidc** (`src/scope-policy.ts`): `validateScopes` throws on any of the forbidden set `['email', 'phone', 'address', 'groups']`, on anything outside the allow-list `['openid', 'offline_access', 'profile']`, and when `openid` is missing. Called first thing in `createOidcAdapter`.
- **mastodon** (`src/scope-policy.ts`): allow-list `['read:accounts', 'profile']`, default `['read:accounts']`; anything else throws naming the scope.
- **eudi** (`src/attribute-policy.ts`): `freezeAttributePolicy` rejects declared claim paths whose first segment is any of `given_name`, `family_name`, `given_name_birth`, `family_name_birth`, `birth_family_name`, `birthdate`, `age_birth_year`, `place_of_birth`, `address`, `nationalities`, `email`, `phone_number`, `personal_administrative_number`, `portrait`. What survives are boolean age predicates (`age_equal_or_over/<threshold>` and `age_over_<threshold>` for thresholds 12, 14, 16, 18, 21, 65) or possession-only declarations, deep-frozen so nothing downstream can widen the request.

The shared idea: if a field can never surface on an `Upactor`, do not fetch it. Enforce that as a throw at construction, so a misconfigured deployment fails before any user sees the substrate.

## 6. Lifecycle and provenance

Populate `lifecycle` when the substrate has a real expiry story, and say honestly how renewal works. Shipped values: oidc sets `{ expires_at: new Date(claims.exp * 1000), renewable: 'reauth' }`; mastodon sets `{ expires_at: undefined, renewable: 'reauth' }` (its tokens never auto-expire); atproto sets `{ renewable: 'reauth' }` with no expiry (it keeps no standing credential); ember distinguishes member credentials (`{ expires_at, renewable: 'represence' }`) from a founder root (`{ renewable: 'never' }`). Supabase and simplex omit lifecycle entirely, which is also correct when no consumer needs it yet.

`provenance` is `{ substrate, instance }`: oidc uses `{ substrate: 'oidc', instance: claims.iss }`, mastodon the instance origin URL, ember the scope id as hex, atproto the DID method (`did:plc`, `did:web`) so provenance stays as portable as the id.

## 7. Error mapping onto `AuthErrorCode`

`authenticate` returns `AuthError` values, it does not throw them. Reserve throwing for outages (`SubstrateUnavailableError`). Reject malformed credential shapes yourself with `credential_invalid` before touching the substrate (every adapter has an `is<X>Credential` type guard). Then map substrate failures onto the six codes. The oidc table (`normaliseOidcError` in `upact-oidc/src/adapter.ts`), matching on the lowercased error message:

| Substrate signal | Code |
|---|---|
| `invalid_grant`, `access_denied`, `interaction_required` | `credential_rejected` |
| `invalid_token`, `invalid_client`, `invalid_request` | `credential_invalid` |
| `server_error`, `network`, `fetch`, `econnrefused` | `substrate_unavailable` |
| `slow_down`, `rate`, `429` | `rate_limited` |
| `not found`, `discovery` | `identity_unavailable` |
| anything else | `auth_failed` |

Supabase classifies by HTTP status first (429 → `rate_limited`, 4xx → `credential_rejected`, 5xx → `substrate_unavailable`) and falls back to strings, which is the more reliable order when a status is available. Keep substrate detail in `message`, but keep secrets out of it: ember's `mapVerifyFailure` carries only substrate reason strings and fixed prose, never key material or nonce values.

## 8. Proving it

Mint every `Session` your adapter returns with `createOpaqueSession` from `@prefig/upact/internal` (see `upact/src/runtime.ts`). Do not roll your own opaque wrapper; the core marker is frozen, null-prototype and serialises to `"[upact:session]"`. The marker carries no state: if your adapter needs to recover state from a session, hold a `const sessions = new WeakMap<Session, YourState>()` in the factory closure, `sessions.set(session, state)` where you mint, `sessions.get(session)` where you recover — and never let the map escape the closure (not exported, not on the adapter instance, not inside an error object). A session is meaningful only to the adapter instance that created it; a foreign, fabricated or cloned session reads as `undefined`, so if your stored values may be `null`, check `=== undefined`, not truthiness. Keep recovery sites few; ember marks its single call site (`upact-ember/src/adapter.ts`). Adapters that keep state in a cookie or a request-derived client need no map at all — they just call `createOpaqueSession()`.

Then write a `back-channel.test.ts`. The pattern (`upact-supabase/tests/back-channel.test.ts`): build a fake substrate client whose fields carry sentinel strings (`'eyJsentinelAccessToken_DO_NOT_LEAK'` and friends), construct the adapter around it, then assert the sentinels are unreachable through sixteen reflection vectors: `JSON.stringify`, `Object.keys`, `Object.getOwnPropertyNames`, `Reflect.ownKeys`, `Object.getOwnPropertySymbols`, `for-in`, `structuredClone`, `util.inspect` with `showHidden`/`getters`/`showProxy` on, direct probes of likely property names (`supabase`, `client`, `auth`, ...), cast access returning `undefined`, `Object.freeze` then stringify, stringify nested in a wrapper object, and `{ ...adapter }` spread. OIDC and ember ship the same sixteen-vector suite retargeted at their own substrate surfaces; ember also applies it to the `Session` it mints. If any vector surfaces a sentinel, your substrate state is not actually in closure.

## What not to do

- Do not put substrate types on the port surface. Mappers take substrate input and return exactly the `Upactor` fields, built fresh; forbidden fields are never read, so there is nothing to strip afterwards (`upact-supabase/src/identity-mapper.ts`, `upact-ember/src/claims-mapper.ts`).
- Do not smuggle roles or permissions through `capabilities`. It describes the provider, not the user's rights; the oidc scope policy forbids `groups` outright, and authorisation stays the application's problem.
- Do not stretch the port to cover multi-step flows. `authenticate` is one-shot. Supabase excludes OTP and magic-link flows from the port and routes them to a callback handler outside it; oidc and mastodon keep the redirect dance in `buildAuthRedirect` extensions and hand the port only the callback `Request`.
- Do not use a stable substrate fingerprint as a `display_hint` fallback; ember refuses this because it is a cross-scope correlation handle.

Then register the adapter in the adapter table in `docs/adapter-shapes.md` via PR.
