# Offline registry cache

AC-9.4 / AC-9.5. Versioning follows REPOS.md: each teams package carries SemVer plus a content hash the app verifies before install.

## Integrity manifest

Shipped packages under `packages/` include `integrity.json` (schema `schemas/v0/integrity.json`):

- `algorithm`: `sha256` (FIPS 180-4)
- `files[]`: per-path SHA-256 digests of every package file except `integrity.json`
- Text files (`.json`, `.md`, …) are hashed after CRLF to LF normalization so Windows and Linux agree
- `content_hash`: SHA-256 of the canonical UTF-8 blob formed by sorting those paths and concatenating lines `path\0fileSha\n`

Regenerate after package edits:

```bash
npm run integrity
```

## App behavior

1. Download or side-load a package candidate.
2. Verify `integrity.json` against file digests and `content_hash`.
3. On success: promote candidate to the active cache and retain the previous verified copy as last-good.
4. On failure: keep the last-good verified cache; do not install the candidate.
5. Opening an event pins a roster snapshot from the active cache so later registry edits cannot change live production (AC-9.4).

## Sources

- PROJECT_SPEC AC-9.4, AC-9.5
- REPOS.md versioning table (teams packages: SemVer + content hash)
- SemVer 2.0.0: https://semver.org/
- Node.js `crypto.createHash('sha256')` / Dart `package:crypto` SHA-256
