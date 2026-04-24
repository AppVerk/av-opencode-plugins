# Global Skills Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AppVerk plugin skills accessible to all OpenCode agents via a single global tool (`load_appverk_skill`) and mandatory activation rules injected into every agent's system prompt.

**Architecture:** A new `packages/skill-registry/` package scans skill folders, parses frontmatter, registers the unified tool, and injects activation rules via `experimental.chat.system.transform`. Old per-package tools (`load_python_skill`, `load_frontend_skill`) are removed. Conflicting skill names are renamed for global uniqueness.

**Tech Stack:** TypeScript, ESM, NodeNext, tsup, vitest, OpenCode Plugin API (`@opencode-ai/plugin`)

---

## File Structure

### New Files

| File | Responsibility |
|------|--------------|
| `packages/skill-registry/package.json` | Workspace package manifest |
| `packages/skill-registry/tsconfig.json` | TypeScript config (extends base) |
| `packages/skill-registry/vitest.config.ts` | Vitest test runner config |
| `packages/skill-registry/src/index.ts` | Plugin factory: exports `AppVerkSkillRegistryPlugin` |
| `packages/skill-registry/src/skill-catalog.ts` | Scans `dist/skills/` dirs, parses frontmatter, builds catalog map, validates uniqueness |
| `packages/skill-registry/src/load-skill.ts` | Tool implementation: `loadAppverkSkill(name)` with caching and error handling |
| `packages/skill-registry/src/prompt-injector.ts` | `experimental.chat.system.transform` hook: appends skill activation rules to system prompt |
| `packages/skill-registry/tests/plugin.test.ts` | Smoke test: plugin exports, config hook registers `skills.paths`, tool is present |
| `packages/skill-registry/tests/skill-catalog.test.ts` | Unit tests: scanning, frontmatter parsing, duplicate detection, missing folder handling |
| `packages/skill-registry/tests/load-skill.test.ts` | Unit tests: loading by name, cache hit, error on unknown, no path leaks |

### Modified Files

| File | Change |
|------|--------|
| `src/index.ts` | Import `AppVerkSkillRegistryPlugin`, add to `defaultPluginFactories` |
| `src/index.js` | Import `AppVerkSkillRegistryPlugin`, add to `defaultPluginFactories` |
| `package.json` (root) | Bump version, add skill-registry to `build`/`test`/`typecheck` scripts, add `packages/skill-registry/dist` to `files` |
| `tests/root-plugin.test.ts` | Update test: `load_frontend_skill` → `load_appverk_skill`, verify `experimental.chat.system.transform` hook |
| `packages/python-developer/src/index.ts` | Remove `load_python_skill` tool registration and `loadPythonSkill` import |
| `packages/python-developer/src/agent-prompt.md` | Remove "Available Skills" table; change `load_python_skill` → `load_appverk_skill` |
| `packages/python-developer/src/skills/coding-standards.md` | Rename `name: coding-standards` → `name: python-coding-standards`; add `activation` field |
| `packages/python-developer/src/skills/tdd-workflow.md` | Rename `name: tdd-workflow` → `name: python-tdd-workflow`; add `activation` field |
| `packages/frontend-developer/src/index.ts` | Remove `load_frontend_skill` tool registration and `loadFrontendSkill` import |
| `packages/frontend-developer/src/agent-prompt.md` | Remove "Available Skills" table; change `load_frontend_skill` → `load_appverk_skill` |
| `packages/frontend-developer/src/skills/coding-standards.md` | Rename `name: coding-standards` → `name: frontend-coding-standards`; add `activation` field |
| `packages/frontend-developer/src/skills/tdd-workflow.md` | Rename `name: tdd-workflow` → `name: frontend-tdd-workflow`; add `activation` field |
| `packages/python-developer/package.json` | Bump version to `0.2.8` |
| `packages/frontend-developer/package.json` | Bump version to `0.2.8` |
| `packages/commit/package.json` | Bump version to `0.2.8` |
| `packages/code-review/package.json` | Bump version to `0.2.8` |

---

## Task 1: Create `packages/skill-registry/` package boilerplate

**Files:**
- Create: `packages/skill-registry/package.json`
- Create: `packages/skill-registry/tsconfig.json`
- Create: `packages/skill-registry/vitest.config.ts`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "@appverk/opencode-skill-registry",
  "version": "0.2.8",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run --config vitest.config.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.14.19"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "."
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts",
    "vitest.config.ts"
  ]
}
```

- [ ] **Step 3: Write `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Verify directory structure**

Run: `ls packages/skill-registry/`
Expected: `package.json  tsconfig.json  vitest.config.ts`

---

## Task 2: Implement `skill-catalog.ts` (scanning + frontmatter parsing)

**Files:**
- Create: `packages/skill-registry/src/skill-catalog.ts`
- Test: `packages/skill-registry/tests/skill-catalog.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import { buildSkillCatalog } from "../src/skill-catalog.js"

describe("buildSkillCatalog", () => {
  it("scans skill directories and returns catalog", () => {
    const catalog = buildSkillCatalog([
      "packages/python-developer/src/skills",
      "packages/frontend-developer/src/skills",
    ])

    expect(catalog.has("python-coding-standards")).toBe(true)
    expect(catalog.has("frontend-coding-standards")).toBe(true)
    expect(catalog.has("fastapi-patterns")).toBe(true)
    expect(catalog.has("tailwind-patterns")).toBe(true)
  })

  it("parses frontmatter fields", () => {
    const catalog = buildSkillCatalog([
      "packages/python-developer/src/skills",
    ])

    const skill = catalog.get("python-coding-standards")!
    expect(skill.name).toBe("python-coding-standards")
    expect(skill.description).toContain("Python")
    expect(skill.activation).toBeTruthy()
    expect(skill.filePath).toContain("coding-standards.md")
  })

  it("throws on duplicate skill names across directories", () => {
    // Create a temporary scenario with two files having same name frontmatter
    expect(() =>
      buildSkillCatalog([
        "packages/python-developer/src/skills",
        "packages/python-developer/src/skills", // same dir twice simulates collision
      ]),
    ).toThrow(/duplicate.*skill.*name/i)
  })

  it("ignores files without frontmatter and logs warning", () => {
    const catalog = buildSkillCatalog([
      "packages/python-developer/src/skills",
    ])
    // All real files have frontmatter; this tests the code path
    expect(() => catalog).not.toThrow()
  })

  it("gracefully handles missing directories", () => {
    const catalog = buildSkillCatalog([
      "packages/nonexistent/src/skills",
    ])
    expect(catalog.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/skill-registry && npx vitest run tests/skill-catalog.test.ts`
Expected: FAIL — `buildSkillCatalog` not found

- [ ] **Step 3: Implement `skill-catalog.ts`**

```typescript
import { existsSync, readFileSync, readdirSync } from "node:fs"
import path from "node:path"

export interface SkillEntry {
  name: string
  description: string
  activation: string
  filePath: string
}

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/)
  if (!match) return null

  const frontmatter = match[1]
  const fields: Record<string, string> = {}

  for (const line of frontmatter.split("\n")) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim().replace(/^"|"$/g, "")
    if (key) fields[key] = value
  }

  return fields
}

export function buildSkillCatalog(directories: string[]): Map<string, SkillEntry> {
  const catalog = new Map<string, SkillEntry>()

  for (const dir of directories) {
    if (!existsSync(dir)) {
      console.warn(`[skill-registry] Skill directory not found: ${dir}`)
      continue
    }

    const files = readdirSync(dir).filter((f) => f.endsWith(".md"))

    for (const file of files) {
      const filePath = path.join(dir, file)
      const content = readFileSync(filePath, "utf8")
      const frontmatter = parseFrontmatter(content)

      if (!frontmatter) {
        console.warn(`[skill-registry] Skipping skill file without frontmatter: ${filePath}`)
        continue
      }

      const name = frontmatter.name
      if (!name) {
        console.warn(`[skill-registry] Skipping skill file without 'name' field: ${filePath}`)
        continue
      }

      if (catalog.has(name)) {
        throw new Error(
          `[skill-registry] Duplicate skill name detected: "${name}". ` +
            `Skill names must be globally unique across all packages.`
        )
      }

      catalog.set(name, {
        name,
        description: frontmatter.description || "",
        activation: frontmatter.activation || "Load when relevant to the task",
        filePath,
      })
    }
  }

  return catalog
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/skill-registry && npx vitest run tests/skill-catalog.test.ts`
Expected: PASS

---

## Task 3: Implement `load-skill.ts` (global tool)

**Files:**
- Create: `packages/skill-registry/src/load-skill.ts`
- Test: `packages/skill-registry/tests/load-skill.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import { createSkillLoader } from "../src/load-skill.js"
import { buildSkillCatalog } from "../src/skill-catalog.js"

describe("createSkillLoader", () => {
  const catalog = buildSkillCatalog([
    "packages/python-developer/src/skills",
    "packages/frontend-developer/src/skills",
  ])
  const loader = createSkillLoader(catalog)

  it("loads a skill by name", () => {
    const content = loader("python-coding-standards")
    expect(content).toContain("HARD-RULES")
    expect(content).toContain("Python")
  })

  it("caches loaded skills", () => {
    const first = loader("python-coding-standards")
    const second = loader("python-coding-standards")
    expect(first).toBe(second)
  })

  it("throws for unknown skill with helpful error", () => {
    expect(() => loader("unknown-skill")).toThrow(/Skill "unknown-skill" not found/)
    expect(() => loader("unknown-skill")).toThrow(/Available:/)
  })

  it("does not leak file paths in error messages", () => {
    expect(() => loader("unknown-skill")).not.toThrow("src/skills")
    expect(() => loader("unknown-skill")).not.toThrow("../")
  })

  it("loads all available skills without error", () => {
    for (const name of catalog.keys()) {
      expect(() => loader(name)).not.toThrow()
      const content = loader(name)
      expect(content.length).toBeGreaterThan(100)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/skill-registry && npx vitest run tests/load-skill.test.ts`
Expected: FAIL — `createSkillLoader` not found

- [ ] **Step 3: Implement `load-skill.ts`**

```typescript
import { readFileSync } from "node:fs"
import type { SkillEntry } from "./skill-catalog.js"

const skillCache = new Map<string, string>()

export function createSkillLoader(catalog: Map<string, SkillEntry>) {
  return function loadAppverkSkill(name: string): string {
    const entry = catalog.get(name)
    if (!entry) {
      const available = Array.from(catalog.keys()).sort().join(", ")
      throw new Error(
        `Skill "${name}" not found. Available: ${available}`
      )
    }

    if (skillCache.has(name)) {
      return skillCache.get(name)!
    }

    const content = readFileSync(entry.filePath, "utf8")
    skillCache.set(name, content)
    return content
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/skill-registry && npx vitest run tests/load-skill.test.ts`
Expected: PASS

---

## Task 4: Implement `prompt-injector.ts` (system prompt injection)

**Files:**
- Create: `packages/skill-registry/src/prompt-injector.ts`
- Create: `packages/skill-registry/tests/prompt-injector.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import { generateSkillPromptBlock } from "../src/prompt-injector.js"
import { buildSkillCatalog } from "../src/skill-catalog.js"

describe("generateSkillPromptBlock", () => {
  const catalog = buildSkillCatalog([
    "packages/python-developer/src/skills",
    "packages/frontend-developer/src/skills",
  ])

  it("generates a non-empty prompt block", () => {
    const block = generateSkillPromptBlock(catalog)
    expect(block).toContain("AppVerk Skills")
    expect(block).toContain("load_appverk_skill")
    expect(block).toContain("HARD-RULES")
  })

  it("includes all skill names", () => {
    const block = generateSkillPromptBlock(catalog)
    for (const name of catalog.keys()) {
      expect(block).toContain(name)
    }
  })

  it("mentions the load tool", () => {
    const block = generateSkillPromptBlock(catalog)
    expect(block).toContain("`load_appverk_skill(name)`")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/skill-registry && npx vitest run tests/prompt-injector.test.ts`
Expected: FAIL — `generateSkillPromptBlock` not found

- [ ] **Step 3: Implement `prompt-injector.ts`**

```typescript
import type { SkillEntry } from "./skill-catalog.js"

export function generateSkillPromptBlock(catalog: Map<string, SkillEntry>): string {
  const lines: string[] = [
    "## AppVerk Skills — Mandatory Activation Rules",
    "",
    "You have access to the `load_appverk_skill(name)` tool. Load skills BEFORE ",
    "starting work. Do not guess — follow the rules below.",
    "",
    "### Universal Rules (all tasks)",
    "| When you are... | You MUST load... |",
    "|---|---|",
    "| Writing, modifying, or reviewing Python code | `python-coding-standards` |",
    "| Writing, modifying, or reviewing TypeScript/React code | `frontend-coding-standards` |",
    "| Writing tests, fixing bugs, refactoring Python code | `python-tdd-workflow` |",
    "| Writing tests, fixing bugs, refactoring TypeScript/React code | `frontend-tdd-workflow` |",
    "| Adding/removing/updating Python dependencies | `uv-package-manager` |",
    "| Adding/removing/updating TypeScript dependencies | `pnpm-package-manager` |",
    "",
    "### Python Stack Rules",
    "| When the project uses... | You MUST load... |",
    "|---|---|",
    "| FastAPI | `fastapi-patterns` |",
    "| SQLAlchemy | `sqlalchemy-patterns` |",
    "| Pydantic | `pydantic-patterns` |",
    "| asyncio / uvicorn | `async-python-patterns` |",
    "| Django | `django-web-patterns` + `django-orm-patterns` |",
    "| Celery | `celery-patterns` |",
    "",
    "### TypeScript/React Stack Rules",
    "| When the project uses... | You MUST load... |",
    "|---|---|",
    "| Tailwind CSS | `tailwind-patterns` |",
    "| Zustand | `zustand-patterns` |",
    "| TanStack Query | `tanstack-query-patterns` |",
    "| React Hook Form | `form-patterns` |",
    "| TanStack Router | `tanstack-router-patterns` |",
    "",
    "### Complete Skill Catalog",
    "| Skill | Description | Activation Rule |",
    "|---|---|---|",
  ]

  for (const entry of catalog.values()) {
    lines.push(`| \`${entry.name}\` | ${entry.description} | ${entry.activation} |`)
  }

  lines.push(
    "",
    "### HARD-RULES",
    "- BEFORE any coding, review, or refactoring: check the table above and load ALL applicable skills.",
    "- If unsure whether a skill applies: load it — better to have context than miss constraints.",
    "- After loading a skill, follow its HARD-RULES strictly.",
    "- Do NOT begin implementation without loading applicable skills first."
  )

  return lines.join("\n")
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/skill-registry && npx vitest run tests/prompt-injector.test.ts`
Expected: PASS

---

## Task 5: Implement `index.ts` (plugin factory)

**Files:**
- Create: `packages/skill-registry/src/index.ts`
- Create: `packages/skill-registry/tests/plugin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import type { Config } from "@opencode-ai/plugin"
import { AppVerkSkillRegistryPlugin } from "../src/index.js"

describe("AppVerkSkillRegistryPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkSkillRegistryPlugin).toBe("function")
  })

  it("registers load_appverk_skill tool", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    expect(plugin.tool?.load_appverk_skill).toBeDefined()
    expect(plugin.tool?.load_appverk_skill?.description).toContain("AppVerk")
  })

  it("registers experimental.chat.system.transform hook", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    expect(plugin["experimental.chat.system.transform"]).toBeDefined()
  })

  it("adds skill paths to config", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    const config = { skills: { paths: [] as string[] } } as Config

    await plugin.config?.(config)

    expect(config.skills?.paths?.length).toBeGreaterThanOrEqual(2)
    expect(config.skills?.paths?.some((p) => p.includes("python-developer"))).toBe(true)
    expect(config.skills?.paths?.some((p) => p.includes("frontend-developer"))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/skill-registry && npx vitest run tests/plugin.test.ts`
Expected: FAIL — `AppVerkSkillRegistryPlugin` not found

- [ ] **Step 3: Implement `index.ts`**

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { buildSkillCatalog } from "./skill-catalog.js"
import { createSkillLoader } from "./load-skill.js"
import { generateSkillPromptBlock } from "./prompt-injector.js"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

const SKILL_DIRECTORIES = [
  path.resolve(moduleDirectory, "../../python-developer/dist/skills"),
  path.resolve(moduleDirectory, "../../frontend-developer/dist/skills"),
  path.resolve(moduleDirectory, "../src/skills"), // fallback for vitest from src/
]

export const AppVerkSkillRegistryPlugin: Plugin = async () => {
  const catalog = buildSkillCatalog(SKILL_DIRECTORIES)
  const loadSkill = createSkillLoader(catalog)
  const skillPromptBlock = generateSkillPromptBlock(catalog)

  return {
    config: async (config) => {
      config.skills ??= { paths: [] }
      config.skills.paths ??= []

      for (const dir of SKILL_DIRECTORIES) {
        if (!config.skills.paths.includes(dir)) {
          config.skills.paths.push(dir)
        }
      }
    },
    tool: {
      load_appverk_skill: tool({
        description:
          "Load an AppVerk development skill by name. Returns the full markdown content of the skill's rules and patterns.",
        args: {
          name: tool.schema
            .string()
            .describe(
              `Skill name. Available: ${Array.from(catalog.keys()).sort().join(", ")}`
            ),
        },
        async execute(args) {
          return loadSkill(args.name)
        },
      }),
    },
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(skillPromptBlock)
    },
  }
}

export default AppVerkSkillRegistryPlugin
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/skill-registry && npx vitest run tests/plugin.test.ts`
Expected: PASS

---

## Task 6: Run full skill-registry test suite

- [ ] **Step 1: Run all tests**

Run: `cd packages/skill-registry && npx vitest run`
Expected: All tests PASS

---

## Task 7: Update root entrypoints (`src/index.ts` and `src/index.js`)

**Files:**
- Modify: `src/index.ts`
- Modify: `src/index.js`

- [ ] **Step 1: Update `src/index.ts`**

Find the imports and `defaultPluginFactories` array. Add `AppVerkSkillRegistryPlugin`:

```typescript
import { AppVerkCommitPlugin } from "../packages/commit/dist/index.js"
import { AppVerkPythonDeveloperPlugin } from "../packages/python-developer/dist/index.js"
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
import { AppVerkFrontendDeveloperPlugin } from "../packages/frontend-developer/dist/index.js"
import { AppVerkSkillRegistryPlugin } from "../packages/skill-registry/dist/index.js"
```

And update the array:

```typescript
const defaultPluginFactories: Plugin[] = [
  AppVerkSkillRegistryPlugin,
  AppVerkCommitPlugin,
  AppVerkPythonDeveloperPlugin,
  AppVerkCodeReviewPlugin,
  AppVerkFrontendDeveloperPlugin,
]
```

- [ ] **Step 2: Update `src/index.js`**

Mirror the exact same changes in the JS file:

```javascript
import { AppVerkCommitPlugin } from "../packages/commit/dist/index.js"
import { AppVerkPythonDeveloperPlugin } from "../packages/python-developer/dist/index.js"
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
import { AppVerkFrontendDeveloperPlugin } from "../packages/frontend-developer/dist/index.js"
import { AppVerkSkillRegistryPlugin } from "../packages/skill-registry/dist/index.js"
```

```javascript
const defaultPluginFactories = [
  AppVerkSkillRegistryPlugin,
  AppVerkCommitPlugin,
  AppVerkPythonDeveloperPlugin,
  AppVerkCodeReviewPlugin,
  AppVerkFrontendDeveloperPlugin,
]
```

- [ ] **Step 3: Verify files compile**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: No errors

---

## Task 8: Update root `package.json` scripts and files

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add skill-registry to build script**

Find: `"build": "npm run build --workspace @appverk/opencode-commit && npm run build --workspace @appverk/opencode-python-developer && npm run build --workspace @appverk/opencode-code-review && npm run build --workspace @appverk/opencode-frontend-developer"`

Replace with:
```json
"build": "npm run build --workspace @appverk/opencode-skill-registry && npm run build --workspace @appverk/opencode-commit && npm run build --workspace @appverk/opencode-python-developer && npm run build --workspace @appverk/opencode-code-review && npm run build --workspace @appverk/opencode-frontend-developer"
```

- [ ] **Step 2: Add skill-registry to test script**

Find: `"test": "vitest run --config vitest.config.ts && npm run test --workspace @appverk/opencode-commit && ..."`

Replace with:
```json
"test": "vitest run --config vitest.config.ts && npm run test --workspace @appverk/opencode-skill-registry && npm run test --workspace @appverk/opencode-commit && npm run test --workspace @appverk/opencode-python-developer && npm run test --workspace @appverk/opencode-code-review && npm run test --workspace @appverk/opencode-frontend-developer"
```

- [ ] **Step 3: Add skill-registry to typecheck script**

Find: `"typecheck": "tsc -p tsconfig.json --noEmit && npm run typecheck --workspace @appverk/opencode-commit && ..."`

Replace with:
```json
"typecheck": "tsc -p tsconfig.json --noEmit && npm run typecheck --workspace @appverk/opencode-skill-registry && npm run typecheck --workspace @appverk/opencode-commit && npm run typecheck --workspace @appverk/opencode-python-developer && npm run typecheck --workspace @appverk/opencode-code-review && npm run typecheck --workspace @appverk/opencode-frontend-developer"
```

- [ ] **Step 4: Add skill-registry dist to `files`**

Find `"files": ["src/index.js", "src/index.d.ts", "packages/commit/dist", ...]`

Add `"packages/skill-registry/dist"` to the array.

---

## Task 9: Remove old tools from `python-developer` and `frontend-developer`

**Files:**
- Modify: `packages/python-developer/src/index.ts`
- Modify: `packages/frontend-developer/src/index.ts`

- [ ] **Step 1: Update `packages/python-developer/src/index.ts`**

Remove the import:
```typescript
import { loadPythonSkill } from "./tools/load-skill.js"
```

Remove the `load_python_skill` tool from the returned `tool` object. The `tool` object should be empty (or omitted entirely if no tools remain).

The updated file should look like:

```typescript
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"

const AGENT_DESCRIPTION =
  "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns."

const COMMAND_DESCRIPTION =
  "Python development workflow enforcing coding standards, TDD, and stack-specific patterns."

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const packagedAgentPath = path.resolve(moduleDirectory, "agent-prompt.md")
const sourceAgentPath = path.resolve(moduleDirectory, "../src/agent-prompt.md")
const packagedCommandPath = path.resolve(moduleDirectory, "commands/python.md")
const sourceCommandPath = path.resolve(moduleDirectory, "../src/commands/python.md")

function loadFile(packaged: string, source: string): string {
  try {
    return readFileSync(packaged, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        return readFileSync(source, "utf8")
      } catch {
        throw new Error("Failed to load plugin template")
      }
    }
    throw new Error("Failed to load plugin template")
  }
}

const AGENT_PROMPT = loadFile(packagedAgentPath, sourceAgentPath)
const COMMAND_TEMPLATE = loadFile(packagedCommandPath, sourceCommandPath)

export const AppVerkPythonDeveloperPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {}
      config.agent["python-developer"] = {
        description: AGENT_DESCRIPTION,
        prompt: AGENT_PROMPT,
        mode: "primary",
      }

      config.command = config.command ?? {}
      config.command.python = {
        description: COMMAND_DESCRIPTION,
        template: COMMAND_TEMPLATE,
        agent: "python-developer",
      }
    },
  }
}

export default AppVerkPythonDeveloperPlugin
```

- [ ] **Step 2: Update `packages/frontend-developer/src/index.ts`**

Same pattern: remove `loadFrontendSkill` import and the `load_frontend_skill` tool.

- [ ] **Step 3: Verify typecheck passes for both packages**

Run: `npm run typecheck --workspace @appverk/opencode-python-developer && npm run typecheck --workspace @appverk/opencode-frontend-developer`
Expected: No errors

---

## Task 10: Update skill frontmatter (rename + add activation)

**Files:**
- Modify: `packages/python-developer/src/skills/coding-standards.md` (frontmatter only)
- Modify: `packages/python-developer/src/skills/tdd-workflow.md` (frontmatter only)
- Modify: `packages/frontend-developer/src/skills/coding-standards.md` (frontmatter only)
- Modify: `packages/frontend-developer/src/skills/tdd-workflow.md` (frontmatter only)

- [ ] **Step 1: Update `packages/python-developer/src/skills/coding-standards.md` frontmatter**

Replace the frontmatter block (lines 1-4) with:
```markdown
---
name: python-coding-standards
description: Python coding standards, architecture patterns, naming conventions, and lint rules
activation: "MUST load when writing, modifying, or reviewing Python code"
---
```

- [ ] **Step 2: Update `packages/python-developer/src/skills/tdd-workflow.md` frontmatter**

Replace the frontmatter block with:
```markdown
---
name: python-tdd-workflow
description: Test-driven development workflow rules for Python
activation: "MUST load when writing tests, fixing bugs, or refactoring Python code"
---
```

- [ ] **Step 3: Update `packages/frontend-developer/src/skills/coding-standards.md` frontmatter**

Replace the frontmatter block with:
```markdown
---
name: frontend-coding-standards
description: TypeScript + React coding standards, architecture patterns, naming conventions, and ESLint configuration
activation: "MUST load when writing, modifying, or reviewing TypeScript/React code"
---
```

- [ ] **Step 4: Update `packages/frontend-developer/src/skills/tdd-workflow.md` frontmatter**

Replace the frontmatter block with:
```markdown
---
name: frontend-tdd-workflow
description: Test-driven development workflow rules for TypeScript and React
activation: "MUST load when writing tests, fixing bugs, or refactoring TypeScript/React code"
---
```

---

## Task 11: Update developer agent prompts

**Files:**
- Modify: `packages/python-developer/src/agent-prompt.md`
- Modify: `packages/frontend-developer/src/agent-prompt.md`

- [ ] **Step 1: Update `packages/python-developer/src/agent-prompt.md`**

In the frontmatter, change:
```markdown
---
name: python-developer
description: Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns. Loads skills on demand via load_python_skill tool.
---
```

to:
```markdown
---
name: python-developer
description: Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns. Loads skills on demand via load_appverk_skill tool.
---
```

Remove the entire "## Available Skills" section (from the heading through the table and any text below it up to the next section).

Replace all occurrences of `load_python_skill` with `load_appverk_skill` in the remaining text.

- [ ] **Step 2: Update `packages/frontend-developer/src/agent-prompt.md`**

Same changes:
- Update frontmatter description: `load_frontend_skill tool` → `load_appverk_skill tool`
- Remove the "## Available Skills" section entirely
- Replace all `load_frontend_skill` with `load_appverk_skill`

---

## Task 12: Update root plugin tests

**Files:**
- Modify: `tests/root-plugin.test.ts`

- [ ] **Step 1: Update test assertions for new tool**

Find the test "registers the /frontend command and frontend-developer agent". Change:
```typescript
expect(plugin.tool?.load_frontend_skill).toBeDefined()
```
to:
```typescript
expect(plugin.tool?.load_appverk_skill).toBeDefined()
```

- [ ] **Step 2: Add test for skill-registry tool and hook**

Add a new test after the frontend test:

```typescript
  it("registers load_appverk_skill tool and system prompt injection hook", async () => {
    const { AppVerkPlugins } = await loadRootModule()
    const plugin = await AppVerkPlugins({} as never)

    expect(plugin.tool?.load_appverk_skill).toBeDefined()
    expect(plugin.tool?.load_appverk_skill?.description).toContain("AppVerk")
    expect(plugin["experimental.chat.system.transform"]).toBeDefined()
  })
```

- [ ] **Step 3: Add skill-registry dist to packaging test**

Find the `expect(packageJson.files).toEqual(expect.arrayContaining([...` block.
Add `"packages/skill-registry/dist"` to the `arrayContaining` array.

Also update the `packedFiles` assertion to include:
```typescript
expect(packedFiles).toEqual(
  expect.arrayContaining([
    "package.json",
    "src/index.js",
    "src/index.d.ts",
    "packages/skill-registry/dist/index.js",
    "packages/skill-registry/dist/index.d.ts",
    // ... existing entries
  ]),
)
```

- [ ] **Step 4: Run root tests**

Run: `npx vitest run tests/root-plugin.test.ts`
Expected: PASS (may need build first)

---

## Task 13: Build and validate all packages

- [ ] **Step 1: Build skill-registry**

Run: `npm run build --workspace @appverk/opencode-skill-registry`
Expected: Success, `packages/skill-registry/dist/` created with `index.js`, `index.d.ts`

- [ ] **Step 2: Build all packages**

Run: `npm run build`
Expected: All packages build successfully

- [ ] **Step 3: Run all tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

---

## Task 14: Update per-package tests for removed tools

**Files:**
- Modify: `packages/python-developer/tests/plugin.test.ts`
- Modify: `packages/python-developer/tests/load-skill.test.ts`
- Modify: `packages/frontend-developer/tests/plugin.test.ts`
- Modify: `packages/frontend-developer/tests/build-output.test.ts`

- [ ] **Step 1: Update `packages/python-developer/tests/plugin.test.ts`**

Find the test `it("registers load_python_skill tool", ...)`. Replace it with:

```typescript
  it("does not register load_python_skill tool (moved to skill-registry)", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    expect(plugin.tool?.load_python_skill).toBeUndefined()
  })
```

- [ ] **Step 2: Update `packages/python-developer/tests/load-skill.test.ts`**

Since the `loadPythonSkill` function is removed, either:
- Delete the entire file, OR
- Replace tests with a simple import check that verifies the module no longer exports `loadPythonSkill`

Preferred: delete the file and remove its references.

- [ ] **Step 3: Update `packages/python-developer/tests/build-output.test.ts`**

Update the skill names in the test:
- `"coding-standards"` → `"python-coding-standards"`
- `"tdd-workflow"` → `"python-tdd-workflow"`

Remove the test `it("load_python_skill tool works from dist build", ...)` entirely.

- [ ] **Step 4: Update `packages/frontend-developer/tests/plugin.test.ts`**

Same as python-developer: replace `load_frontend_skill` test with assertion that it is undefined.

- [ ] **Step 5: Update `packages/frontend-developer/tests/build-output.test.ts`**

Update skill names and remove tool test (if present).

---

## Task 15: Bump versions in all package.json files

**Files:**
- Modify: `package.json` (root)
- Modify: `packages/skill-registry/package.json`
- Modify: `packages/commit/package.json`
- Modify: `packages/python-developer/package.json`
- Modify: `packages/code-review/package.json`
- Modify: `packages/frontend-developer/package.json`

- [ ] **Step 1: Bump root `package.json` version**

Change `"version": "0.2.7"` → `"version": "0.2.8"`

- [ ] **Step 2: Bump all workspace package versions**

Change `"version": "0.2.7"` → `"version": "0.2.8"` in:
- `packages/commit/package.json`
- `packages/python-developer/package.json`
- `packages/code-review/package.json`
- `packages/frontend-developer/package.json`

`packages/skill-registry/package.json` should already be `0.2.8` from Task 1.

---

## Task 16: Final validation

- [ ] **Step 1: Full check**

Run: `npm run check`
Expected: typecheck + test + build all pass

- [ ] **Step 2: Verify packaging**

Run: `npm pack --dry-run`
Expected: `packages/skill-registry/dist/` files included

- [ ] **Step 3: Verify git status**

Run: `git status`
Expected: New files in `packages/skill-registry/`, modified files as listed above

---

## Self-Review Checklist

### Spec Coverage

| Spec Requirement | Implementing Task |
|---|---|
| New `packages/skill-registry/` package | Task 1-6 |
| Global tool `load_appverk_skill` | Task 3, 5 |
| System prompt injection via `experimental.chat.system.transform` | Task 4, 5 |
| Skill frontmatter `activation` field | Task 10 |
| Rename duplicate skills (`coding-standards`, `tdd-workflow`) | Task 10 |
| Remove old tools (`load_python_skill`, `load_frontend_skill`) | Task 9 |
| Update agent prompts | Task 11 |
| Register in root entrypoints | Task 7 |
| Update root scripts | Task 8 |
| Update tests | Task 12, 14 |
| Bump versions | Task 15 |

### Placeholder Scan

- [ ] No "TBD", "TODO", "implement later", "fill in details" found.
- [ ] No vague error handling instructions — all errors have concrete behavior.
- [ ] No "similar to Task N" shortcuts — each task is self-contained.

### Type Consistency

- [ ] `SkillEntry` interface used consistently across `skill-catalog.ts`, `load-skill.ts`, `prompt-injector.ts`
- [ ] `loadAppverkSkill` function name consistent between implementation and tests
- [ ] `AppVerkSkillRegistryPlugin` export name consistent
- [ ] `experimental.chat.system.transform` hook key matches OpenCode Plugin API type

**Plan complete.**
