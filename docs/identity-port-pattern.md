# The identity port pattern

An introduction to the pattern behind upact. Written as pre-reading for the
upact workshop at DWeb Camp 2026 (July, Alte Hölle); it stands alone. CC BY 4.0.
Normative home: [SPEC.md](../SPEC.md) (v0.1). Companions:
[audit worksheet](workshop-audit-worksheet.md) ·
[worked example](worked-example-dyad-audit.md).

## The pattern in one paragraph

Most small social platforms are built directly against one identity substrate
(Supabase Auth, Auth0, an OIDC provider, a DID method). The coupling makes two
things hard: migrating substrates means rewriting application code, and
refusing data a substrate offers means relying on call-site discipline that
drifts. The upact is a typed contract between the application and any identity
provider, sized so that refusal lives in one place. The property it preserves
is sharp: even when the underlying provider exposes more, the application
cannot consume it, because nothing outside the contract ever crosses the seam.

## The shape, as shipped

The application sees one value type and four operations.

`Upactor` (SPEC §4): an opaque `id` (compare by equality, nothing else), an
optional `display_hint` (best-effort, never a contact identifier), a
`capabilities` set, optional `lifecycle` metadata (`expires_at`, and
`renewable: 'reauth' | 'represence' | 'never'`), and optional informational
`provenance`. No email. No phone. No provider attributes.

Operations (SPEC §6): `authenticate`, `currentUpactor`, `invalidate`,
`issueRenewal`. New provider semantics arrive through capabilities and
lifecycle hints, never by widening the interface.

Capabilities (SPEC §5): the shipped core vocabulary is deliberately two
entries, `email` (the provider can deliver email to this identity) and
`recovery` (the provider supports recovery flows). Applications branch on
capability presence and never on substrate identity; a vocabulary that grew
speculatively would erode the signal, so new capabilities enter the core only
on demonstrated implementation by two providers and consumption by one
application (§5.2).

Privacy minima (SPEC §7, normative MUST NOTs): no identifiers outside the
contract, no silent enrichment, no correlation handles. Providers conform to
these; the runtime kernel's reflection suite checks that sessions cannot be
unwrapped by inspection, and each adapter's back-channel test checks that the
substrate client cannot be reached through the adapter instance.

Identity decay is real on some substrates: an identity may lapse or be
re-issued with a new `id` (SPEC §4.4, §6.4). Applications decide per record
type whether data survives its owner's identity (with anonymised attribution)
or expires with it. Nothing may silently assume identifier permanence.

## Why this is an anti-corruption layer, and the twist

The anti-corruption layer (Evans 2003) is a translation boundary that stops
one bounded context polluting another with its model. The upact is exactly
that, placed between application and identity substrate. Without it, the
substrate's model leaks: code references `auth.users.email`, `session.jwt.sub`,
and the substrate becomes structural to application logic.

The twist is the translation rule. A conventional ACL maps the foreign model
onto a local one, fields renamed and preserved. This one removes fields by
design. Email is absent from `Upactor` even though Supabase has it; an
application that wants to send email checks the `email` capability and invokes
a separate capability-bound channel (§5.3). The layer protects the application
from the substrate's model, and it also protects the user from the
application's tendency to consume whatever the substrate offers. That second
protection is what makes it anti-extractive rather than merely tidy.

## The dual of selective disclosure

Self-sovereign identity (DIDs, verifiable credentials) puts disclosure control
on the user side: the application asks, the user permits or denies, per flow.
The port puts a hard bound on the application side: the application is
architecturally unable to ask for what the contract excludes, whatever the
user would have permitted. The locus of enforcement moves from a thousand
per-flow decisions, each defaulting toward consent fatigue, to one durable
architectural commitment. The approaches compose; they are duals, and the
application-side bound is the one this pattern contributes.

## Threat-model decoupling

Because the application speaks only the contract, the deployment chooses the
provider, and the choice carries the threat model. A neighbourhood platform
runs on an email-backed substrate today. A deployment for which attendance
lists are a hazard binds the same application to a presence-renewed
(`'represence'`) substrate with no central user database: identity is renewed
by showing up, and lapses otherwise. The application code does not change;
the port carries the decoupling. One protocol does not have to be made safe
for every context. The contract stays small, and providers compete on
substrate.

## Two kinds of substrate

Substrates divide by how much work their adapter does:

- **Pre-conforming substrates** already match the privacy minima by their own
  design. Reticulum's destination hashes and SimpleX's identifier-free queues
  are substrate-level realisations of the same disposition; their adapters are
  mostly type translation, with almost nothing to strip.
- **Enforcement-requiring substrates** (Supabase Auth, OIDC and OAuth issuers,
  Fediverse account servers) expose far more than the contract permits; their
  adapters do the stripping, hiding, and capability-bounding. The adapter is
  the anti-corruption layer, in code.

Both are legitimate targets. The port does not pick favourites; some substrates
are simply wider mismatches than others.

## The safety question

The strongest objection the pattern meets: what data do we need to collect
from users to keep them safe? Most collection in social platforms is justified
this way, so the pattern has to answer it rather than deflect it.

Unpacked, the reflexive answers are mostly data the substrate happens to
provide, repurposed as safety. An emergency contact is a user-supplied opt-in
channel, held behind a capability, never a field on the identity. Device
fingerprinting for abuse detection is substrate-side machinery the application
never sees and therefore cannot repurpose. Age verification exposes the
verified fact, held behind a capability, and never the underlying value.
Ban enforcement against rotating identities is the genuinely hard case, and it
is honest to say the platform layer does not solve it: it moves to hosts,
vouching, venues, and community memory. The pattern's claim is that safety
functions should be narrow, capability-bound, and supplied on the user's
terms; it is not a claim that collection produces safety.

## What is actually new here

The components are all established: the ACL pattern, ports and adapters,
identity-provider abstraction, capability-based security (the shape here owes
most to object-capability work and Spritely's OCapN), data minimisation,
privacy by design. Selective disclosure is established on the user side.

The contribution is the combination, published as a small portable contract:
minimum disclosure as the translation rule of an identity-specialised ACL,
enforced in the type system, with threat-model decoupling following from
substrate-agnosticism, and an insistence that applications take identity decay
seriously. Adjacent work exists, and we expect to be told about more of it.
Corrections are a contribution; issues at github.com/prefig/upact are the venue.

## If you read one thing

Read the [worked example](worked-example-dyad-audit.md). It is the audit the
[worksheet](workshop-audit-worksheet.md) asks you to run on your own platform,
run first on ours, with the costs stated.
