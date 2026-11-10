import { existsSync, readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { createAjv, loadCatalog, rootDir } from "./load-ajv.mjs"
import {
  INTEGRITY_FILE,
  loadIntegrityManifest,
  verifyPackageIntegrity,
} from "./content-hash.mjs"
import {
  assertLayout,
  collectObjectKeys,
  findConsentEvidenceFiles,
  findExecutableFiles,
  readJson,
  toPosix,
} from "./package-layout.mjs"

const KIND_COLLECTIONS = [
  ["sport", "sports"],
  ["country", "countries"],
  ["competition", "competitions"],
  ["category", "categories"],
  ["club", "clubs"],
  ["team", "teams"],
  ["season", "seasons"],
  ["squad", "squads"],
  ["player", "players"],
  ["membership", "memberships"],
]

const MIME_MAGIC = {
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/webp": null,
}

const matchesMagic = (buf, patterns) => {
  for (const pattern of patterns) {
    if (buf.length < pattern.length) {
      continue
    }
    let ok = true
    for (let i = 0; i < pattern.length; i += 1) {
      if (buf[i] !== pattern[i]) {
        ok = false
        break
      }
    }
    if (ok) {
      return true
    }
  }
  return false
}

const assertWebp = (buf) => {
  if (buf.length < 12) {
    return false
  }
  const riff = buf.toString("ascii", 0, 4)
  const webp = buf.toString("ascii", 8, 12)
  return riff === "RIFF" && webp === "WEBP"
}

const validateData = (ajv, schemaId, data, label) => {
  const validate = ajv.getSchema(schemaId)
  if (!validate) {
    throw new Error(`missing schema ${schemaId}`)
  }
  if (!validate(data)) {
    throw new Error(`${label}: ${ajv.errorsText(validate.errors)}`)
  }
}

const indexById = (rows, label) => {
  const map = new Map()
  for (const row of rows) {
    if (map.has(row.id)) {
      throw new Error(`${label}: duplicate id ${row.id}`)
    }
    map.set(row.id, row)
  }
  return map
}

const requireRef = (map, id, label) => {
  if (!map.has(id)) {
    throw new Error(`${label}: missing reference ${id}`)
  }
}

const assertMimeFile = (packageDir, photo, label) => {
  if (photo.path.includes("..")) {
    throw new Error(`${label}: photo path must not contain ..`)
  }
  const abs = join(packageDir, photo.path)
  if (!existsSync(abs)) {
    throw new Error(`${label}: photo file missing ${photo.path}`)
  }
  const buf = readFileSync(abs)
  if (photo.mime === "image/webp") {
    if (!assertWebp(buf)) {
      throw new Error(`${label}: photo bytes are not image/webp`)
    }
    return
  }
  const patterns = MIME_MAGIC[photo.mime]
  if (!patterns || !matchesMagic(buf, patterns)) {
    throw new Error(`${label}: photo bytes do not match mime ${photo.mime}`)
  }
}

export const validatePackageDir = (packageDir, { expectValid, requireFiction }) => {
  const ajv = createAjv()
  const catalog = loadCatalog()
  const label = toPosix(relative(rootDir, packageDir))
  const layoutErrors = assertLayout(packageDir)
  if (expectValid && layoutErrors.length > 0) {
    throw new Error(`${label} layout: ${layoutErrors.join("; ")}`)
  }
  if (!expectValid && layoutErrors.length > 0) {
    return { label, ok: false, reason: `layout: ${layoutErrors.join("; ")}` }
  }

  try {
    for (const [rel, schemaId] of Object.entries(catalog.package_file_schemas)) {
      const path = join(packageDir, rel)
      // integrity.json is a companion artifact; optional on fixtures, required on shipped.
      if (rel === INTEGRITY_FILE && !existsSync(path)) {
        continue
      }
      const data = readJson(path)
      validateData(ajv, schemaId, data, `${label}/${rel}`)
    }

    const execFiles = findExecutableFiles(packageDir)
    if (execFiles.length > 0) {
      throw new Error(
        `${label}: executable files forbidden: ${execFiles
          .map((f) => toPosix(relative(packageDir, f)))
          .join(", ")}`
      )
    }

    const consentFiles = findConsentEvidenceFiles(packageDir)
    if (consentFiles.length > 0) {
      throw new Error(
        `${label}: consent evidence must never be stored in Git: ${consentFiles
          .map((f) => toPosix(relative(packageDir, f)))
          .join(", ")}`
      )
    }

    const manifest = readJson(join(packageDir, "manifest.json"))
    const registry = readJson(join(packageDir, "registry.json"))

    if (requireFiction && manifest.fiction !== true) {
      throw new Error(`${label}: shipped packages must set fiction=true (AC-9.7)`)
    }

    const keys = collectObjectKeys(registry)
    for (const banned of catalog.privacy_banned_keys) {
      if (keys.has(banned)) {
        throw new Error(`${label}: privacy-banned field ${banned} (AC-9.2)`)
      }
    }

    const sports = indexById(registry.sports, `${label}/sports`)
    const countries = indexById(registry.countries, `${label}/countries`)
    const competitions = indexById(registry.competitions, `${label}/competitions`)
    const categories = indexById(registry.categories, `${label}/categories`)
    const clubs = indexById(registry.clubs, `${label}/clubs`)
    const teams = indexById(registry.teams, `${label}/teams`)
    const seasons = indexById(registry.seasons, `${label}/seasons`)
    const squads = indexById(registry.squads, `${label}/squads`)
    const players = indexById(registry.players, `${label}/players`)
    const memberships = indexById(registry.memberships, `${label}/memberships`)

    const stableIds = new Set()
    for (const [kind, collection] of KIND_COLLECTIONS) {
      for (const row of registry[collection]) {
        const stableId = `${kind}:${row.id}`
        if (stableIds.has(stableId)) {
          throw new Error(`${label}: duplicate stable id ${stableId}`)
        }
        stableIds.add(stableId)
      }
    }

    for (const country of registry.countries) {
      if (country.id !== country.iso3166_1_alpha2.toLowerCase()) {
        throw new Error(
          `${label}/country:${country.id}: id must equal lowercased ISO 3166-1 alpha-2`
        )
      }
    }

    for (const competition of registry.competitions) {
      requireRef(sports, competition.sport_id, `${label}/competition:${competition.id}`)
      requireRef(countries, competition.country_id, `${label}/competition:${competition.id}`)
    }

    for (const category of registry.categories) {
      requireRef(sports, category.sport_id, `${label}/category:${category.id}`)
    }

    for (const club of registry.clubs) {
      requireRef(countries, club.country_id, `${label}/club:${club.id}`)
    }

    for (const team of registry.teams) {
      requireRef(clubs, team.club_id, `${label}/team:${team.id}`)
      requireRef(sports, team.sport_id, `${label}/team:${team.id}`)
      requireRef(categories, team.category_id, `${label}/team:${team.id}`)
      const category = categories.get(team.category_id)
      if (category.sport_id !== team.sport_id) {
        throw new Error(
          `${label}/team:${team.id}: category sport_id mismatch`
        )
      }
    }

    for (const season of registry.seasons) {
      requireRef(competitions, season.competition_id, `${label}/season:${season.id}`)
    }

    for (const squad of registry.squads) {
      requireRef(teams, squad.team_id, `${label}/squad:${squad.id}`)
      requireRef(seasons, squad.season_id, `${label}/squad:${squad.id}`)
    }

    for (const player of registry.players) {
      if (player.is_minor && player.photo) {
        throw new Error(
          `${label}/player:${player.id}: minors default to no photo (AC-9.3)`
        )
      }
      if (player.photo) {
        if (!player.photo.attribution || !player.photo.license) {
          throw new Error(
            `${label}/player:${player.id}: photo requires attribution and license`
          )
        }
        if (!catalog.photo_mime_allowlist.includes(player.photo.mime)) {
          throw new Error(
            `${label}/player:${player.id}: mime ${player.photo.mime} not allowed`
          )
        }
        if (player.photo.mime === "image/svg+xml" || player.photo.path.toLowerCase().endsWith(".svg")) {
          throw new Error(`${label}/player:${player.id}: SVG photos rejected`)
        }
        assertMimeFile(packageDir, player.photo, `${label}/player:${player.id}`)
      }
    }

    for (const membership of registry.memberships) {
      requireRef(squads, membership.squad_id, `${label}/membership:${membership.id}`)
      requireRef(players, membership.player_id, `${label}/membership:${membership.id}`)
    }

    if (requireFiction || packageIsUnderShipped(packageDir)) {
      const integrity = loadIntegrityManifest(packageDir)
      if (!integrity) {
        throw new Error(
          `${label}: shipped packages require ${INTEGRITY_FILE} (AC-9.5)`,
        )
      }
      validateData(ajv, INTEGRITY_FILE, integrity, `${label}/${INTEGRITY_FILE}`)
      const check = verifyPackageIntegrity(packageDir, integrity)
      if (!check.ok) {
        throw new Error(
          `${label}: integrity check failed: ${check.errors.join("; ")}`,
        )
      }
    }

    if (!expectValid) {
      return { label, ok: true, reason: "unexpectedly valid" }
    }
    return { label, ok: true, stable_ids: stableIds.size }
  } catch (err) {
    if (!expectValid) {
      return { label, ok: false, reason: String(err.message || err) }
    }
    throw err
  }
}

export const packageIsUnderShipped = (packageDir) => {
  const rel = toPosix(relative(rootDir, packageDir))
  return rel.startsWith(`packages${sep}`) || rel.startsWith("packages/")
}
