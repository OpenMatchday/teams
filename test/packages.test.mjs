import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import { validatePackageDir } from "../scripts/lib/validate-package.mjs"

const root = join(fileURLToPath(new URL("..", import.meta.url)))

test("shipped harbor_fiction validates with fiction and stable ids", () => {
  const result = validatePackageDir(join(root, "packages", "harbor_fiction"), {
    expectValid: true,
    requireFiction: true,
  })
  assert.equal(result.ok, true)
  assert.ok(result.stable_ids >= 10)
})

test("npm run validate passes", () => {
  const result = spawnSync("npm", ["run", "validate"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /VALIDATE_OK/)
})
