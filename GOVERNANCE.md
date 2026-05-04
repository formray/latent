# Governance

Latent is a small, founder-led OSS project. This document records how
decisions get made today and what would need to change for that to
evolve.

## Maintainers

- **Giuseppe Albrizio** ([@giuseppealbrizio](https://github.com/giuseppealbrizio))
  — founder, sole maintainer at this stage. Final call on roadmap,
  releases, and contributor disputes. Project lives in the
  [Formray](https://github.com/formray) GitHub organization.

When the project gains additional regular committers, this section grows
and decision-making moves to the model below.

## Decision-making

| Type of decision | Today | Future (≥2 maintainers) |
| --- | --- | --- |
| Bug fixes, doc fixes, small refactors | Maintainer reviews & merges | Any maintainer reviews & merges |
| Features inside the roadmap | Maintainer scopes & merges | Lazy consensus among maintainers (48h objection window) |
| New dependencies | Maintainer decides | Lazy consensus, with a written rationale in the PR |
| Roadmap changes | Maintainer decides | Maintainer consensus required |
| Breaking API changes in `@latent/*` packages | Maintainer + ADR | Maintainer consensus + ADR |
| License changes | Founder only | Founder only (cannot be delegated) |

"Lazy consensus" means: a proposal is approved if no maintainer objects
within the stated window. Objections must be substantive (not just
preference) and reviewed publicly.

## Roadmap

The current roadmap lives in `ROADMAP.md`. We don't take feature requests
that aren't on it, but we do read every issue. Off-roadmap requests get
labeled `out-of-scope` and closed with a thank-you.

## Releases

- Apps follow [semver](https://semver.org/) starting from V1.0.0 at
  public launch (Phase 7)
- Packages (`@latent/*`) follow semver from their first published version
- Pre-launch, we ship from `main`. The `CHANGELOG.md` `[Unreleased]`
  section is the source of truth for what's pending

## Trademark and project name

"Latent" as used by this project is governed under the same terms as the
codebase. Forks and derivative works **must rename** unless they receive
explicit written permission. See `docs/adr/` (forthcoming) for the
trademark policy ADR scheduled at Phase 7.

## Funding

This project takes no money today. If/when we accept sponsorship, the
mechanism is GitHub Sponsors with a public ledger. We will never accept
funding that comes with feature direction strings attached — see the
roadmap section above.

## Changing this document

Open a PR. The founder has final approval until additional maintainers
are added.
