# Security

## Reporting a vulnerability

Report security issues by email to **theodore@brave.berlin**. Do not open a public issue for a security vulnerability.

Include:

- A description of the vulnerability and its impact.
- Steps to reproduce.
- Any known mitigations or workarounds.

You will receive an acknowledgement within 72 hours and a resolution timeline within seven days.

## What counts as a vulnerability in upact

upact's security surface is its port-level privacy guarantees. The following are in scope:

- **Session opacity bypass.** A technique that lets application code unwrap a `Session` and recover the substrate handle or user identifier via any reflection vector (`JSON.stringify`, `util.inspect`, `structuredClone`, `Proxy`, `WeakMap` side-channels, etc.).
- **Adapter back-channel leak.** A pattern that allows a conforming adapter to expose the substrate client (or substrate-internal tokens) through the adapter instance's enumerable properties or prototype chain, bypassing the Decision 11 (§7.5) closure-capture requirement.
- **`_unwrapSession` misuse vector.** A scenario where `_unwrapSession` from `@prefig/upact/internal` can be called by application code that is not supposed to have access to it, without importing from the `./internal` subpath explicitly.
- **Capability-check bypass.** A pattern where `capabilities` on an `Upactor` can be mutated by application code after construction.
- **`display_hint` email leakage.** An adapter pattern that allows email-shaped strings to reach `display_hint` in violation of §4.2 MUST NOT clauses.

The following are **out of scope**:

- Vulnerabilities in the underlying substrate (Supabase Auth, SimpleX, OIDC providers). Those are the substrate vendor's responsibility.
- Application-level misuse (e.g., an application that ignores upact and calls the substrate directly). upact does not prevent this; it is the architectural cost of explicit substrate coupling.
- Social-engineering attacks against adapter maintainers. These are supply-chain concerns and handled per the adapter repository's own security policy.

## Conformance and security

A conforming adapter's security posture is described in its `CONFORMANCE.md`. Applications that need stronger threat-model guarantees (e.g. adversarial-context coordination) SHOULD choose a substrate whose threat model matches — see `SPEC.md §10`.
