import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { loadCatalog } from "../scripts/lib/load-ajv.mjs"
import { validatePackageDir } from "../scripts/lib/validate-package.mjs"

const root = join(fileURLToPath(new URL("..", import.meta.url)))
const invalid = (...parts) => join(root, "fixtures", "packages", "invalid", ...parts)

test("privacy banned keys include DOB and contacts", () => {
  const catalog = loadCatalog()
  for (const key of [
    "date_of_birth",
    "dob",
    "email",
    "phone",
    "contact",
    "consent_evidence",
  ]) {
    assert.ok(catalog.privacy_banned_keys.includes(key), key)
  }
})

test("rejects DOB field", () => {
  const result = validatePackageDir(invalid("with-dob"), {
    expectValid: false,
    requireFiction: false,
  })
  assert.equal(result.ok, false)
  assert.match(result.reason, /date_of_birth|additional/i)
})

test("rejects contact field", () => {
  const result = validatePackageDir(invalid("with-contact"), {
    expectValid: false,
    requireFiction: false,
  })
  assert.equal(result.ok, false)
  assert.match(result.reason, /email|additional|privacy/i)
})

test("rejects minor with photo", () => {
  const result = validatePackageDir(invalid("minor-with-photo"), {
    expectValid: false,
    requireFiction: false,
  })
  assert.equal(result.ok, false)
  assert.match(result.reason, /minors default to no photo/i)
})

test("rejects broken references", () => {
  const result = validatePackageDir(invalid("broken-ref"), {
    expectValid: false,
    requireFiction: false,
  })
  assert.equal(result.ok, false)
  assert.match(result.reason, /missing reference/)
})

test("rejects shipped package without fiction marker", () => {
  const result = validatePackageDir(invalid("missing-fiction"), {
    expectValid: false,
    requireFiction: true,
  })
  assert.equal(result.ok, false)
  assert.match(result.reason, /fiction=true/)
})

test("harbor players respect minor photo default", () => {
  const registry = JSON.parse(
    readFileSync(
      join(root, "packages", "harbor_fiction", "registry.json"),
      "utf8"
    )
  )
  const minor = registry.players.find((p) => p.id === "casey_young")
  const adult = registry.players.find((p) => p.id === "alex_rivera")
  assert.equal(minor.is_minor, true)
  assert.equal(minor.photo, undefined)
  assert.equal(adult.is_minor, false)
  assert.ok(adult.photo.attribution)
})
