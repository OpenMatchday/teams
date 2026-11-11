import { mkdirSync, readdirSync, readFileSync, writeFileSync, statSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const packagesDir = join(root, "packages")
const outDir = join(root, "dist")
const outPath = join(outDir, "website-catalog.v0.json")

const packages = []
const entries = []

for (const name of readdirSync(packagesDir)) {
  const dir = join(packagesDir, name)
  if (!statSync(dir).isDirectory()) continue
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))
  const registry = JSON.parse(readFileSync(join(dir, "registry.json"), "utf8"))

  packages.push({
    package_id: manifest.package_id,
    display_name: manifest.display_name,
    version: manifest.version,
    description: manifest.description,
    fiction: manifest.fiction === true,
  })

  const sportsById = Object.fromEntries((registry.sports ?? []).map((s) => [s.id, s]))
  const clubsById = Object.fromEntries((registry.clubs ?? []).map((c) => [c.id, c]))
  const teamsById = Object.fromEntries((registry.teams ?? []).map((t) => [t.id, t]))
  const playersById = Object.fromEntries((registry.players ?? []).map((p) => [p.id, p]))

  for (const club of registry.clubs ?? []) {
    entries.push({
      kind: "club",
      id: club.id,
      package_id: manifest.package_id,
      name: club.name,
      alias: club.alias ?? null,
      sport_ids: [...new Set(
        (registry.teams ?? [])
          .filter((t) => t.club_id === club.id)
          .map((t) => t.sport_id),
      )],
      fiction: true,
      search_text: [club.name, club.alias, club.id].filter(Boolean).join(" ").toLowerCase(),
    })
  }

  for (const team of registry.teams ?? []) {
    const club = clubsById[team.club_id]
    const sport = sportsById[team.sport_id]
    entries.push({
      kind: "team",
      id: team.id,
      package_id: manifest.package_id,
      name: team.name,
      alias: team.alias ?? null,
      club_id: team.club_id,
      club_name: club?.name ?? null,
      sport_id: team.sport_id,
      sport_name: sport?.name ?? null,
      fiction: true,
      search_text: [team.name, team.alias, team.id, club?.name, sport?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    })
  }

  for (const player of registry.players ?? []) {
    const memberships = (registry.memberships ?? []).filter((m) => m.player_id === player.id)
    const teamNames = []
    for (const membership of memberships) {
      const squad = (registry.squads ?? []).find((s) => s.id === membership.squad_id)
      const team = squad ? teamsById[squad.team_id] : null
      if (team?.name) teamNames.push(team.name)
    }
    entries.push({
      kind: "player",
      id: player.id,
      package_id: manifest.package_id,
      name: player.name,
      alias: player.alias ?? null,
      is_minor: player.is_minor === true,
      has_photo: Boolean(player.photo),
      team_names: [...new Set(teamNames)],
      fiction: true,
      search_text: [player.name, player.alias, player.id, ...teamNames]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    })
  }

  for (const competition of registry.competitions ?? []) {
    const sport = sportsById[competition.sport_id]
    entries.push({
      kind: "competition",
      id: competition.id,
      package_id: manifest.package_id,
      name: competition.name,
      sport_id: competition.sport_id,
      sport_name: sport?.name ?? null,
      fiction: true,
      search_text: [competition.name, competition.id, sport?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    })
  }
}

entries.sort((a, b) => {
  const kind = a.kind.localeCompare(b.kind)
  if (kind !== 0) return kind
  return a.name.localeCompare(b.name)
})

const catalog = {
  schema_version: "0.1.0",
  generated_for: "website",
  note: "Public registry browser index. Fictional fixtures only in shipped packages. Photos are not mirrored onto the website.",
  packages,
  entries,
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outPath, `${JSON.stringify(catalog, null, 2)}\n`)
console.log(
  `TEAMS_WEBSITE_CATALOG_OK packages=${packages.length} entries=${entries.length}`,
)
