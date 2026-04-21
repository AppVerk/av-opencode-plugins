# Code Review Plugin MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create and integrate the `packages/code-review` workspace plugin with `/review` command, `security-auditor` and `code-quality-auditor` agents, and python-developer skill integration.

**Architecture:** A new OpenCode plugin workspace (`packages/code-review/`) that registers one command template (`/review`) and two agent prompts via the `config` hook. The plugin factory loads `.md` templates from disk (source or dist, whichever exists). Root entrypoints import and merge the new plugin alongside existing `commit` and `python-developer` plugins.

**Tech Stack:** TypeScript (ESM, NodeNext), tsup, vitest, OpenCode plugin SDK (`@opencode-ai/plugin`).

**Design spec:** `docs/superpowers/specs/2026-04-21-code-review-design.md`

---

## Task 1: Create Package Boilerplate

Create the workspace package structure with configuration files.

**Files to create:**
- `packages/code-review/package.json`
- `packages/code-review/tsconfig.json`
- `packages/code-review/vitest.config.ts`

- [ ] **Step 1: Write `packages/code-review/package.json`**

```json
{
  "name": "@appverk/opencode-code-review",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts && node scripts/copy-assets.mjs",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.14.19"
  },
  "devDependencies": {
    "typescript": "^5.8.3",
    "tsup": "^8.5.0",
    "vitest": "^3.1.2",
    "@types/node": "^22.15.3"
  }
}
```

- [ ] **Step 2: Write `packages/code-review/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

- [ ] **Step 3: Write `packages/code-review/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Create directories**

Run:
```bash
mkdir -p packages/code-review/src/commands
mkdir -p packages/code-review/src/agents
mkdir -p packages/code-review/tests
mkdir -p packages/code-review/scripts
```

---

## Task 2: Implement Plugin Factory (TDD)

Write the plugin factory with full test coverage.

**Files:**
- Create: `packages/code-review/tests/plugin.test.ts`
- Create: `packages/code-review/src/index.ts`

- [ ] **Step 1: Write failing test**

Write `packages/code-review/tests/plugin.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest"
import { AppVerkCodeReviewPlugin } from "../src/index.js"

describe("AppVerkCodeReviewPlugin", () => {
  let pluginResult: Awaited<ReturnType<typeof AppVerkCodeReviewPlugin>>

  beforeAll(async () => {
    pluginResult = await AppVerkCodeReviewPlugin({
      directory: "/tmp",
      worktree: "/tmp",
    } as any)
  })

  it("exports a plugin factory function", () => {
    expect(typeof AppVerkCodeReviewPlugin).toBe("function")
  })

  it("returns an object with a config function", () => {
    expect(pluginResult.config).toBeDefined()
    expect(typeof pluginResult.config).toBe("function")
  })

  it("config registers the review command", async () => {
    const config: any = { command: {} }
    await pluginResult.config(config)
    expect(config.command.review).toBeDefined()
    expect(config.command.review.description).toBeDefined()
    expect(typeof config.command.review.template).toBe("string")
    expect(config.command.review.template.length).toBeGreaterThan(0)
  })

  it("config registers security-auditor agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config(config)
    expect(config.agent["security-auditor"]).toBeDefined()
    expect(config.agent["security-auditor"].description).toBeDefined()
    expect(typeof config.agent["security-auditor"].prompt).toBe("string")
    expect(config.agent["security-auditor"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers code-quality-auditor agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config(config)
    expect(config.agent["code-quality-auditor"]).toBeDefined()
    expect(config.agent["code-quality-auditor"].description).toBeDefined()
    expect(typeof config.agent["code-quality-auditor"].prompt).toBe("string")
    expect(config.agent["code-quality-auditor"].prompt.length).toBeGreaterThan(0)
  })

  it("does not register any custom tools", async () => {
    const config: any = { command: {}, agent: {} }
    await pluginResult.config(config)
    expect(pluginResult.tool).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd packages/code-review && npx vitest run tests/plugin.test.ts
```

Expected: FAIL with "AppVerkCodeReviewPlugin not exported" or module not found.

- [ ] **Step 3: Write minimal implementation**

Write `packages/code-review/src/index.ts`:

```typescript
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

function loadMarkdownFile(name: string): string {
  const packagedPath = path.resolve(moduleDirectory, name)
  const sourcePath = path.resolve(moduleDirectory, "../src", name)
  const filePath = existsSync(packagedPath) ? packagedPath : sourcePath
  return readFileSync(filePath, "utf8")
}

const SECURITY_AUDITOR_PROMPT = loadMarkdownFile("agents/security-auditor.md")
const CODE_QUALITY_AUDITOR_PROMPT = loadMarkdownFile("agents/code-quality-auditor.md")
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")

const SECURITY_AUDITOR_DESCRIPTION =
  "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance."

const CODE_QUALITY_AUDITOR_DESCRIPTION =
  "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis."

const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."

export const AppVerkCodeReviewPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {}
      config.agent["security-auditor"] = {
        description: SECURITY_AUDITOR_DESCRIPTION,
        prompt: SECURITY_AUDITOR_PROMPT,
      }
      config.agent["code-quality-auditor"] = {
        description: CODE_QUALITY_AUDITOR_DESCRIPTION,
        prompt: CODE_QUALITY_AUDITOR_PROMPT,
      }

      config.command = config.command ?? {}
      config.command.review = {
        description: REVIEW_COMMAND_DESCRIPTION,
        template: REVIEW_COMMAND_TEMPLATE,
      }
    },
  }
}

export default AppVerkCodeReviewPlugin
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd packages/code-review && npx vitest run tests/plugin.test.ts
```

Expected: PASS (but may fail because markdown files don't exist yet — if so, create placeholder files first, then re-run).

If fails because markdown files missing, create minimal placeholder files:
```bash
echo "# Security Auditor" > packages/code-review/src/agents/security-auditor.md
echo "# Code Quality Auditor" > packages/code-review/src/agents/code-quality-auditor.md
echo "# Review Command" > packages/code-review/src/commands/review.md
```

Then re-run test.

Expected: PASS.

---

## Task 3: Create Markdown Templates

Create the command and agent templates by adapting the marketplace originals.

**Files to create:**
- `packages/code-review/src/commands/review.md`
- `packages/code-review/src/agents/security-auditor.md`
- `packages/code-review/src/agents/code-quality-auditor.md`

**Reference files:**
- Marketplace: `av-marketplace/plugins/code-review/commands/review.md`
- Marketplace: `av-marketplace/plugins/code-review/agents/security-auditor.md`
- Marketplace: `av-marketplace/plugins/code-review/agents/code-quality-auditor.md`

- [ ] **Step 1: Create `packages/code-review/src/commands/review.md`**

Read the original: `av-marketplace/plugins/code-review/commands/review.md`

Create the adapted version with these changes:
1. **Frontmatter:** Keep `description`, `argument-hint`. Remove `allowed-tools` (OpenCode handles tools differently). Remove `model: opus`.
2. **Remove all `TaskCreate` / `TaskUpdate` references** — replace with `todowrite` tool calls.
3. **Remove Cross-Verifier and Challenger sections** — these are v2.
4. **Remove Documentation Auditor** — v2.
5. **Replace `subagent_type: "code-review:security-auditor"`** with `task(subagent_type: "general", prompt: "You are security-auditor...")`.
6. **Replace `AskUserQuestion`** with `question` tool.
7. **Replace `AgentOutputTool`** — OpenCode `task` returns output directly, so remove the "collect via AgentOutputTool" step.
8. **Add python-developer stack detection** in Step 1 (inline, as per design spec Section 7.1).
9. **Add `load_python_skill` tool calls** for stack-specific skill loading.
10. Keep the report format, ID assignment algorithm, post-review guidance, and save logic.

The resulting file should be a complete, self-contained markdown template for the `/review` OpenCode command.

- [ ] **Step 2: Create `packages/code-review/src/agents/security-auditor.md`**

Read the original: `av-marketplace/plugins/code-review/agents/security-auditor.md`

Create the adapted version with these changes:
1. **Remove frontmatter `allowed-tools`** — not used in OpenCode agent prompts.
2. **Remove `skills:` frontmatter line** — skills are inline, not registered separately.
3. **Keep core workflow:** Secret Scanning, SAST Analysis, Dependency Scanning, AI Threat Modeling.
4. **Add Django and Celery framework patterns** (per design spec Section 5.1) alongside existing FastAPI/SQLAlchemy/Pydantic.
5. **Adapt skill invocation language:** Replace "Invoke: secret-scanning skill" with inline instructions describing what to check (the skill content becomes part of the prompt).
6. **Keep OWASP Top 10:2025 checklist** and report format.
7. **Keep framework security patterns section** but expand with Django/Celery checks.

- [ ] **Step 3: Create `packages/code-review/src/agents/code-quality-auditor.md`**

Read the original: `av-marketplace/plugins/code-review/agents/code-quality-auditor.md`

Create the adapted version with these changes:
1. **Remove frontmatter `allowed-tools`**.
2. **Remove `skills:` frontmatter line**.
3. **Keep core workflow:** Standards Discovery, Linter Integration, Architecture Analysis, AI Design Review.
4. **Add Django and Celery framework patterns** (per design spec Section 5.2) alongside existing FastAPI/SQLAlchemy/Pydantic.
5. **Adapt skill invocation language** to inline instructions.
6. **Keep SOLID principles reference, Clean Architecture layers, DDD tactical patterns**.
7. **Keep severity classification and report format**.

---

## Task 4: Build Script and Package Build

Create the post-build asset copy script and build the package.

**Files:**
- Create: `packages/code-review/scripts/copy-assets.mjs`

- [ ] **Step 1: Write `packages/code-review/scripts/copy-assets.mjs`**

```javascript
import { cpSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const distDir = path.resolve(projectRoot, "dist")

function copyDir(src, dest) {
  if (!src.includes("src")) return
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
}

// Copy commands and agents markdown files to dist/
copyDir(path.resolve(projectRoot, "src/commands"), path.resolve(distDir, "commands"))
copyDir(path.resolve(projectRoot, "src/agents"), path.resolve(distDir, "agents"))

console.log("Assets copied to dist/")
```

- [ ] **Step 2: Build the package**

Run:
```bash
cd packages/code-review && npm run build
```

Expected: `dist/index.js`, `dist/index.d.ts`, `dist/commands/review.md`, `dist/agents/security-auditor.md`, `dist/agents/code-quality-auditor.md` all exist.

- [ ] **Step 3: Verify dist contents**

Run:
```bash
ls -la packages/code-review/dist/
ls -la packages/code-review/dist/commands/
ls -la packages/code-review/dist/agents/
```

Expected: All expected files present and non-empty.

---

## Task 5: Smoke and Build-Output Tests

Write tests that verify the package can be imported and dist/ contains expected files.

**Files:**
- Create: `packages/code-review/tests/package-smoke.test.ts`
- Create: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Write `packages/code-review/tests/package-smoke.test.ts`**

```typescript
import { describe, it, expect } from "vitest"

describe("@appverk/opencode-code-review package smoke", () => {
  it("can be imported", async () => {
    const pkg = await import("@appverk/opencode-code-review")
    expect(pkg).toBeDefined()
    expect(typeof pkg.AppVerkCodeReviewPlugin).toBe("function")
  })
})
```

- [ ] **Step 2: Write `packages/code-review/tests/build-output.test.ts`**

```typescript
import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, "../dist")

describe("build output", () => {
  it("dist/index.js exists", () => {
    expect(existsSync(path.resolve(distDir, "index.js"))).toBe(true)
  })

  it("dist/index.d.ts exists", () => {
    expect(existsSync(path.resolve(distDir, "index.d.ts"))).toBe(true)
  })

  it("dist/commands/review.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/review.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/security-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/security-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/code-quality-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/code-quality-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 3: Run all package tests**

Run:
```bash
cd packages/code-review && npm run test
```

Expected: All tests PASS.

- [ ] **Step 4: Run typecheck**

Run:
```bash
cd packages/code-review && npm run typecheck
```

Expected: No errors.

---

## Task 6: Root Integration

Update root entrypoints and package.json to include the new plugin.

**Files to modify:**
- `src/index.ts`
- `src/index.js`
- `package.json` (root)

- [ ] **Step 1: Update `src/index.ts`**

Read the current file first. Then add the import and register it in `defaultPluginFactories`:

Add after existing imports:
```typescript
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
```

Change:
```typescript
const defaultPluginFactories: Plugin[] = [AppVerkCommitPlugin, AppVerkPythonDeveloperPlugin]
```

To:
```typescript
const defaultPluginFactories: Plugin[] = [
  AppVerkCommitPlugin,
  AppVerkPythonDeveloperPlugin,
  AppVerkCodeReviewPlugin,
]
```

- [ ] **Step 2: Update `src/index.js`**

Read the current file first. Then add:

After existing imports:
```javascript
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
```

Change:
```javascript
const defaultPluginFactories = [AppVerkCommitPlugin, AppVerkPythonDeveloperPlugin]
```

To:
```javascript
const defaultPluginFactories = [
  AppVerkCommitPlugin,
  AppVerkPythonDeveloperPlugin,
  AppVerkCodeReviewPlugin,
]
```

- [ ] **Step 3: Update root `package.json`**

Read current file. Make three changes:

1. Add to `files` array:
```json
"packages/code-review/dist"
```

2. Update `scripts.build`:
```json
"build": "npm run build --workspace @appverk/opencode-commit && npm run build --workspace @appverk/opencode-python-developer && npm run build --workspace @appverk/opencode-code-review"
```

3. Update `scripts.test`:
```json
"test": "vitest run --config vitest.config.ts && npm run test --workspace @appverk/opencode-commit && npm run test --workspace @appverk/opencode-python-developer && npm run test --workspace @appverk/opencode-code-review"
```

4. Update `scripts.typecheck`:
```json
"typecheck": "tsc -p tsconfig.json --noEmit && npm run typecheck --workspace @appverk/opencode-commit && npm run typecheck --workspace @appverk/opencode-python-developer && npm run typecheck --workspace @appverk/opencode-code-review"
```

---

## Task 7: Full Monorepo Validation

Run the complete validation pipeline to ensure nothing is broken.

- [ ] **Step 1: Run root typecheck**

```bash
npm run typecheck
```

Expected: Passes for root + all three workspaces.

- [ ] **Step 2: Run root tests**

```bash
npm run test
```

Expected: Passes for root + all three workspaces.

- [ ] **Step 3: Run full build**

```bash
npm run build
```

Expected: Builds all three workspaces successfully. `packages/code-review/dist/` contains all expected files.

- [ ] **Step 4: Verify root packaging includes code-review**

Run:
```bash
npm pack --dry-run 2>&1 | grep -E "(code-review|index)"
```

Expected: `src/index.js`, `src/index.d.ts`, and `packages/code-review/dist/...` files appear in the pack list.

- [ ] **Step 5: Commit all changes**

```bash
git add -A
git status
```

Verify all new and modified files are staged, then commit:
```bash
git commit -m "feat(code-review): add code-review plugin MVP with /review command

- New workspace: packages/code-review/
- /review command with stack detection and python-developer integration
- security-auditor and code-quality-auditor agents
- Report generation with issue IDs (SEC-001, ARCH-001, etc.)
- Optional save to docs/reviews/YYYY-MM-DD-<branch>.md
- Root integration: plugin merging, build scripts, packaging"
```

---

## Self-Review Checklist

After completing all tasks, verify:

1. **Spec coverage:**
   - [x] Package structure (Task 1)
   - [x] Plugin factory with config hook (Task 2)
   - [x] `/review` command template (Task 3)
   - [x] security-auditor agent (Task 3)
   - [x] code-quality-auditor agent (Task 3)
   - [x] Report format and ID assignment (in review.md template)
   - [x] Stack detection + python-developer integration (in review.md template)
   - [x] OpenCode adaptations (in all templates: todowrite, question, task tool)
   - [x] Root registration (Task 6)
   - [x] Build pipeline with asset copying (Task 4)
   - [x] Tests: plugin, smoke, build-output (Tasks 2, 5)

2. **No placeholders in plan:** All steps show exact code or exact commands.

3. **Type consistency:** `AppVerkCodeReviewPlugin` exported from both `src/index.ts` and `dist/index.js`. Same signature as other plugins.
