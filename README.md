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

## Offline cache

Shipped packages publish `integrity.json` (SemVer + SHA-256 content hash). See [docs/cache.md](docs/cache.md) (AC-9.4, AC-9.5).

## Community PRs (AC-10.6)

The community GitHub App may write only allowlisted registry paths under `packages/`. See [docs/contribution-paths.md](docs/contribution-paths.md).

## Commands

```bash
npm ci
npm run check
npm run integrity
npm run validate
npm run catalog
npm test
npm run typecheck
```

`npm run catalog` writes `dist/website-catalog.v0.json` (searchable fiction-only registry index for the website browser).

## License

MIT. See [LICENSE](LICENSE).
