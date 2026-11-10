import assert from "node:assert/strict"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  computePackageIntegrity,
  verifyPackageIntegrity,
  writeIntegrityManifest,
} from "../scripts/lib/content-hash.mjs"
import { validatePackageDir } from "../scripts/lib/validate-package.mjs"

const root = join(fileURLToPath(new URL("..", import.meta.url)))
const harbor = join(root, "packages", "harbor_fiction")

const writeMinimalPackage = (dir) => {
  mkdirSync(join(dir, "docs"), { recursive: true })
  writeFileSync(
    join(dir, "manifest.json"),
    `${JSON.stringify(
      {
        schema_version: "0.1.0",
        package_id: "tamper_demo",
        version: "0.1.0",
        display_name: "Tamper Demo",
        description: "Integrity failure fixture",
        fiction: true,
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    join(dir, "registry.json"),
    `${JSON.stringify(
      {
        schema_version: "0.1.0",
        sports: [{ id: "basketball", name: "Basketball" }],
        countries: [{ id: "it", name: "Italy", iso3166_1_alpha2: "IT" }],
        competitions: [],
        categories: [],
        clubs: [],
        teams: [],
        seasons: [],
        squads: [],
        players: [],
        memberships: [],
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(join(dir, "docs", "README.md"), "fiction only\n")
}

test("content hash is stable for unchanged package", () => {
  const a = computePackageIntegrity(harbor)
  const b = computePackageIntegrity(harbor)
  assert.equal(a.content_hash, b.content_hash)
  assert.equal(a.algorithm, "sha256")
  assert.equal(a.package_id, "harbor_fiction")
  assert.match(a.content_hash, /^[a-f0-9]{64}$/)
})

test("shipped integrity.json verifies", () => {
  writeIntegrityManifest(harbor)
  const result = validatePackageDir(harbor, {
    expectValid: true,
    requireFiction: true,
  })
  assert.equal(result.ok, true)
  const check = verifyPackageIntegrity(
    harbor,
    JSON.parse(readFileSync(join(harbor, "integrity.json"), "utf8")),
  )
  assert.equal(check.ok, true, check.errors?.join("; "))
})

test("CRLF and LF text files share the same content hash", () => {
  const lfDir = mkdtempSync(join(tmpdir(), "om-teams-lf-"))
  const crlfDir = mkdtempSync(join(tmpdir(), "om-teams-crlf-"))
  try {
    writeMinimalPackage(lfDir)
    mkdirSync(join(crlfDir, "docs"), { recursive: true })
    for (const name of ["manifest.json", "registry.json", "docs/README.md"]) {
      const body = readFileSync(join(lfDir, name), "utf8").replace(/\n/g, "\r\n")
      writeFileSync(join(crlfDir, name), body)
    }
    const lfHash = computePackageIntegrity(lfDir).content_hash
    const crlfHash = computePackageIntegrity(crlfDir).content_hash
    assert.equal(crlfHash, lfHash)
  } finally {
    rmSync(lfDir, { recursive: true, force: true })
    rmSync(crlfDir, { recursive: true, force: true })
  }
})

test("tampered file fails integrity check", () => {
  const dir = mkdtempSync(join(tmpdir(), "om-teams-integrity-"))
  try {
    writeMinimalPackage(dir)
    const { integrity } = writeIntegrityManifest(dir)
    const good = verifyPackageIntegrity(dir, integrity)
    assert.equal(good.ok, true)

    writeFileSync(join(dir, "docs", "README.md"), "tampered\n")
    const bad = verifyPackageIntegrity(dir, integrity)
    assert.equal(bad.ok, false)
    assert.ok(bad.errors.some((e) => e.includes("hash") || e.includes("content_hash")))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
