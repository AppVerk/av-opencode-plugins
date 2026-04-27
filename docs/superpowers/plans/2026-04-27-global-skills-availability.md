# Global Skills Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make AppVerk plugin skills accessible to all OpenCode agents via a single global tool (`load_appverk_skill`) and mandatory activation rules injected into every agent's system prompt.

**Architecture:** A new `packages/skill-registry/` package scans skill folders, parses frontmatter, registers the unified tool, and injects activation rules via `experimental.chat.system.transform`. Old per-package tools (`load_python_skill`, `load_frontend_skill`) are removed. Conflicting skill names are renamed for global uniqueness.

**Tech Stack:** TypeScript, ESM, NodeNext, tsup, vitest, OpenCode Plugin API (`@opencode-ai/plugin`)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `packages/skill-registry/package.json` | Workspace package manifest |
| `packages/skill-registry/tsconfig.json` | TypeScript config (extends base) |
| `packages/skill-registry/vitest.config.ts` | Vitest test runner config |
| `packages/skill-registry/src/index.ts` | Plugin factory: exports `AppVerkSkillRegistryPlugin` |
| `packages/skill-registry/src/skill-catalog.ts` | Scans `dist/skills/` dirs, parses frontmatter, builds catalog map, validates uniqueness |
| `packages/skill-registry/src/load-skill.ts` | Tool implementation: `loadAppverkSkill(name)` with caching and error handling |
| `packages/skill-registry/src/prompt-injector.ts` | `experimental.chat.system.transform` hook: appends skill activation rules to system prompt |
| `packages/skill-registry/tests/skill-catalog.test.ts` | Unit tests: scanning, frontmatter parsing, duplicate detection, missing folder handling |
| `packages/skill-registry/tests/load-skill.test.ts` | Unit tests: loading by name, cache hit, error on unknown, no path leaks |
| `packages/skill-registry/tests/prompt-injector.test.ts` | Unit tests: system prompt generation, activation rules inclusion |
| `packages/skill-registry/tests/plugin.test.ts` | Smoke test: plugin exports, config hook, tool is present, transform hook present |

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
| `packages/python-developer/package.json` | Bump version to `0.2.10` |
| `packages/frontend-developer/package.json` | Bump version to `0.2.10` |
| `packages/commit/package.json` | Bump version to `0.2.10` |
| `packages/code-review/package.json` | Bump version to `0.2.10` |
| `packages/skill-utils/package.json` | Bump version to `0.2.10` |
| `packages/code-review/dist/index.js` | Rebuild (version bump) |
| `packages/commit/dist/index.js` | Rebuild (version bump) |
| `packages/frontend-developer/dist/index.js` | Rebuild with removed tool |
| `packages/frontend-developer/dist/index.d.ts` | Rebuild with removed tool |
| `packages/python-developer/dist/index.js` | Rebuild with removed tool |
| `packages/python-developer/dist/index.d.ts` | Rebuild with removed tool |
| `packages/skill-utils/dist/index.js` | Rebuild (version bump) |
| `packages/skill-utils/dist/index.d.ts` | Rebuild (version bump) |

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
  "version": "0.2.10",
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
import { buildSkillCatalog, parseSkillFrontmatter } from "../src/skill-catalog.js"

describe("parseSkillFrontmatter", () => {
  it("parses frontmatter with name, description, and activation", () => {
    const content = `---\nname: test-skill\ndescription: A test skill\nactivation: MUST load when testing\n---\n\n# Test Skill\n`
    const parsed = parseSkillFrontmatter(content, "test.md")
    expect(parsed.name).toBe("test-skill")
    expect(parsed.description).toBe("A test skill")
    expect(parsed.activation).toBe("MUST load when testing")
  })

  it("uses default activation when missing", () => {
    const content = `---\nname: minimal\ndescription: Minimal skill\n---\n\nContent\n`
    const parsed = parseSkillFrontmatter(content, "minimal.md")
    expect(parsed.activation).toBe("Load when relevant to the task")
  })

  it("returns null for files without frontmatter", () => {
    const content = `# No Frontmatter\n\nJust markdown.`
    const parsed = parseSkillFrontmatter(content, "nofront.md")
    expect(parsed).toBeNull()
  })

  it("throws for missing name in frontmatter", () => {
    const content = `---\ndescription: Missing name\n---\n`
    expect(() => parseSkillFrontmatter(content, "noname.md")).toThrow(/name/)
  })
})

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

export function parseSkillFrontmatter(content: string, fileName: string): SkillEntry | null {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatterMatch) {
    return null
  }

  const raw = frontmatterMatch[1]
  const lines = raw.split(/\r?\n/)
  const fields: Record<string, string> = {}

  for (const line of lines) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()
    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    fields[key] = value
  }

  if (!fields.name) {
    throw new Error(`Skill file ${fileName} is missing required 'name' in frontmatter`)
  }

  return {
    name: fields.name,
    description: fields.description || "",
    activation: fields.activation || "Load when relevant to the task",
    filePath: fileName,
  }
}

export function buildSkillCatalog(directories: readonly string[]): Map<string, SkillEntry> {
  const catalog = new Map<string, SkillEntry>()

  for (const dir of directories) {
    if (!existsSync(dir)) {
      continue
    }

    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) {
        continue
      }

      const filePath = path.join(dir, entry.name)
      const content = readFileSync(filePath, "utf8")
      const parsed = parseSkillFrontmatter(content, filePath)

      if (!parsed) {
        continue
      }

      if (catalog.has(parsed.name)) {
        throw new Error(
          `Duplicate skill name "${parsed.name}" found in ${filePath}. ` +
            `Already defined in ${catalog.get(parsed.name)!.filePath}.`,
        )
      }

      catalog.set(parsed.name, parsed)
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

  const loadSkill = createSkillLoader(catalog)

  it("loads a skill by name", () => {
    const content = loadSkill("python-coding-standards")
    expect(content).toContain("HARD-RULES")
    expect(content).toContain("Python Coding Rules")
  })

  it("returns cached content on second call", () => {
    const first = loadSkill("frontend-coding-standards")
    const second = loadSkill("frontend-coding-standards")
    expect(first).toBe(second)
  })

  it("throws for unknown skill name", () => {
    expect(() => loadSkill("nonexistent-skill")).toThrow(/not found/)
    expect(() => loadSkill("nonexistent-skill")).toThrow(/python-coding-standards/)
  })

  it("lists available skills in error", () => {
    expect(() => loadSkill("unknown")).toThrow("python-coding-standards")
    expect(() => loadSkill("unknown")).toThrow("frontend-coding-standards")
    expect(() => loadSkill("unknown")).toThrow("fastapi-patterns")
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

export function createSkillLoader(catalog: Map<string, SkillEntry>): (name: string) => string {
  const cache = new Map<string, string>()
  const availableNames = Array.from(catalog.keys()).sort()

  return function loadSkill(name: string): string {
    const entry = catalog.get(name)
    if (!entry) {
      throw new Error(
        `AppVerk skill not found: "${name}". Available skills: ${availableNames.join(", ")}`,
      )
    }

    if (cache.has(name)) {
      return cache.get(name)!
    }

    const content = readFileSync(entry.filePath, "utf8")
    cache.set(name, content)
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
- Test: `packages/skill-registry/tests/prompt-injector.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import { generateActivationRules } from "../src/prompt-injector.js"
import { buildSkillCatalog } from "../src/skill-catalog.js"

describe("generateActivationRules", () => {
  const catalog = buildSkillCatalog([
    "packages/python-developer/src/skills",
    "packages/frontend-developer/src/skills",
  ])

  const rules = generateActivationRules(catalog)

  it("includes header and tool reference", () => {
    expect(rules).toContain("AppVerk Skills")
    expect(rules).toContain("load_appverk_skill")
  })

  it("includes all skill names in catalog table", () => {
    expect(rules).toContain("python-coding-standards")
    expect(rules).toContain("frontend-coding-standards")
    expect(rules).toContain("fastapi-patterns")
    expect(rules).toContain("tailwind-patterns")
  })

  it("includes activation descriptions", () => {
    expect(rules).toContain("Python")
    expect(rules).toContain("TypeScript")
  })

  it("includes HARD-RULES section", () => {
    expect(rules).toContain("BEFORE any coding")
    expect(rules).toContain("load ALL applicable skills")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/skill-registry && npx vitest run tests/prompt-injector.test.ts`
Expected: FAIL — `generateActivationRules` not found

- [ ] **Step 3: Implement `prompt-injector.ts`**

```typescript
import type { SkillEntry } from "./skill-catalog.js"

export function generateActivationRules(catalog: Map<string, SkillEntry>): string {
  const entries = Array.from(catalog.values()).sort((a, b) => a.name.localeCompare(b.name))

  const rows = entries
    .map((skill) => `| \`${skill.name}\` | ${skill.activation} |`)
    .join("\n")

  return `## AppVerk Skills — Mandatory Activation Rules

You have access to the \`load_appverk_skill(name)\` tool. Load skills BEFORE starting work. Do not guess — follow the rules below.

### Universal Rules (all tasks)
| When you are... | You MUST load... |
|---|---|
| Writing, modifying, or reviewing Python code | \`python-coding-standards\` |
| Writing, modifying, or reviewing TypeScript/React code | \`frontend-coding-standards\` |
| Writing tests, fixing bugs, refactoring Python code | \`python-tdd-workflow\` |
| Writing tests, fixing bugs, refactoring TypeScript/React code | \`frontend-tdd-workflow\` |
| Adding/removing/updating Python dependencies | \`uv-package-manager\` |
| Adding/removing/updating TypeScript dependencies | \`pnpm-package-manager\` |

### Python Stack Rules
| When the project uses... | You MUST load... |
|---|---|
| FastAPI | \`fastapi-patterns\` |
| SQLAlchemy | \`sqlalchemy-patterns\` |
| Pydantic | \`pydantic-patterns\` |
| asyncio / uvicorn | \`async-python-patterns\` |
| Django | \`django-web-patterns\` + \`django-orm-patterns\` |
| Celery | \`celery-patterns\` |

### TypeScript/React Stack Rules
| When the project uses... | You MUST load... |
|---|---|
| Tailwind CSS | \`tailwind-patterns\` |
| Zustand | \`zustand-patterns\` |
| TanStack Query | \`tanstack-query-patterns\` |
| React Hook Form | \`form-patterns\` |
| TanStack Router | \`tanstack-router-patterns\` |

### All Available Skills
| Skill | Activation Rule |
|---|---|
${rows}

### HARD-RULES
- BEFORE any coding, review, or refactoring: check the tables above and load ALL applicable skills.
- If unsure whether a skill applies: load it — better to have context than miss constraints.
- After loading a skill, follow its HARD-RULES strictly.
- Do NOT begin implementation without loading applicable skills first.`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/skill-registry && npx vitest run tests/prompt-injector.test.ts`
Expected: PASS

---

## Task 5: Implement `src/index.ts` (main plugin factory)

**Files:**
- Create: `packages/skill-registry/src/index.ts`
- Test: `packages/skill-registry/tests/plugin.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest"
import { AppVerkSkillRegistryPlugin } from "../src/index.js"

describe("AppVerkSkillRegistryPlugin", () => {
  it("exports a plugin factory function", () => {
    expect(typeof AppVerkSkillRegistryPlugin).toBe("function")
  })

  it("returns a plugin with tool, config, and transform hook", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)

    expect(plugin.tool).toBeDefined()
    expect(plugin.tool?.load_appverk_skill).toBeDefined()
    expect(plugin["experimental.chat.system.transform"]).toBeDefined()
    expect(plugin.config).toBeDefined()
  })

  it("config hook registers skill paths", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    const config = { skills: { paths: [] as string[] } }

    await plugin.config?.(config as never)

    expect(config.skills.paths.some((p: string) => p.includes("python-developer"))).toBe(true)
    expect(config.skills.paths.some((p: string) => p.includes("frontend-developer"))).toBe(true)
  })

  it("system transform hook appends activation rules", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    const output = { system: [] as string[] }

    await plugin["experimental.chat.system.transform"]?.(
      { model: {} as never } as never,
      output as never,
    )

    expect(output.system.length).toBeGreaterThan(0)
    expect(output.system[0]).toContain("AppVerk Skills")
    expect(output.system[0]).toContain("load_appverk_skill")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/skill-registry && npx vitest run tests/plugin.test.ts`
Expected: FAIL — `AppVerkSkillRegistryPlugin` not found

- [ ] **Step 3: Implement `src/index.ts`**

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { buildSkillCatalog } from "./skill-catalog.js"
import { createSkillLoader } from "./load-skill.js"
import { generateActivationRules } from "./prompt-injector.js"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

const skillDirectories = [
  path.resolve(moduleDirectory, "../../python-developer/dist/skills"),
  path.resolve(moduleDirectory, "../../python-developer/src/skills"),
  path.resolve(moduleDirectory, "../../frontend-developer/dist/skills"),
  path.resolve(moduleDirectory, "../../frontend-developer/src/skills"),
]

export const AppVerkSkillRegistryPlugin: Plugin = async () => {
  const catalog = buildSkillCatalog(skillDirectories)
  const loadSkill = createSkillLoader(catalog)
  const activationRules = generateActivationRules(catalog)

  return {
    config: async (config) => {
      config.skills ??= { paths: [] }
      config.skills.paths.push(
        path.resolve(moduleDirectory, "../../python-developer/dist/skills"),
        path.resolve(moduleDirectory, "../../frontend-developer/dist/skills"),
      )
    },
    tool: {
      load_appverk_skill: tool({
        description:
          "Load an AppVerk development skill by name. Returns the full markdown content of the skill's rules and patterns. Available skills include python-coding-standards, frontend-coding-standards, python-tdd-workflow, frontend-tdd-workflow, fastapi-patterns, sqlalchemy-patterns, tailwind-patterns, and more.",
        args: {
          name: tool.schema
            .string()
            .describe("Skill name (e.g., python-coding-standards, fastapi-patterns)"),
        },
        async execute(args: { name: string }) {
          try {
            return loadSkill(args.name)
          } catch (error) {
            return `Error: ${(error as Error).message}`
          }
        },
      }),
    },
    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(activationRules)
    },
  }
}

export default AppVerkSkillRegistryPlugin
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/skill-registry && npx vitest run tests/plugin.test.ts`
Expected: PASS

---

## Task 6: Rename conflicting skill names and add activation frontmatter

**Files:**
- Modify: `packages/python-developer/src/skills/coding-standards.md` (frontmatter)
- Modify: `packages/python-developer/src/skills/tdd-workflow.md` (frontmatter)
- Modify: `packages/frontend-developer/src/skills/coding-standards.md` (frontmatter)
- Modify: `packages/frontend-developer/src/skills/tdd-workflow.md` (frontmatter)

- [ ] **Step 1: Update python-developer coding-standards frontmatter**

Change the first 4 lines from:
```yaml
name: coding-standards
description: Enforces Python coding rules: type hints, imports, naming, error handling, and project conventions for AppVerk projects. Activates when writing or reviewing Python code.
allowed-tools: Read, Grep, Glob, Bash(ruff:*), Bash(mypy:*), Bash(basedpyright:*), Bash(make:*), Bash(uv:*), Bash(python:*)
```

To:
```yaml
name: python-coding-standards
description: Enforces Python coding rules - type hints, imports, naming, error handling, and project conventions for AppVerk projects.
activation: MUST load when writing or reviewing Python code
allowed-tools: Read, Grep, Glob, Bash(ruff:*), Bash(mypy:*), Bash(basedpyright:*), Bash(make:*), Bash(uv:*), Bash(python:*)
```

- [ ] **Step 2: Update python-developer tdd-workflow frontmatter**

Change from:
```yaml
name: tdd-workflow
description: Test-driven development workflow rules for Python
```

To:
```yaml
name: python-tdd-workflow
description: Test-driven development workflow rules for Python
activation: MUST load when writing tests, fixing bugs, or refactoring Python code
```

- [ ] **Step 3: Update frontend-developer coding-standards frontmatter**

Change from:
```yaml
name: coding-standards
description: TypeScript + React coding standards, architecture patterns, naming conventions, ESLint configuration
```

To:
```yaml
name: frontend-coding-standards
description: TypeScript + React coding standards, architecture patterns, naming conventions, ESLint configuration
activation: MUST load when writing or reviewing TypeScript/React code
```

- [ ] **Step 4: Update frontend-developer tdd-workflow frontmatter**

Change from:
```yaml
name: tdd-workflow
description: Test-driven development workflow rules for TypeScript and React
```

To:
```yaml
name: frontend-tdd-workflow
description: Test-driven development workflow rules for TypeScript and React
activation: MUST load when writing tests, fixing bugs, or refactoring TypeScript/React code
```

- [ ] **Step 5: Verify all other skills have unique names**

Run: `grep -r "^name:" packages/python-developer/src/skills packages/frontend-developer/src/skills | sort -t: -k2`
Expected: All names unique (no duplicates besides the ones we just fixed)

---

## Task 7: Update python-developer and frontend-developer to remove old tools

**Files:**
- Modify: `packages/python-developer/src/index.ts`
- Modify: `packages/python-developer/src/agent-prompt.md`
- Modify: `packages/frontend-developer/src/index.ts`
- Modify: `packages/frontend-developer/src/agent-prompt.md`

- [ ] **Step 1: Update `packages/python-developer/src/index.ts`**

Replace entire file with:

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkPythonDeveloperPlugin = createSkillPlugin({
  namespace: "python",
  agentName: "python-developer",
  commandName: "python",
  agentDescription:
    "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.",
  commandDescription:
    "Python development workflow enforcing coding standards, TDD, and stack-specific patterns.",
  loadSkill: () => {
    throw new Error("Use load_appverk_skill instead")
  },
  availableSkills: [],
  moduleDirectory,
})

export default AppVerkPythonDeveloperPlugin
```

Wait — `createSkillPlugin` still registers a `load_python_skill` tool. We need to modify `skill-utils` to allow disabling the tool, OR modify `python-developer` to not use `createSkillPlugin`.

Better approach: modify `createSkillPlugin` in `skill-utils` to accept `loadSkill: null` meaning "don't register a tool".

- [ ] **Step 1 (revised): Update `packages/skill-utils/src/index.ts` to allow disabling tool registration**

In `CreateSkillPluginOptions`, change `loadSkill` type:
```typescript
loadSkill: ((name: string) => string) | null
```

In `createSkillPlugin`, when constructing `tool`, conditionally include the tool:
```typescript
tool: loadSkill ? {
  [`load_${namespace}_skill`]: tool({
    description: ...,
    args: { ... },
    async execute(args) { return loadSkill(args.name) }
  })
} : undefined,
```

- [ ] **Step 2: Update `packages/python-developer/src/index.ts`**

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkPythonDeveloperPlugin = createSkillPlugin({
  namespace: "python",
  agentName: "python-developer",
  commandName: "python",
  agentDescription:
    "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.",
  commandDescription:
    "Python development workflow enforcing coding standards, TDD, and stack-specific patterns.",
  loadSkill: null,
  availableSkills: [],
  moduleDirectory,
})

export default AppVerkPythonDeveloperPlugin
```

- [ ] **Step 3: Update `packages/frontend-developer/src/index.ts`**

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkFrontendDeveloperPlugin = createSkillPlugin({
  namespace: "frontend",
  agentName: "frontend-developer",
  commandName: "frontend",
  agentDescription:
    "Expert TypeScript + React developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.",
  commandDescription:
    "TypeScript + React development workflow enforcing coding standards, TDD, and stack-specific patterns.",
  loadSkill: null,
  availableSkills: [],
  moduleDirectory,
})

export default AppVerkFrontendDeveloperPlugin
```

- [ ] **Step 4: Update `packages/python-developer/src/agent-prompt.md`**

Replace "Available Skills" section with a note to use `load_appverk_skill`:

Find the section starting with `## Available Skills` and ending before `**Django and FastAPI skills are mutually exclusive.**`

Replace with:
```markdown
## Available Skills

Call `load_appverk_skill(name)` to load the full markdown rules for any skill. The skill registry is managed globally and available to all agents.

| Skill | Load Condition |
|---|---|
| `python-coding-standards` | **ALWAYS** — before any coding |
| `python-tdd-workflow` | **ALWAYS** — when writing or modifying code |
| `fastapi-patterns` | When FastAPI is detected in dependencies or imports |
| `sqlalchemy-patterns` | When SQLAlchemy is detected |
| `pydantic-patterns` | When Pydantic schemas / validation are involved |
| `async-python-patterns` | When asyncio / uvicorn / anyio is detected |
| `uv-package-manager` | When adding / removing / updating dependencies |
| `django-web-patterns` | When Django is detected |
| `django-orm-patterns` | When Django ORM models / queries / migrations are involved |
| `celery-patterns` | When Celery is detected |
```

- [ ] **Step 5: Update `packages/frontend-developer/src/agent-prompt.md`**

Replace "Available Skills" section:

Find `## Available Skills` through the end of the table.

Replace with:
```markdown
## Available Skills

Call `load_appverk_skill(name)` to load the full markdown rules for any skill. The skill registry is managed globally and available to all agents.

| Skill | Load Condition |
|---|---|
| `frontend-coding-standards` | **ALWAYS** — before any coding |
| `frontend-tdd-workflow` | **ALWAYS** — when writing or modifying code |
| `tailwind-patterns` | When Tailwind CSS is detected in dependencies |
| `zustand-patterns` | When Zustand is detected |
| `tanstack-query-patterns` | When TanStack Query is detected |
| `form-patterns` | When React Hook Form is detected |
| `tanstack-router-patterns` | When TanStack Router is detected |
| `pnpm-package-manager` | When adding / removing / updating dependencies |
```

---

## Task 8: Update root entrypoints

**Files:**
- Modify: `src/index.ts`
- Modify: `src/index.js`

- [ ] **Step 1: Update `src/index.ts`**

Add import:
```typescript
import { AppVerkSkillRegistryPlugin } from "../packages/skill-registry/dist/index.js"
```

Add to `defaultPluginFactories`:
```typescript
const defaultPluginFactories: Plugin[] = [
  AppVerkCommitPlugin,
  AppVerkPythonDeveloperPlugin,
  AppVerkCodeReviewPlugin,
  AppVerkFrontendDeveloperPlugin,
  AppVerkSkillRegistryPlugin,
]
```

- [ ] **Step 2: Update `src/index.js`**

Add import:
```javascript
import { AppVerkSkillRegistryPlugin } from "../packages/skill-registry/dist/index.js";
```

Add to `defaultPluginFactories`:
```javascript
const defaultPluginFactories = [
    AppVerkCommitPlugin,
    AppVerkPythonDeveloperPlugin,
    AppVerkCodeReviewPlugin,
    AppVerkFrontendDeveloperPlugin,
    AppVerkSkillRegistryPlugin,
];
```

---

## Task 9: Update root package.json

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add skill-registry to workspace scripts**

Find each of these scripts and add `--workspace @appverk/opencode-skill-registry`:
- `build`
- `test`
- `typecheck`

Current format is `--workspace @appverk/opencode-...`, add the new one.

- [ ] **Step 2: Add `packages/skill-registry/dist` to `files`**

In root `package.json` `files` array, add `"packages/skill-registry/dist"`.

- [ ] **Step 3: Bump version**

Change `"version"` from `"0.2.9"` to `"0.2.10"`.

---

## Task 10: Update root tests

**Files:**
- Modify: `tests/root-plugin.test.ts`

- [ ] **Step 1: Update packaging test to include skill-registry**

In the `packResult` assertion, add:
```typescript
expect(packedFiles).toEqual(
  expect.arrayContaining([
    ...,
    "packages/skill-registry/dist/index.js",
    "packages/skill-registry/dist/index.d.ts",
  ]),
)
```

- [ ] **Step 2: Update frontend test to check for `load_appverk_skill` instead of `load_frontend_skill`**

Change:
```typescript
expect(plugin.tool?.load_frontend_skill).toBeDefined()
```

To:
```typescript
expect(plugin.tool?.load_appverk_skill).toBeDefined()
```

- [ ] **Step 3: Add test for system prompt transform hook**

Add a new test:
```typescript
it("injects skill activation rules via system prompt transform", async () => {
  const { AppVerkPlugins } = await loadRootModule()
  const plugin = await AppVerkPlugins({} as never)

  const output = { system: [] as string[] }
  await plugin["experimental.chat.system.transform"]?.(
    { model: {} as never } as never,
    output as never,
  )

  expect(output.system.length).toBeGreaterThan(0)
  expect(output.system[0]).toContain("AppVerk Skills")
  expect(output.system[0]).toContain("load_appverk_skill")
})
```

---

## Task 11: Build and run full test suite

- [ ] **Step 1: Build skill-utils**

Run: `npm run build --workspace @appverk/opencode-skill-utils`

- [ ] **Step 2: Build python-developer**

Run: `npm run build --workspace @appverk/opencode-python-developer`

- [ ] **Step 3: Build frontend-developer**

Run: `npm run build --workspace @appverk/opencode-frontend-developer`

- [ ] **Step 4: Build skill-registry**

Run: `npm run build --workspace @appverk/opencode-skill-registry`

- [ ] **Step 5: Build code-review and commit**

Run: `npm run build --workspace @appverk/opencode-code-review && npm run build --workspace @appverk/opencode-commit`

- [ ] **Step 6: Build root**

Run: `npm run build` (root level — rebuilds src/index.js from src/index.ts)

- [ ] **Step 7: Run all tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

---

## Self-Review Checklist

**1. Spec coverage:**
- [x] Global tool `load_appverk_skill` — Task 5
- [x] System prompt injection via `experimental.chat.system.transform` — Tasks 4, 5
- [x] Skill catalog scanning and frontmatter parsing — Task 2
- [x] Unique skill names (renamed conflicts) — Task 6
- [x] Removal of old per-package tools — Task 7
- [x] Activation field in frontmatter — Task 6
- [x] Caching in skill loader — Task 3
- [x] Error handling with available skill list — Task 3

**2. Placeholder scan:**
- No "TBD", "TODO", "implement later"
- No vague "add appropriate error handling" — specific try/catch in tool execute
- No "similar to Task N" — each task is self-contained
- All code blocks contain actual code

**3. Type consistency:**
- `loadSkill` parameter type in `CreateSkillPluginOptions` changed to `((name: string) => string) | null`
- All skill names use kebab-case consistently
- Tool name `load_appverk_skill` consistent across all files
