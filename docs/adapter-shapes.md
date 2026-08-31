# Adapter shapes

How the seven shipped upact adapters map their substrates onto `IdentityPort` and `Upactor`.
For app developers choosing an adapter, and adapter authors looking for precedent. Everything
here is derived from the adapter source; file references point at the code that does it.

## The seven adapters at a glance

| Package | Substrate | Factory | Binding |
|---|---|---|---|
| `@prefig/upact-supabase` | Supabase Auth (password sign-in) | `createSupabaseAdapter(supabase: SupabaseClient)` | Per-request: the caller passes a request-bound client (cookies already attached); a module singleton is documented as incorrect |
| `@prefig/upact-simplex` | SimpleX Chat daemon (WebSocket JSON-RPC) | `createSimpleXAdapter(client: SimpleXClient)` | Per-instance against a local daemon; the daemon is single-tenant, so at most one adapter per daemon process |
| `@prefig/upact-oidc` | Any OIDC IDP (Authentik, Keycloak, ZITADEL, Dex) | `createOidcAdapter(config: OidcConfig, cookies: CookieJar, _client?: OidcClient)` | Per-request cookie jar; tokens live in an HMAC-signed session cookie, not in process memory |
| `@prefig/upact-mastodon` | Any Mastodon instance (OAuth + `verify_credentials`) | `createMastodonAdapter(config: MastodonConfig, cookies: CookieJar)` | Per-request cookie jar, plus two module-scoped caches spanning requests: a `ClientStore` for per-instance OAuth app credentials and a `verify_credentials` cache (configurable, 60 s default) |
| `@prefig/upact-ember` | `@prefig/ember` presence credentials, in-process | `createEmberAdapter(config: EmberConfig)` | Encounter-bound: one instance holds one verified session (`let current`) and all pending challenge nonces; state dies with the closure |
| `@prefig/upact-eudi` | EUDI wallet (OpenID4VP 1.0 / HAIP, SD-JWT VC) | `createEudiAdapter(config: EudiConfig)` | Per-deployment instance: transaction store, HMAC transaction key, and single-use response codes are instance-local |
| `@prefig/upact-atproto` | ATProto / Bluesky OAuth (DPoP, PAR, PKCE) | `createAtprotoAdapter(config: AtprotoConfig, _client?: AtprotoOAuthClient)` | Module-singleton OAuth client with in-memory state stores; single-process deployments only until stores are shared |

## What each adapter puts on the `Upactor`

| Adapter | `id` | `display_hint` | `capabilities` | `lifecycle` | `provenance` |
|---|---|---|---|---|---|
| supabase | `user.id` verbatim (Supabase UUID, already opaque) | `user_metadata.display_name` | `'email'` + `'recovery'` iff the user has an email | not populated | not populated |
| simplex | `SHA-256(agentUserId)` hex, `.slice(0, 32)` | `localDisplayName` | empty frozen set | not populated | not populated |
| oidc | SHA-256 of `` `${sub}@${issuer}` ``, first 32 hex chars | `preferred_username`, else `name` | empty frozen set | `{ expires_at: new Date(claims.exp * 1000), renewable: 'reauth' }` | `{ substrate: 'oidc', instance: claims.iss }` |
| mastodon | `sha256(actor.url)[:32]` | `display_name`, else `username` | empty frozen set | `{ expires_at: undefined, renewable: 'reauth' }` (tokens never auto-expire) | `{ substrate: 'mastodon', instance: instanceOrigin }` |
| ember | `hex(SHA-256(utf8('upact-ember/id/v1') || pepper || scopeId || subjectPk))[:32]` | leaf link name or presented name, U+FFFD-stripped | empty frozen set | `{ renewable: 'never' }` for a founder root, else `{ expires_at, renewable: 'represence' }` | `{ substrate: 'ember', instance: hex(scopeId) }` |
| eudi | SHA-256 over `'eudi'`, the single-use transaction nonce, and each presentation's `issuer` + `presentationTag`; per-authentication by design | never (everything human-readable in a PID is PII) | empty set | earliest credential expiry, `renewable: 'reauth'` | `{ substrate: 'eudi', instance: <issuer> }` |
| atproto | `createHash('sha256').update(did, 'utf8').digest('hex').slice(0, 32)` | never (the handle is discarded) | empty set | `{ renewable: 'reauth' }`, no expiry | `{ substrate: 'atproto', instance: didMethod(did) }` (`did:plc`, `did:web`) |

Every adapter that produces a display hint trims it, omits it when empty, and rejects
email-shaped values. The eudi id deserves a flag: it never repeats across `authenticate()`
calls, so equal ids mean the same authentication, not the same person. Apps needing a
returning identity on EUDI issue their own credential after eligibility is proven.

## Strippers and translators

All seven mappers are allow-lists by construction: forbidden fields are never read, so
nothing is copied and deleted. Within that, two situations occur.

Strippers face a rich substrate object and read a few fields off it. Supabase reads three
things from a `User`; Mastodon narrows `verify_credentials` (avatar, follower counts,
`source`, and the rest) to a five-field `AccountClaims` at the type boundary; OIDC reads
five claims from the ID token and documents the ones it refuses; SimpleX reads three of
seven-plus `User` fields; EUDI drops every disclosed claim value, keeping only boolean
predicate outcomes that must all be `true`.

Translators have little to strip because the substrate hands over little. ATProto learns
only the DID ("there is nothing else to strip", per its mapper header); ember's mapper takes
plain primitives (`scopeId`, `subjectPk`, `leafName`, `expiresAt`), never an ember result type.

## Patterns worth copying

- Closure-held substrate state. Every factory returns an object literal whose methods close
  over the substrate handle; no field on the returned object reaches it. The conformance
  check is `(adapter as any).client === undefined` and fifteen siblings. The session box
  (`createSessionBox`, one per instance, first line of the factory) lives in the same
  closure; a session is meaningful only to the adapter instance that sealed it.
- Back-channel tests. Mastodon's `back-channel.test.ts` has sixteen `it` cases, one per
  reflection vector: `JSON.stringify`, `Object.keys`, `getOwnPropertyNames`, `Reflect.ownKeys`,
  property symbols, `for-in`, `structuredClone`, `util.inspect` with `showHidden`, six named
  cast accesses (`.client`, `.accessToken`, `.cookieSecret`, ...), object spread, and wrapped
  stringify. Supabase covers the same sixteen vectors in two `it` cases via a shared
  `assertNoLeak` helper, driven by sentinel strings planted inside a fake client.
- Construction-time throws, before any network activity. OIDC's `validateScopes` throws on
  `email`, `phone`, `address`, `groups` and on anything outside `openid | offline_access | profile`.
  Mastodon's allows only `read:accounts | profile` and refuses an empty scope list. EUDI's
  `freezeAttributePolicy` rejects fourteen forbidden PID claim paths (names, birthdate,
  address, `personal_administrative_number`, ...), allows only `age_equal_or_over/<t>` and
  `age_over_<t>` predicates, and returns a deep-frozen policy built from a single read of each
  config property, so accessor tricks cannot swap values after validation. Ember parses the
  genesis at construction and throws when `config.audience` exceeds 128 UTF-8 bytes.
- Frozen derived state. Capability sets are `Object.freeze`d; EUDI's `KNOWN_CREDENTIAL_TYPES`
  additionally overrides `add`/`delete`/`clear` to throw at runtime.
- Out-of-port extensions. Multi-step flows keep `authenticate` one-shot and put the start
  step beside the port: `buildAuthRedirect` (oidc, mastodon), `beginChallenge` (ember),
  `buildPresentationDeeplink` (eudi), `beginAuthorization` (atproto).

## Choosing an adapter

- One IDP you operate, known at deploy time: oidc. Issuer, client id, and secret are fixed
  config; users get no instance choice.
- User-chosen instance at login: mastodon. `buildAuthRedirect` takes the instance per call
  (hostname, `@user@host` handle, or URL) and registers an OAuth app there on first contact.
- User-entered handle, portable identity: atproto. The id survives a PDS migration because it
  hashes the DID, not a host-bound URL. Single-process only for now.
- You already hold a request-bound Supabase client: supabase. Thinnest of the seven; password
  sign-in only, OTP and magic links stay outside the port.
- Local daemon, no web session at all: simplex. No cookies, no Request use; one profile
  active per daemon process.
- Offline, in-person presence credentials: ember. Pure in-process verification against a
  pinned genesis; it never throws `SubstrateUnavailableError` because there is no substrate
  to be down.
- Proving eligibility against a state wallet: eudi. `currentUpactor` always returns `null`;
  the app binds its own session by redeeming a single-use response code, and ids are
  deliberately per-authentication.
