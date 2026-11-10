import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { loadCatalog, SCHEMA_ORDER } from "../scripts/lib/load-ajv.mjs"

const root = join(fileURLToPath(new URL("..", import.meta.url)))

test("taxonomy kinds cover AC-9.1", () => {
  const catalog = loadCatalog()
  assert.deepEqual(catalog.taxonomy_kinds, [
    "sport",
    "country",
    "competition",
    "category",
    "club",
    "team",
    "season",
    "squad",
    "player",
    "membership",
  ])
  assert.deepEqual(catalog.schemas, SCHEMA_ORDER)
})

test("npm run check passes", () => {
  const result = spawnSync("npm", ["run", "check"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /SCHEMA_CHECK_OK/)
})
