import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"
import { test } from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

test("website catalog export builds searchable fiction-only index", () => {
  const result = spawnSync(process.execPath, ["scripts/export-website-catalog.mjs"], {
    cwd: root,
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  const catalog = JSON.parse(readFileSync(join(root, "dist", "website-catalog.v0.json"), "utf8"))
  assert.ok(catalog.packages.some((p) => p.package_id === "harbor_fiction"))
  assert.ok(catalog.entries.some((e) => e.kind === "team"))
  assert.ok(catalog.entries.some((e) => e.kind === "player"))
  for (const entry of catalog.entries) {
    assert.equal(entry.fiction, true)
    assert.ok(entry.search_text.includes(entry.name.toLowerCase().split(" ")[0]))
  }
  assert.ok(!JSON.stringify(catalog).includes("photos/"))
})
