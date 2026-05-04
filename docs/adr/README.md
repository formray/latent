# Architecture Decision Records

ADRs document non-obvious choices we made and why. They are not living
documents — once an ADR is accepted, it's immutable. Subsequent decisions
that reverse or amend an earlier one create a new ADR that supersedes the
prior, with a link both ways.

## When to write one

- A choice between two reasonable alternatives that another contributor
  might revisit later
- A constraint we accepted (e.g. "no Supabase Auth SDK in app code") that
  isn't visible from the code alone
- A protocol or wire-format decision that affects compatibility

## File format

Filename: `NNNN-short-title.md` (zero-padded, monotonic).

Each ADR has the following sections:

```markdown
# NNNN — Short title

- Status: Proposed | Accepted | Superseded by NNNN
- Date: YYYY-MM-DD
- Deciders: <names>

## Context

What forces are at play, what we know, what we don't.

## Decision

What we chose, stated plainly.

## Consequences

What this enables, what it costs, what it forecloses.

## Alternatives considered

What we looked at and rejected, briefly with reasons.
```

The current spec (`docs/specs/2026-05-03-fujicomp-v1-design.md` §15.9–15.16)
enumerates the ADRs scheduled for V1 launch.
