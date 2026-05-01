# SvelteKit + Supabase — upact example

Minimal SvelteKit app wired to `@prefig/upact-supabase`. Shows the three integration points: hook wiring, type augmentation, and capability-gated page load.

## Files

| File | What it shows |
|---|---|
| `src/hooks.server.ts` | Create the adapter once per request, resolve `currentUpactor`, attach both to `locals` |
| `src/app.d.ts` | Type augmentation — `locals.identity: IdentityPort`, `locals.upactor: Upactor \| null` |
| `src/routes/+layout.server.ts` | Pass the upactor to all routes via `PageData` |
| `src/routes/(app)/dashboard/+page.server.ts` | Auth guard + capability check (`capabilities.has('email')`) |
| `src/routes/auth/sign-in/+page.server.ts` | `identity.authenticate` in a form action; branch on `AuthError.code` |

## What the application never sees

- Email, phone, or any contact identifier — not on `Upactor`, not in `locals`.
- Raw Supabase `User` objects — never passed to routes or components.
- JWT claims, `app_metadata`, `user_metadata` — stripped at the adapter boundary.
- An unwrappable session value — `JSON.stringify(session)` returns `"[upact:session]"`.

## Running

```sh
# Prerequisites: Node >=18, a Supabase project (or local Supabase).
npm install
# Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in .env
npm run dev
```

## Swapping the substrate

Replace `@prefig/upact-supabase` with `@prefig/upact-simplex` (or a future `@prefig/upact-oidc`) in `hooks.server.ts`. The dashboard, layout, and sign-in form are substrate-agnostic — they depend only on `IdentityPort` and `Upactor`.
