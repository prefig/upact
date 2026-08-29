# Identity audit worksheet

CC BY 4.0 · first run at the upact workshop, DWeb Camp 2026
Spec: github.com/prefig/upact (SPEC.md v0.1) · Worked example: the Dyad audit (linked from the repo)

You will audit one platform: your own, a partner's, or the provided one (appendix A).
Work on paper or laptop. Nothing here requires running code; a checkout to grep is
useful but optional. The timeboxes suit a facilitated session; the worksheet also
works solo, untimed.

---

## Part 0. Name the patient (2 min)

Platform: ______________________________________

Identity substrate(s) today (Supabase / Auth0 / OIDC provider / DID method /
homegrown / other): ______________________________________

Who operates it: ______________________________________

One sentence on who your users are and what they would lose if the platform
lost its identity records: ______________________________________

---

## Part 1. The audit (20 min)

Ten concerns. For each: answer the question, then classify what you found.

Classification key, used throughout:

- **[S] substrate-shaped**: only works on your current provider; breaks or lies on any other
- **[D] domain data**: information your application collected for its own purposes; survives a substrate change
- **[C] already clean**: consumed through a narrow seam or not present

If you have a checkout, the grep column gives a starting pattern. Adjust names
to your stack; the pattern matters, not the string.

| # | Concern | Ask yourself | Grep starter | S / D / C |
|---|---------|--------------|--------------|-----------|
| 1 | Identity field reads | Where does application code read `email`, `phone`, `handle`, or metadata off the logged-in identity? | `\.email`, `user_metadata` | |
| 2 | Identity vs application data | For every stored email/phone/address column: did the *substrate* issue it, or did a *person hand it to you* (invitee address, contact form)? | column names in migrations | |
| 3 | Auth UI shape | Could your login, signup, and join screens make any sense on a substrate with no email and no password? | `routes/(auth)`, `signInWith` | |
| 4 | Recovery story | What happens when a user loses their credential? Is there any path other than email reset? | `resetPassword`, `recovery` | |
| 5 | Outbound delivery | When you send something to a user, where does the address come from: the identity object, or a domain row someone filled in? | `sendEmail`, `notify` | |
| 6 | Foreign keys into the substrate | Do your application tables reference the provider's user table directly? Count the FK columns. | `auth.users`, `REFERENCES` | |
| 7 | Substrate machinery in the data layer | Triggers, stored procedures, or jobs that read or write the provider's tables directly? | function bodies in migrations | |
| 8 | Where "admin" lives | Is authorization stored in substrate metadata (`app_metadata.role`) or in your own tables? (The port refuses to model authz; see SPEC §3.1.) | `app_metadata`, `role` | |
| 9 | Privileged clients | Service-role keys, admin APIs, backdoor clients: what uses them, and could that logic live behind an adapter instead? | `SERVICE_ROLE`, `admin` | |
| 10 | ID permanence | If every user's identifier rotated tomorrow, which records could still be read by their owners? Which queries silently return nothing? | `user_id`, `userId` | |

Count your marks: S ___ D ___ C ___

The two usual surprises, from the worked example: concern 2 usually turns out to be
domain data (it survives; you keep it), and concern 6 is usually the largest single
coupling (every FK is a vote for your current vendor).

---

## Part 2. Map findings onto the port (15 min)

The upact's shipped capability vocabulary is deliberately small (SPEC §5.1):

- `email`: the provider can deliver email to this identity
- `recovery`: the provider supports identity recovery flows

Plus the optional lifecycle axis an identity may carry (SPEC §4.4):
`expires_at`, and `renewable: 'reauth' | 'represence' | 'never'`.

For each **[S]** finding from Part 1, decide its lane:

| Finding (concern #) | Gate on `email` | Gate on `recovery` | Lifecycle / decay handling | **No capability fits: name the gap** |
|---------------------|-----------------|--------------------|----------------------------|--------------------------------------|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

**Gaps are the point.** Do not force a finding onto `email` because it is the only
capability there. A named gap ("send to this person via the substrate's preferred
channel", "verify an operator out-of-band", yours here) is a candidate for the
§5.2 registry: capabilities enter the core vocabulary on demonstrated
implementation by two providers and consumption by one application. Your gap,
written clearly, is a contribution: open an issue at github.com/prefig/upact
with your gap table. The §5.2 vocabulary discussion works from these.

One warning while you map (SPEC §3.1): if you found "admin" in substrate metadata
(concern 8), the port will not carry it. Authorization is application-owned by
design. The migration for that finding is a role table of your own, not a
capability.

---

## Part 3. Migration sketch (20 min; in pairs if you have one)

One page. With a pair: swap at ten minutes and pressure-test each other's. Solo: take a break at ten minutes and re-read your own sketch as a sceptic.

**Adapter:** which existing adapter fits your substrate, or what would
`@prefig/upact-<yours>` have to wrap? ______________________________________

**Keep:** the domain data and clean seams from Part 1 (your D and C marks).
______________________________________

**Refuse:** which fields does your substrate expose that your application,
after this audit, should be structurally unable to consume?
______________________________________

**First PR:** the smallest change that moves a concern from S to C. (From the
worked example: moving admin-role storage out of substrate metadata was half a
day; the FK decoupling was the multi-day tail. Sequence cheap-to-dear.)
______________________________________

**The honest cost:** the port is the easy part. Count your concern-3 and
concern-6 marks and estimate the application-side work in days, not hours.
Write the number your cofounder would not want to hear: ______

---

## Afterwards

- Working group: issues at github.com/prefig/upact
- The worked example (Dyad, all ten concerns, with effort estimates) and this
  worksheet stay up at the repo under CC BY 4.0

---

## Appendix A. The provided platform (for participants without one)

**Lindenhof** is a neighbourhood tool-library and skill-share for one Berlin
Kiez. Members list tools they will lend and skills they will teach; borrowing
or booking happens through the platform; a steward approves new members.

Its stack, briefly:

- Supabase auth (email + password); members sign up with an invite code
- `members.email` displayed on every lending agreement page
- Lending agreements table: `lender_id` and `borrower_id` both
  `REFERENCES auth.users(id) ON DELETE CASCADE`
- Password reset by email; no other recovery
- Reminder emails ("your drill is due back") sent to the address on the
  identity object
- Stewards are `app_metadata.role = 'steward'`, checked in twelve places
- A nightly job reads `auth.users` directly to purge members who never
  confirmed their email
- Tool photos keyed by `owner_id`; the Kiez association wants tools to remain
  listed (with the owner anonymised) after a member leaves

Audit Lindenhof with Part 1 as if you maintained it. It contains at least one
instance of every concern, two findings that are domain data rather than
substrate coupling, and one record type that wants `'preserve'` rather than
`'expire'`.

---

Worksheet v0.1, 2026-07-03. Feedback: issues at github.com/prefig/upact.
CC BY 4.0. Reference adapters Apache-2.0.
