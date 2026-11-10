import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"
import { loadCatalog } from "./load-ajv.mjs"

const toPosix = (p) => p.split(sep).join("/")

const EXEC_EXT = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".sh",
  ".bat",
  ".ps1",
  ".exe",
  ".dll",
  ".so",
  ".wasm",
])

export const readJson = (path) => JSON.parse(readFileSync(path, "utf8"))

export const walkFiles = (dir, out = []) => {
  if (!existsSync(dir)) {
    return out
  }
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      walkFiles(p, out)
      continue
    }
    out.push(p)
  }
  return out
}

export const assertLayout = (packageDir) => {
  const catalog = loadCatalog()
  const errors = []
  for (const rel of catalog.required_layout) {
    const path = join(packageDir, rel)
    if (rel.endsWith("/")) {
      if (!existsSync(path) || !statSync(path).isDirectory()) {
        errors.push(`missing directory ${rel}`)
      }
      continue
    }
    if (!existsSync(path)) {
      errors.push(`missing file ${rel}`)
    }
  }
  return errors
}

export const findExecutableFiles = (packageDir) => {
  const files = walkFiles(packageDir)
  return files.filter((f) => {
    const lower = f.toLowerCase()
    for (const ext of EXEC_EXT) {
      if (lower.endsWith(ext)) {
        return true
      }
    }
    return false
  })
}

export const findConsentEvidenceFiles = (packageDir) => {
  const files = walkFiles(packageDir)
  return files.filter((f) => {
    const rel = toPosix(relative(packageDir, f)).toLowerCase()
    if (rel.includes("/consent/") || rel.startsWith("consent/")) {
      return true
    }
    if (rel.includes("consent_evidence")) {
      return true
    }
    if (rel.endsWith(".consent.json") || rel.endsWith(".consent.pdf")) {
      return true
    }
    return false
  })
}

export const collectObjectKeys = (value, keys = new Set()) => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjectKeys(item, keys)
    }
    return keys
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      keys.add(k)
      collectObjectKeys(v, keys)
    }
  }
  return keys
}

export { toPosix }
