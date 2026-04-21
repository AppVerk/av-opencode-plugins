# AppVerk OpenCode Plugins — Agent Guide

This is an **OpenCode plugin monorepo** that bundles two workspace plugins: a controlled `/commit` workflow and a Python `/develop` workflow. The root package re-exports both and handles plugin merging.

## Monorepo Layout

| Path | Role |
|------|------|
| `src/index.js` + `src/index.d.ts` | **Published root entrypoint** — loads built outputs from both packages and merges their tools/hooks. |
| `packages/commit` | Commit plugin source, tests, build scripts. Output shipped at `packages/commit/dist/`. |
| `packages/python-developer` | Python-developer plugin source, tests, skills, build scripts. Output shipped at `packages/python-developer/dist/`. |
| `.opencode/` | Local OpenCode config for this repo (separate `package.json`). |

**Important:** `dist/` is usually ignored, but `packages/*/dist/` is **committed and published** (see `.gitignore`). Do not delete those `dist/` trees.

## Commands

```bash
# Full validation (run this before pushing)
npm run check          # typecheck + test + build

# Individual steps
npm run typecheck      # tsc --noEmit at root + each workspace
npm run test           # vitest at root + each workspace
npm run build          # tsup ESM + DTS for both packages
```

### Per-package commands

Each workspace package has its own `typecheck`, `test`, and `build` scripts. Tests import from `dist/` (not `src/`), so **build is required before test**:

```bash
npm run build --workspace @appverk/opencode-commit
npm run test  --workspace @appverk/opencode-commit
```

## Build & Packaging Details

- **Module system:** ESM only (`"type": "module"`, NodeNext resolution).
- **Package builds:** `tsup src/index.ts --format esm --dts`.
- **Post-build asset copying:** Each package runs a Node script to copy markdown templates/skills into `dist/` (e.g., `dist/commands/commit.md`, `dist/skills/*.md`).
- **Root entrypoint:** `src/index.js` is the runtime file consumed by tests and published consumers; `src/index.ts` is the typed source. When changing merge logic, update both `src/index.ts` and `src/index.js`, then run `npm run build` so the package-level tests still pass.
- **Published files:** Only `src/index.js`, `src/index.d.ts`, and the two `packages/*/dist/` directories (see root `package.json` `files`).

## TypeScript Configuration

- `tsconfig.base.json` sets `target: ES2022`, `module: NodeNext`, `strict: true`, `noUncheckedIndexedAccess: true`.
- Each package extends the base and includes `src/**/*.ts`, `tests/**/*.ts`, `vitest.config.ts`.
- Vitest uses globals mode (`types: ["vitest/globals"]`).

## Testing Conventions

- **Root tests:** `tests/root-plugin.test.ts` validates plugin merging and packaging via `npm pack --dry-run`.
- **Package tests:** Located in `packages/*/tests/**/*.test.ts`.
- **Integration tests:** `packages/commit/tests/controlled-commit.integration.test.ts` exercises real git operations.
- All three vitest configs use `include: ["tests/**/*.test.ts"]`.

## Adding a New Plugin Package

1. Create `packages/<name>/` with `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, and `tests/`.
2. Add the workspace name to root `package.json` `workspaces` (already `packages/*`).
3. Import and register the new plugin factory in `src/index.ts` and `src/index.js`.
4. Add the new `packages/<name>/dist/` path to root `package.json` `files`.
5. Update root `npm run build` / `npm run test` / `npm run typecheck` scripts to include the new workspace.
6. Add a smoke/packaging test in `tests/` or `packages/<name>/tests/`.

## Common Pitfalls

- Do not run `git commit` or `git push` via the bash tool in this repo — the commit plugin blocks direct commits and pushes at runtime (`tool.execute.before` hook). Use `/commit` instead.
- Changing `src/index.ts` without the corresponding `src/index.js` will break root tests and the published package.
- Removing `packages/*/dist/` will break the root entrypoint and packaging tests.
