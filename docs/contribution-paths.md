# Community contribution path allowlist

The community GitHub App (AC-10.6) may write only these paths in this repository:

| Pattern | Purpose |
|---|---|
| `packages/<package_id>/manifest.json` | Package manifest |
| `packages/<package_id>/registry.json` | Registry payload |
| `packages/<package_id>/integrity.json` | Optional integrity file |
| `packages/<package_id>/docs/*` | Package docs (filenames `[A-Za-z0-9._-]`) |
| `packages/<package_id>/photos/<uuid>.(jpg\|jpeg\|png\|webp)` | Re-encoded photos |

`<package_id>` must match `^[a-z][a-z0-9_]*$`.

## Forbidden

- Any path outside `packages/`
- Path traversal (`..`), absolute paths, backslashes
- Direct pushes to `main` / `master`
- Auto-merge

Branches created by the app use `community/contrib-*` only. Maintainers merge PRs manually.

## Sources

- PROJECT_SPEC AC-10.6
- Community implementation: `community/src/github/paths.ts`
- GitHub Apps installation tokens: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app
