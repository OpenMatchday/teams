# Teams registry taxonomy

Stable-ID taxonomy for the public `teams` registry (PROJECT_SPEC AC-9.1).

## Kinds

| Kind | Stable id form | Meaning |
|---|---|---|
| sport | `sport:{id}` | Sport discipline (e.g. basketball, futsal) |
| country | `country:{id}` | Country; `id` is lowercased ISO 3166-1 alpha-2 |
| competition | `competition:{id}` | Competition hosted in a country for a sport |
| category | `category:{id}` | Age or competition category within a sport |
| club | `club:{id}` | Club / organization |
| team | `team:{id}` | Team under a club for a sport and category |
| season | `season:{id}` | Season of a competition |
| squad | `squad:{id}` | Team roster for a season |
| player | `player:{id}` | Public player record |
| membership | `membership:{id}` | Player membership on a squad (number, position) |

Local `{id}` values are snake_case (`^[a-z][a-z0-9_]*$`). Stable ids are unique within a package.

## Public fields only (AC-9.2)

Allowed public fields include name or alias, squad number, position, membership links, and optional licensed photo with attribution.

Banned from the public registry: dates of birth and contacts (email, phone, address, guardian contacts, national ids, consent evidence paths). Validation rejects banned keys.

## Sources

- ISO 3166-1 country codes: https://www.iso.org/iso-3166-country-codes.html
- JSON Schema 2020-12: https://json-schema.org/draft/2020-12/schema
- Semantic Versioning 2.0.0: https://semver.org/
