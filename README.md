# @prefig/upact

A provider-agnostic identity port for TypeScript web apps. Your application code depends on one small interface (`IdentityPort`) and one identity shape (`Upactor`); an adapter package (Supabase, OIDC, or your own) implements it against the real substrate. Swap the adapter and the app code does not change.

The port is also a privacy boundary. `Upactor` is the whole of what an application can learn about a signed-in person:

- `id`: an opaque, stable string. Compare it by equality; it means nothing else.
- `display_hint?`: a best-effort display string. Not unique, not a contact identifier.
- `capabilities`: a `ReadonlySet<Capability>` the provider declares about itself. The v0.1 vocabulary is `'email' | 'recovery'`. You branch on capability presence, never on which provider is behind the port.
- `lifecycle?`: expiry metadata when the substrate has an intrinsic TTL (`expires_at`, plus how renewal works: `'reauth'`, `'represence'`, or `'never'`).
- `provenance?`: which substrate and instance the identity came from, for multi-IDP deployments.

There is no email, phone number, legal name, IP address, or device identifier on this type, and adapters are required to strip such fields before returning an `Upactor`. If your app needs a user's email address, this library is telling you it cannot have one through this interface.

## The four operations

```ts
interface IdentityPort {
  authenticate(credential: unknown): Promise<Session | AuthError>;
  currentUpactor(request: Request): Promise<Upactor | null>;
  invalidate(session: Session): Promise<void>;
  issueRenewal(identity: Upactor, evidence: unknown): Promise<Upactor | null>;
}
```

`authenticate` takes a credential in whatever shape the adapter accepts and returns either an opaque `Session` or an `AuthError` value (not a throw). `AuthError` is `{ code, message }`, where `code` is one of six portable codes (`credential_invalid`, `credential_rejected`, `substrate_unavailable`, `identity_unavailable`, `rate_limited`, `auth_failed`); substrate detail stays in `message`. `currentUpactor` answers "who is on this request", with `null` meaning "nobody signed in". A substrate outage is a different condition, so adapters may throw `SubstrateUnavailableError` instead of returning `null`; catch it if you want an outage banner, or let it hit your framework's error boundary.

## What it looks like in an app

```ts
import type { AuthError, IdentityPort } from '@prefig/upact';

async function signIn(port: IdentityPort, email: string, password: string) {
  const result = await port.authenticate({ kind: 'password', email, password });
  if (typeof result === 'object' && result !== null && 'code' in result) {
    const err = result as AuthError;
    return err.code === 'credential_rejected' ? 'Wrong email or password.' : 'Sign-in failed.';
  }
  return null; // success: result is an opaque Session
}

// Later, in a request handler:
const upactor = await port.currentUpactor(request);
if (upactor?.capabilities.has('email')) {
  // show the "change email" UI; gate on capability, not provider type
}
```

Wiring with the Supabase adapter is one call in your server hook:

```ts
import { createSupabaseAdapter } from '@prefig/upact-supabase';
const identity = createSupabaseAdapter(supabaseServerClient); // returns IdentityPort
```

There is a complete SvelteKit example under `examples/sveltekit-supabase`, and `@prefig/upact-oidc` exports `createOidcAdapter` with the same shape.

## Sessions are opaque at runtime

Application code cannot create or read the contents of a `Session`. The type system and the runtime both block this. A session is an empty, frozen object. The actual data is stored in a private `WeakMap` using that object as a key.

Because of this:

* `JSON.stringify` shows `"[upact:session]"`.
* `Object.keys` returns an empty array `[]`.
* Reading properties returns `undefined`.
* `structuredClone` does not copy any data.

If a session is put into a log or a response body, no tokens will be included. An application can only do one thing with a session: pass it back to the port.

Getting the data back out is adapter code, not part of the app-facing API: only the adapter instance that sealed a session can open it. See `docs/authoring-an-adapter.md`.

## What it is not

- Not authorisation. There are no roles, permissions, or policy anywhere in the types; `capabilities` describes the provider, not the user's rights. What a signed-in person may do is your app's problem.
- Not a user database. There is no profile read/write, no user listing, no admin surface.
- Not a way to reach users. No email or phone comes through, and `display_hint` is explicitly not a contact identifier.

`PresentationRequest` and `Presentation` support a credential-presentation flow: a verifier issues a request (nonce, audience, optional scopes) and the holder answers with a presentation carrying an opaque `vpToken` that echoes the nonce. The fields are named to map onto OpenID4VP (`nonce`, `client_id`, `vp_token`) so a Digital Credentials API adapter stays a thin shim. Ordinary password or OIDC apps can ignore both types.

## Adapters

Eight adapters implement the port today, all at 0.3.0 and all in the [prefig org](https://github.com/prefig):

| Package | Substrate |
|---|---|
| [`@prefig/upact-supabase`](https://github.com/prefig/upact-supabase) | Supabase Auth |
| [`@prefig/upact-oidc`](https://github.com/prefig/upact-oidc) | any OpenID Connect provider |
| [`@prefig/upact-mastodon`](https://github.com/prefig/upact-mastodon) | Mastodon (per-login instance discovery) |
| [`@prefig/upact-atproto`](https://github.com/prefig/upact-atproto) | ATProto (Bluesky) |
| [`@prefig/upact-eudi`](https://github.com/prefig/upact-eudi) | EUDI wallet, as OpenID4VP relying party |
| [`@prefig/upact-promise`](https://github.com/prefig/upact-promise) | Promise Authentication |
| [`@prefig/upact-simplex`](https://github.com/prefig/upact-simplex) | SimpleX Chat |
| [`@prefig/upact-ember`](https://github.com/prefig/upact-ember) | ember (in-person represence) |

Writing your own is the intended path when your substrate is not listed; see `docs/authoring-an-adapter.md`.

## Install

```sh
npm install @prefig/upact @prefig/upact-supabase   # or @prefig/upact-oidc
```

Two entry points: `@prefig/upact` (all types, `SubstrateUnavailableError`) for apps and adapters, and `@prefig/upact/internal` (`createOpaqueSession`) for adapters only. ESM, Node 18 or later, no runtime dependencies.
