# Open Matchday -- teams

Public teams registry: sports, countries, competitions, categories, clubs, teams, seasons, squads, players, memberships, and attributed photos.

Part of the [OpenMatchday](https://github.com/OpenMatchday) organization.

## Schema

JSON Schema 2020-12 under `schemas/v0/` (SemVer `0.1.0`). See [docs/taxonomy.md](docs/taxonomy.md).

## Privacy

- Public fields only; no DOB or contacts ([docs/privacy.md](docs/privacy.md))
- Minors default to no photo; consent evidence never in Git
- Takedown docs live in the sibling `docs` repo (`privacy/takedown.md`) and do not promise Git-history erasure
- Shipped packages are clearly fictional (`fiction: true`)

## Commands

```bash
npm ci
npm run check
npm run validate
npm test
npm run typecheck
```

## License

MIT. See [LICENSE](LICENSE).
