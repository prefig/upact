# Governance

## v0.x (current)

Theodore Evans is the maintainer. Decisions about the spec, capability vocabulary, and normative content are made by the maintainer, informed by adapter authors and application developers through issues and PRs.

The inverse-kinematics principle (see `CONTRIBUTING.md`) is the primary constraint on spec growth. The maintainer applies it consistently; so should anyone making a case for a change.

Decisions are recorded in commits to `SPEC.md` and `ROADMAP.md`, not in issue threads. Issue threads carry context; the commit is the decision.

## v1.0 (target)

Decisions about the core capability vocabulary (§5.1) and MUST clauses (§7) move to a working group of ≥3 conforming-adapter authors at v1.0. A *conforming-adapter author* is an organisation or individual who:

- Maintains a published `@prefig/upact-*` package that passes the sixteen-vector reflection test,
- has shipped a `CONFORMANCE.md` against a specific version of the spec, and
- is actively maintaining the adapter (a PR or release in the last twelve months).

The working group operates on rough consensus. When rough consensus is absent, the maintainer retains casting vote.

Additions to the capability vocabulary after v1.0 require a working group decision AND demonstration of:

1. Implementation by ≥2 independent conforming adapters, and
2. Consumption by ≥1 shipped application.

Changes to MUST clauses require the same bar plus a migration period during which the old behaviour remains valid.

## Forks

upact is dual-licensed (CC BY 4.0 / Apache-2.0; see `LICENSE` and `LICENSE-CODE`). Forks are permitted; they are asked to rename the package to avoid registry confusion. Forked packages that claim upact conformance MUST reference the specific version of the spec they conform to in their `CONFORMANCE.md`.

## Conflicts

Disputes about spec interpretation go to the issue tracker. The maintainer resolves them by issuing a normative clarification (a commit to `SPEC.md`). Disputes about governance itself go to the working group at v1.0; before v1.0, they go to the maintainer.
