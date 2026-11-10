import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { readJson, toPosix, walkFiles } from "./package-layout.mjs"

export const HASH_ALGORITHM = "sha256"
export const INTEGRITY_FILE = "integrity.json"

const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex")

const isIntegrityPath = (rel) =>
  rel === INTEGRITY_FILE || rel.endsWith(`/${INTEGRITY_FILE}`)

/** Package-relative paths hashed for integrity (excludes integrity.json). */
export const listHashableRels = (packageDir) => {
  const root = resolve(packageDir)
  const files = walkFiles(root)
  const rels = []
  for (const abs of files) {
    const rel = toPosix(abs.slice(root.length).replace(/^[/\\]/, ""))
    if (!rel || isIntegrityPath(rel)) {
      continue
    }
    rels.push(rel)
  }
  rels.sort()
  return rels
}

export const hashFile = (absPath) => sha256Hex(readFileSync(absPath))

/**
 * Canonical content hash: SHA-256 over sorted lines `path\\0fileSha\\n`
 * (REPOS.md: teams packages use SemVer + content hash; app verifies hash).
 */
export const computePackageIntegrity = (packageDir) => {
  const root = resolve(packageDir)
  const rels = listHashableRels(root)
  const files = []
  const lines = []
  for (const rel of rels) {
    const digest = hashFile(join(root, rel))
    files.push({ path: rel, sha256: digest })
    lines.push(`${rel}\0${digest}\n`)
  }
  const contentHash = sha256Hex(Buffer.from(lines.join(""), "utf8"))
  const manifestPath = join(root, "manifest.json")
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {}
  return {
    schema_version: "0.1.0",
    package_id: manifest.package_id ?? null,
    version: manifest.version ?? null,
    algorithm: HASH_ALGORITHM,
    content_hash: contentHash,
    files,
  }
}

export const verifyPackageIntegrity = (packageDir, expected) => {
  const root = resolve(packageDir)
  const errors = []
  if (!expected || typeof expected !== "object") {
    return { ok: false, errors: ["missing integrity manifest"] }
  }
  if (expected.algorithm !== HASH_ALGORITHM) {
    errors.push(`unsupported algorithm ${expected.algorithm}`)
  }
  const computed = computePackageIntegrity(root)
  if (expected.package_id && expected.package_id !== computed.package_id) {
    errors.push(
      `package_id mismatch: expected ${expected.package_id} got ${computed.package_id}`,
    )
  }
  if (expected.version && expected.version !== computed.version) {
    errors.push(
      `version mismatch: expected ${expected.version} got ${computed.version}`,
    )
  }
  const expectedByPath = new Map(
    (expected.files ?? []).map((f) => [f.path, f.sha256]),
  )
  for (const f of computed.files) {
    const want = expectedByPath.get(f.path)
    if (!want) {
      errors.push(`unexpected file ${f.path}`)
      continue
    }
    if (want !== f.sha256) {
      errors.push(`file hash mismatch ${f.path}`)
    }
    expectedByPath.delete(f.path)
  }
  for (const path of expectedByPath.keys()) {
    errors.push(`missing file ${path}`)
  }
  if (expected.content_hash !== computed.content_hash) {
    errors.push("content_hash mismatch")
  }
  return {
    ok: errors.length === 0,
    errors,
    computed,
  }
}

export const writeIntegrityManifest = (packageDir) => {
  const root = resolve(packageDir)
  const integrity = computePackageIntegrity(root)
  const path = join(root, INTEGRITY_FILE)
  writeFileSync(path, `${JSON.stringify(integrity, null, 2)}\n`, "utf8")
  return { path, integrity }
}

export const loadIntegrityManifest = (packageDir) => {
  const path = join(resolve(packageDir), INTEGRITY_FILE)
  if (!existsSync(path)) {
    return null
  }
  return readJson(path)
}
