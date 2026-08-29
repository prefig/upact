# Worked example: auditing Dyad's identity layer

Companion to the [audit worksheet](workshop-audit-worksheet.md) · CC BY 4.0
Audited: [Dyad](https://github.com/dyad-berlin/dyad) (SvelteKit + Supabase, AGPL-3.0), April 2026 snapshot.

This is the audit the worksheet's ten concerns were distilled from, run on our
own platform before we asked anyone else to run it on theirs. Findings are
lightly condensed; the method and the numbers are as we found them.

## Method

`git grep` passes over `src/` and `supabase/migrations/` for substrate-coupling
markers: `sendEmail`, `\.email`, `auth.users`, `app_metadata`, `user_metadata`,
`resetPasswordForEmail`, `signInWith`, service-role key names, `user_id` /
`userId`. Findings grouped by concern and classified with the worksheet's key:
**[S]** substrate-shaped, **[D]** domain data, **[C]** already clean.

## Findings, by worksheet concern

| # | Concern | Verdict | What we found |
|---|---------|---------|---------------|
| 1 | Identity field reads | **C** | Zero non-test reads of `identity.email` in application code. An earlier refactor moved all identity consumption behind a single service; call sites consume `identity.id` and nothing else. |
| 2 | Identity vs application data | **D** | `invitations.email` and `contacts.email` hold addresses a *person handed us* (an inviter typing an invitee's address), not substrate-issued identity. They survive any substrate change. |
| 3 | Auth UI shape | **S** | The entire `(auth)` route group (login, signup, join, waitlist, auth dialog) is email/password/OTP-shaped. None of it makes sense on a substrate without email. |
| 4 | Recovery story | **S** | One recovery path: `resetPasswordForEmail`. On a substrate without `recovery`, losing your credential means becoming a new user, and the UI must say so honestly. |
| 5 | Outbound delivery | **D** (transport) | All three `sendEmail` call sites take the recipient from domain rows, never from the identity object. The transport is capability-bound; the *features* (waitlist confirmation, invite links) need substrate-appropriate channels where email is absent. |
| 6 | Foreign keys into the substrate | **S** | ~10 FK columns across 7 migrations reference `auth.users(id)` directly (prompts, comments, invitations, meetings, feedback forms, profiles). Every one couples the application schema to the vendor's auth schema. The largest single finding. |
| 7 | Substrate machinery in the data layer | **S** | Five Postgres functions/triggers read or write `auth.users` directly (email confirmation, registration checks, invite validation, new-user trigger). Each either becomes Supabase-conditional or moves behind the adapter. |
| 8 | Where "admin" lives | **S** | `app_metadata.role` read in three places for the admin gate. Authorization does not belong on the identity port (SPEC §3.1); the migration is a role column of our own, behind one `isAdmin()` helper. |
| 9 | Privileged clients | **S** | A service-role admin client verifies invite tokens and creates accounts pre-login. Service-role is a vendor concept; those operations belong in the adapter, and on peer-to-peer substrates they do not exist at all. |
| 10 | ID permanence | **S** | No id-rotation handling anywhere. Queries assume the caller's id equals the id stored in historic rows. On a presence-renewed (`'represence'`) substrate such as ember, every record type needs an explicit preserve-or-expire decision for what happens when its owner's identity lapses. Today the stability of vendor ids makes this work by accident, not by design. |

Marks: **S 7 · D 2 · C 1.**

Both of the worksheet's "usual surprises" are ours: concern 2 turned out to be
domain data we keep, and concern 6 was the biggest coupling we found.

## What the migration actually costs

Estimated from the findings, ordered cheap to dear:

| Concern | Effort | Notes |
|---|---|---|
| 8 admin role migration | ~half day | SQL migration + helper + 3 call-site updates |
| 4 recovery UX | ~half day | Capability-conditional rendering of the reset path |
| 5 delivery channels | ~1–2 days | Non-email invite delivery is a UX rebuild, not a config change |
| 10 id-rotation annotations | ~1–2 days | Classify every record type; write the renewal hook |
| 9 privileged-client abstraction | ~1–2 days | Move admin-side operations into the adapter contract |
| 3 auth UI | ~3–5 days | The whole `(auth)` group needs a non-email parallel |
| 6 + 7 schema decoupling | ~3–5 days | Application-owned `identities` table, ~7 FK migrations, stored-procedure rewrites, RLS updates, backfill |

**Total: roughly 10 to 18 focused days** to make the application genuinely
substrate-agnostic. About a third of it is worth doing regardless of whether a
second substrate ever ships.

## The lesson the numbers teach

The port abstraction (upact plus the Supabase adapter) was the easy part. The
application behind it is the harder, larger piece: capability-awareness has to
run all the way through the auth UI, the schema, and the data model, or the
port is a clean seam into a coupled house. That is exactly what the worksheet's
Part 3 asks you to price honestly, and why its last field asks for the number
your cofounder would not want to hear. Ours is in the table above.

---

First published as workshop pre-reading for DWeb Camp 2026. Corrections and your own
audit results are welcome at [github.com/prefig/upact/issues](https://github.com/prefig/upact/issues). CC BY 4.0.
