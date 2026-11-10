import { readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { writeIntegrityManifest } from "./lib/content-hash.mjs"
import { rootDir } from "./lib/load-ajv.mjs"

const packagesRoot = join(rootDir, "packages")
const args = process.argv.slice(2)
const targets =
  args.length > 0
    ? args.map((a) => (a.includes("/") || a.includes("\\") ? a : join(packagesRoot, a)))
    : readdirSync(packagesRoot)
        .map((name) => join(packagesRoot, name))
        .filter((p) => statSync(p).isDirectory())

for (const dir of targets) {
  const { path, integrity } = writeIntegrityManifest(dir)
  console.log(
    `INTEGRITY_OK ${integrity.package_id}@${integrity.version} ${integrity.content_hash} -> ${path}`,
  )
}
