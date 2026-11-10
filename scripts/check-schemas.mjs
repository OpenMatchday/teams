import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  SCHEMA_VERSION,
  createAjv,
  loadCatalog,
  loadSchemaFiles,
  rootDir,
  SCHEMA_ORDER,
} from "./lib/load-ajv.mjs"

const versionFile = readFileSync(join(rootDir, "VERSION"), "utf8").trim()
if (versionFile !== SCHEMA_VERSION) {
  throw new Error(`VERSION ${versionFile} != schema const ${SCHEMA_VERSION}`)
}

const pkg = JSON.parse(readFileSync(join(rootDir, "package.json"), "utf8"))
if (pkg.version !== SCHEMA_VERSION) {
  throw new Error(`package.json version ${pkg.version} != ${SCHEMA_VERSION}`)
}

const files = loadSchemaFiles()
for (const { name, schema } of files) {
  if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error(`${name}: expected draft/2020-12 $schema`)
  }
  if (schema.$id !== name) {
    throw new Error(`${name}: $id must equal filename`)
  }
}

const ajv = createAjv()
for (const name of SCHEMA_ORDER) {
  if (name === "common.json") {
    continue
  }
  const validate = ajv.getSchema(name)
  if (!validate) {
    throw new Error(`failed to compile ${name}`)
  }
}

const businessMarkers = ["eval(", "Function(", "import(", "vm.run"]
for (const { name, schema } of files) {
  const text = JSON.stringify(schema)
  for (const marker of businessMarkers) {
    if (text.includes(marker)) {
      throw new Error(`${name}: forbidden executable marker ${marker}`)
    }
  }
}

const catalog = loadCatalog()
if (catalog.schema_version !== SCHEMA_VERSION) {
  throw new Error("catalog schema_version mismatch")
}
if (JSON.stringify(catalog.schemas) !== JSON.stringify(SCHEMA_ORDER)) {
  throw new Error("catalog schemas list mismatch")
}

const requiredKinds = [
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
]
if (JSON.stringify(catalog.taxonomy_kinds) !== JSON.stringify(requiredKinds)) {
  throw new Error("catalog taxonomy_kinds must match AC-9.1")
}

console.log(
  `SCHEMA_CHECK_OK schema_version=${SCHEMA_VERSION} schemas=${files.length}`
)
