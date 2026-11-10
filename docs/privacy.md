# Registry privacy rules

Applies to every package under `packages/` and validation fixtures.

## Public registry (AC-9.2)

Store only public production fields needed for broadcast lineups and catalogs:

- names / aliases
- shirt numbers and positions via memberships
- optional photo with attribution and license

Never store dates of birth or contact details in Git.

## Minors (AC-9.3)

- `is_minor: true` defaults to **no photo**
- Guardian consent process: see [docs/privacy/minors-consent.md](../../docs/privacy/minors-consent.md) in the sibling `docs` repository
- Consent evidence must never be committed to this repository (CI rejects `consent/` paths and `consent_evidence` fields)

## Fictional fixtures (AC-9.7)

Shipped packages set `fiction: true` and use clearly fictional club and player names. Do not invent real clubs or players as facts.

## Takedown (AC-9.6)

See [docs/privacy/takedown.md](../../docs/privacy/takedown.md). Docs do not promise erasure of Git history.
