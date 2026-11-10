import { existsSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { rootDir } from "./lib/load-ajv.mjs"
import {
  packageIsUnderShipped,
  validatePackageDir,
} from "./lib/validate-package.mjs"

const listPackageDirs = (base) => {
  if (!existsSync(base)) {
    return []
  }
  return readdirSync(base)
    .map((name) => join(base, name))
    .filter((p) => statSync(p).isDirectory())
}

const shipped = listPackageDirs(join(rootDir, "packages"))
const validFixtures = listPackageDirs(
  join(rootDir, "fixtures", "packages", "valid")
)
const invalidFixtures = listPackageDirs(
  join(rootDir, "fixtures", "packages", "invalid")
)

for (const dir of shipped) {
  const result = validatePackageDir(dir, {
    expectValid: true,
    requireFiction: true,
  })
  console.log(`VALID ${result.label} stable_ids=${result.stable_ids}`)
}

for (const dir of validFixtures) {
  const result = validatePackageDir(dir, {
    expectValid: true,
    requireFiction: packageIsUnderShipped(dir),
  })
  console.log(`VALID ${result.label} stable_ids=${result.stable_ids}`)
}

for (const dir of invalidFixtures) {
  const name = dir.split(/[/\\]/).pop()
  const result = validatePackageDir(dir, {
    expectValid: false,
    requireFiction: name === "missing-fiction",
  })
  if (result.ok) {
    throw new Error(`expected invalid package to fail: ${result.label}`)
  }
  console.log(`INVALID_OK ${result.label} :: ${result.reason}`)
}

console.log(
  `VALIDATE_OK shipped=${shipped.length} valid_fixtures=${validFixtures.length} invalid_fixtures=${invalidFixtures.length}`
)
