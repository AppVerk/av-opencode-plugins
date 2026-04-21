# Python Developer Plugin Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Claude Code `python-developer` plugin to an OpenCode plugin package (`@appverk/opencode-python-developer`) with modular skill loading via custom tool, preserving both `/develop` command and `python-developer` agent.

**Architecture:** Plugin registers `agent.python-developer` (core persona + skill catalog), `command.develop` (orchestration prompt with `agent: python-developer`), and `tool.load_python_skill` (returns markdown content of bundled skill files). 10 skill files are copied from `av-marketplace` and bundled as static assets.

**Tech Stack:** TypeScript, `@opencode-ai/plugin`, `tsup`, `vitest`, Node.js ESM

---

## File Map

| File | Responsibility |
|---|---|
| `packages/python-developer/package.json` | Package manifest, scripts, workspace config |
| `packages/python-developer/tsconfig.json` | TypeScript config extending base |
| `packages/python-developer/vitest.config.ts` | Vitest workspace test config |
| `packages/python-developer/src/skills/*.md` | 10 skill files migrated from av-marketplace |
| `packages/python-developer/src/agent-prompt.md` | Core system prompt for `agent.python-developer` |
| `packages/python-developer/src/commands/develop.md` | `/develop` command prompt template |
| `packages/python-developer/src/tools/load-skill.ts` | `loadPythonSkill(name)` implementation + path resolution |
| `packages/python-developer/src/index.ts` | Plugin entry point — exports config hook + tool registration |
| `packages/python-developer/tests/plugin.test.ts` | Tests config hook registers agent + command + tool |
| `packages/python-developer/tests/load-skill.test.ts` | Tests load_python_skill happy path + error cases |
| `packages/python-developer/tests/build-output.test.ts` | Tests dist/skills/ contains all 10 files after build |
| `packages/python-developer/tests/package-smoke.test.ts` | Tests plugin factory export |
| `packages/python-developer/scripts/copy-skills.mjs` | Build step: copies src/skills/*.md → dist/skills/ |
| `src/index.ts` (root) | Merges python-developer plugin into defaultPluginFactories |
| `package.json` (root) | Adds workspace reference + script updates |
| `README.md` (root) | Adds python-developer package row + usage |
| `docs/plugins/python-developer.md` | Package-level behavior and usage guide |

---

### Task 1: Package Scaffolding

**Files:**
- Create: `packages/python-developer/package.json`
- Create: `packages/python-developer/tsconfig.json`
- Create: `packages/python-developer/vitest.config.ts`

- [ ] **Step 1: Create `packages/python-developer/package.json`**

```json
{
  "name": "@appverk/opencode-python-developer",
  "version": "0.1.0",
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
    "build": "tsup src/index.ts --format esm --dts && node ./scripts/copy-skills.mjs",
    "test": "npm run build && vitest run --config vitest.config.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.14.19"
  }
}
```

- [ ] **Step 2: Create `packages/python-developer/tsconfig.json`**

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

- [ ] **Step 3: Create `packages/python-developer/vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 4: Commit**

```bash
git add packages/python-developer/package.json packages/python-developer/tsconfig.json packages/python-developer/vitest.config.ts
git commit -m "chore(python-developer): add package scaffolding"
```

---

### Task 2: Migrate Skill Files

**Files:**
- Create: `packages/python-developer/src/skills/coding-standards.md`
- Create: `packages/python-developer/src/skills/tdd-workflow.md`
- Create: `packages/python-developer/src/skills/fastapi-patterns.md`
- Create: `packages/python-developer/src/skills/sqlalchemy-patterns.md`
- Create: `packages/python-developer/src/skills/pydantic-patterns.md`
- Create: `packages/python-developer/src/skills/async-python-patterns.md`
- Create: `packages/python-developer/src/skills/uv-package-manager.md`
- Create: `packages/python-developer/src/skills/django-web-patterns.md`
- Create: `packages/python-developer/src/skills/django-orm-patterns.md`
- Create: `packages/python-developer/src/skills/celery-patterns.md`

- [ ] **Step 1: Copy all 10 skill files from av-marketplace**

Run these copy commands:

```bash
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/coding-standards/SKILL.md packages/python-developer/src/skills/coding-standards.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/tdd-workflow/SKILL.md packages/python-developer/src/skills/tdd-workflow.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/fastapi-patterns/SKILL.md packages/python-developer/src/skills/fastapi-patterns.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/sqlalchemy-patterns/SKILL.md packages/python-developer/src/skills/sqlalchemy-patterns.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/pydantic-patterns/SKILL.md packages/python-developer/src/skills/pydantic-patterns.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/async-python-patterns/SKILL.md packages/python-developer/src/skills/async-python-patterns.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/uv-package-manager/SKILL.md packages/python-developer/src/skills/uv-package-manager.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/django-web-patterns/SKILL.md packages/python-developer/src/skills/django-web-patterns.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/django-orm-patterns/SKILL.md packages/python-developer/src/skills/django-orm-patterns.md
cp /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/skills/celery-patterns/SKILL.md packages/python-developer/src/skills/celery-patterns.md
```

Verify all 10 files exist:

```bash
ls packages/python-developer/src/skills/
```

Expected output: `async-python-patterns.md  celery-patterns.md  coding-standards.md  django-orm-patterns.md  django-web-patterns.md  fastapi-patterns.md  pydantic-patterns.md  sqlalchemy-patterns.md  tdd-workflow.md  uv-package-manager.md`

- [ ] **Step 2: Strip Claude-specific loading directives from each skill**

In each skill file, remove any lines that say:

```
Use the Skill tool with:
  skill: "python-developer:..."
```

Or any reference to `TaskCreate` / `TaskUpdate` / `Skill tool`. These are Claude Code-specific and not applicable in OpenCode.

Run a grep to verify nothing remains:

```bash
grep -r "Skill tool\|TaskCreate\|TaskUpdate" packages/python-developer/src/skills/ || echo "Clean"
```

Expected: `Clean`

- [ ] **Step 3: Commit**

```bash
git add packages/python-developer/src/skills/
git commit -m "feat(python-developer): migrate 10 skill files from av-marketplace"
```

---

### Task 3: Agent Prompt

**Files:**
- Create: `packages/python-developer/src/agent-prompt.md`

- [ ] **Step 1: Write `packages/python-developer/src/agent-prompt.md`**

```markdown
---
name: python-developer
description: Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns. Loads skills on demand via load_python_skill tool.
---

# Python Developer Agent

You are an expert Python developer for AppVerk projects.

## Core Mandate

- Follow TDD: tests before implementation, red-green-refactor cycle.
- Enforce AppVerk coding standards on all code you write or review.
- Use modern Python: type annotations (`X | None`, never `Optional[X]`), absolute imports, `pathlib.Path`.
- Prefer `uv run` for all Python command execution.

## Workflow

When assigned a Python task:

1. Detect the project stack by reading `pyproject.toml` and scanning imports.
2. Load mandatory skills: `coding-standards` and `tdd-workflow`.
3. Load conditional skills based on detected frameworks (see catalog below).
4. Follow the loaded skill rules strictly.
5. Execute TDD cycle, quality gates, and final verification.

## Available Skills

Call `load_python_skill(name)` to load the full markdown rules for any skill.

| Skill | Load Condition |
|---|---|
| `coding-standards` | **ALWAYS** — before any coding |
| `tdd-workflow` | **ALWAYS** — when writing or modifying code |
| `fastapi-patterns` | When FastAPI is detected in dependencies or imports |
| `sqlalchemy-patterns` | When SQLAlchemy is detected |
| `pydantic-patterns` | When Pydantic schemas / validation are involved |
| `async-python-patterns` | When asyncio / uvicorn / anyio is detected |
| `uv-package-manager` | When adding / removing / updating dependencies |
| `django-web-patterns` | When Django is detected |
| `django-orm-patterns` | When Django ORM models / queries / migrations are involved |
| `celery-patterns` | When Celery is detected |

**Django and FastAPI skills are mutually exclusive.** If both are detected, prefer the framework most relevant to the current task. When Django is detected, do NOT load `fastapi-patterns` or `sqlalchemy-patterns`. `celery-patterns` and `pydantic-patterns` can load with either stack.
```

- [ ] **Step 2: Commit**

```bash
git add packages/python-developer/src/agent-prompt.md
git commit -m "feat(python-developer): add agent system prompt"
```

---

### Task 4: Command Template

**Files:**
- Create: `packages/python-developer/src/commands/develop.md`

- [ ] **Step 1: Read original `commands/develop.md` from av-marketplace**

```bash
cat /Users/mef1st0/Projects/AppVerk/av-marketplace/plugins/python-developer/commands/develop.md
```

- [ ] **Step 2: Write adapted `packages/python-developer/src/commands/develop.md`**

Copy the original frontmatter and body, but replace every `Skill tool` invocation with `load_python_skill` tool calls.

Key replacements:
- "Use the Skill tool with: skill: \"python-developer:coding-standards\"" → "Call the tool `load_python_skill` with name `coding-standards`"
- "Use the Skill tool with: skill: \"python-developer:tdd-workflow\"" → "Call the tool `load_python_skill` with name `tdd-workflow`"
- Same pattern for all 8 conditional skills

Keep all original workflow steps (analyze, detect stack, plan, TDD cycle, quality gates, final verification). Keep the `$ARGUMENTS` placeholder and `allowed-tools` frontmatter field.

The final file must have this exact frontmatter:

```yaml
---
description: Python development workflow enforcing coding standards, TDD, and stack-specific patterns. Loads the right skills automatically (FastAPI, Django, Celery).
agent: python-developer
argument-hint: <task description>
---
```

Verify the file contains `load_python_skill` at least 10 times (once per skill):

```bash
grep -c "load_python_skill" packages/python-developer/src/commands/develop.md
```

Expected: `10` (or more if referenced multiple times)

- [ ] **Step 3: Commit**

```bash
git add packages/python-developer/src/commands/develop.md
git commit -m "feat(python-developer): add /develop command template"
```

---

### Task 5: Load-Skill Tool (TDD)

**Files:**
- Create: `packages/python-developer/src/tools/load-skill.ts`
- Create: `packages/python-developer/tests/load-skill.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/python-developer/tests/load-skill.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { loadPythonSkill } from "../src/tools/load-skill.js"

describe("loadPythonSkill", () => {
  it("returns coding-standards skill markdown", () => {
    const content = loadPythonSkill("coding-standards")
    expect(content).toContain("HARD-RULES")
    expect(content).toContain("Python Coding Rules")
  })

  it("returns tdd-workflow skill markdown", () => {
    const content = loadPythonSkill("tdd-workflow")
    expect(content).toContain("TDD")
    expect(content).toContain("Red-Green-Refactor")
  })

  it("returns fastapi-patterns skill markdown", () => {
    const content = loadPythonSkill("fastapi-patterns")
    expect(content).toContain("FastAPI")
  })

  it("returns all 10 skills without error", () => {
    const skills = [
      "coding-standards",
      "tdd-workflow",
      "fastapi-patterns",
      "sqlalchemy-patterns",
      "pydantic-patterns",
      "async-python-patterns",
      "uv-package-manager",
      "django-web-patterns",
      "django-orm-patterns",
      "celery-patterns",
    ]
    for (const name of skills) {
      expect(() => loadPythonSkill(name)).not.toThrow()
      const content = loadPythonSkill(name)
      expect(content.length).toBeGreaterThan(100)
    }
  })

  it("throws for unknown skill name", () => {
    expect(() => loadPythonSkill("nonexistent")).toThrow(/python-developer.*skill.*not.*found/i)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/python-developer && npx vitest run tests/load-skill.test.ts --config vitest.config.ts
```

Expected: FAIL with `Error: Cannot find module '../src/tools/load-skill.js'`

- [ ] **Step 3: Implement `packages/python-developer/src/tools/load-skill.ts`**

```typescript
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const AVAILABLE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "fastapi-patterns",
  "sqlalchemy-patterns",
  "pydantic-patterns",
  "async-python-patterns",
  "uv-package-manager",
  "django-web-patterns",
  "django-orm-patterns",
  "celery-patterns",
]

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

function resolveSkillPath(name: string): string | null {
  const candidates = [
    path.resolve(moduleDirectory, "../../skills", `${name}.md`),
    path.resolve(moduleDirectory, "../../src/skills", `${name}.md`),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

export function loadPythonSkill(name: string): string {
  if (!AVAILABLE_SKILLS.includes(name)) {
    throw new Error(
      `Python skill not found: ${name}. Available: ${AVAILABLE_SKILLS.join(", ")}`,
    )
  }

  const skillPath = resolveSkillPath(name)

  if (!skillPath) {
    throw new Error(
      `Python skill file not found for: ${name}. Tried: ../../skills/${name}.md and ../../src/skills/${name}.md`,
    )
  }

  return readFileSync(skillPath, "utf8")
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd packages/python-developer && npx vitest run tests/load-skill.test.ts --config vitest.config.ts
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/python-developer/src/tools/load-skill.ts packages/python-developer/tests/load-skill.test.ts
git commit -m "feat(python-developer): add load_python_skill tool with tests"
```

---

### Task 6: Plugin Entry Point (TDD)

**Files:**
- Create: `packages/python-developer/src/index.ts`
- Create: `packages/python-developer/tests/plugin.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/python-developer/tests/plugin.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { AppVerkPythonDeveloperPlugin } from "../src/index.js"

describe("AppVerkPythonDeveloperPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkPythonDeveloperPlugin).toBe("function")
  })

  it("registers agent python-developer in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { agent: {} } as { agent?: Record<string, { description?: string; prompt?: string }> }

    await plugin.config?.(config as never)

    expect(config.agent?.["python-developer"]).toBeDefined()
    expect(config.agent?.["python-developer"].description).toContain("Python")
    expect(config.agent?.["python-developer"].prompt).toContain("Python Developer Agent")
  })

  it("registers command /develop in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { command: {} } as { command?: Record<string, { description?: string; template: string; agent?: string }> }

    await plugin.config?.(config as never)

    expect(config.command?.develop).toBeDefined()
    expect(config.command?.develop.description).toContain("Python")
    expect(config.command?.develop.template).toContain("Python Development Workflow")
    expect(config.command?.develop.agent).toBe("python-developer")
  })

  it("registers load_python_skill tool", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    expect(plugin.tool?.load_python_skill).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd packages/python-developer && npx vitest run tests/plugin.test.ts --config vitest.config.ts
```

Expected: FAIL with module not found or assertions failing

- [ ] **Step 3: Implement `packages/python-developer/src/index.ts`**

```typescript
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { loadPythonSkill } from "./tools/load-skill.js"

const AGENT_DESCRIPTION =
  "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns."

const COMMAND_DESCRIPTION =
  "Python development workflow enforcing coding standards, TDD, and stack-specific patterns."

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const packagedAgentPath = path.resolve(moduleDirectory, "agent-prompt.md")
const sourceAgentPath = path.resolve(moduleDirectory, "../src/agent-prompt.md")
const packagedCommandPath = path.resolve(moduleDirectory, "commands/develop.md")
const sourceCommandPath = path.resolve(moduleDirectory, "../src/commands/develop.md")

function loadFile(packaged: string, source: string): string {
  const filePath = existsSync(packaged) ? packaged : source
  return readFileSync(filePath, "utf8")
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
      }

      config.command = config.command ?? {}
      config.command.develop = {
        description: COMMAND_DESCRIPTION,
        template: COMMAND_TEMPLATE,
        agent: "python-developer",
      }
    },
    tool: {
      load_python_skill: tool({
        description:
          "Load a Python development skill by name. Returns the full markdown content of the skill's rules and patterns.",
        args: {
          name: tool.schema
            .string()
            .describe(
              "Skill name: coding-standards, tdd-workflow, fastapi-patterns, sqlalchemy-patterns, pydantic-patterns, async-python-patterns, uv-package-manager, django-web-patterns, django-orm-patterns, celery-patterns",
            ),
        },
        execute(args) {
          return loadPythonSkill(args.name)
        },
      }),
    },
  }
}

export default AppVerkPythonDeveloperPlugin
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd packages/python-developer && npx vitest run tests/plugin.test.ts --config vitest.config.ts
```

Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/python-developer/src/index.ts packages/python-developer/tests/plugin.test.ts
git commit -m "feat(python-developer): add plugin entry point with config hook and tool"
```

---

### Task 7: Build Script

**Files:**
- Create: `packages/python-developer/scripts/copy-skills.mjs`

- [ ] **Step 1: Create `packages/python-developer/scripts/copy-skills.mjs`**

```javascript
import { cpSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(root, "../src/skills")
const dst = path.resolve(root, "../dist/skills")

const skills = [
  "coding-standards",
  "tdd-workflow",
  "fastapi-patterns",
  "sqlalchemy-patterns",
  "pydantic-patterns",
  "async-python-patterns",
  "uv-package-manager",
  "django-web-patterns",
  "django-orm-patterns",
  "celery-patterns",
]

mkdirSync(dst, { recursive: true })

for (const skill of skills) {
  const srcFile = path.join(src, `${skill}.md`)
  const dstFile = path.join(dst, `${skill}.md`)
  cpSync(srcFile, dstFile)
  console.log(`Copied ${skill}.md → dist/skills/`)
}

console.log(`Copied ${skills.length} skills to dist/skills/`)
```

- [ ] **Step 2: Verify build script works standalone**

```bash
cd packages/python-developer && node scripts/copy-skills.mjs
```

Expected output:
```
Copied coding-standards.md → dist/skills/
Copied tdd-workflow.md → dist/skills/
...
Copied 10 skills to dist/skills/
```

Verify files:

```bash
ls packages/python-developer/dist/skills/
```

Expected: all 10 `.md` files listed

- [ ] **Step 3: Commit**

```bash
git add packages/python-developer/scripts/copy-skills.mjs
git commit -m "build(python-developer): add copy-skills build script"
```

---

### Task 8: Build-Output and Package-Smoke Tests

**Files:**
- Create: `packages/python-developer/tests/build-output.test.ts`
- Create: `packages/python-developer/tests/package-smoke.test.ts`

- [ ] **Step 1: Write `packages/python-developer/tests/build-output.test.ts`**

```typescript
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("build output assets", () => {
  it("includes all 10 skill files in dist/skills", async () => {
    const skills = [
      "coding-standards",
      "tdd-workflow",
      "fastapi-patterns",
      "sqlalchemy-patterns",
      "pydantic-patterns",
      "async-python-patterns",
      "uv-package-manager",
      "django-web-patterns",
      "django-orm-patterns",
      "celery-patterns",
    ]

    for (const name of skills) {
      const skillPath = resolve(process.cwd(), "dist/skills", `${name}.md`)
      expect(existsSync(skillPath)).toBe(true)
      const content = readFileSync(skillPath, "utf8")
      expect(content.length).toBeGreaterThan(100)
    }
  })

  it("dist/commands/develop.md exists and contains agent frontmatter", async () => {
    const { AppVerkPythonDeveloperPlugin } = await import("../dist/index.js")
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { command: {} } as {
      command?: Record<string, { description?: string; template: string; agent?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.command?.develop?.template).toContain("agent: python-developer")
    expect(config.command?.develop?.template).toContain("Python Development Workflow")
  })
})
```

- [ ] **Step 2: Write `packages/python-developer/tests/package-smoke.test.ts`**

```typescript
import { describe, expect, it } from "vitest"
import { AppVerkPythonDeveloperPlugin } from "../src/index.js"

describe("AppVerkPythonDeveloperPlugin package", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkPythonDeveloperPlugin).toBe("function")
  })
})
```

- [ ] **Step 3: Run all tests together**

```bash
cd packages/python-developer && npm run test
```

Expected: all tests pass including build-output (requires `npm run build` first, which the test script does via `"test": "npm run build && vitest run"`)

- [ ] **Step 4: Commit**

```bash
git add packages/python-developer/tests/build-output.test.ts packages/python-developer/tests/package-smoke.test.ts
git commit -m "test(python-developer): add build-output and package-smoke tests"
```

---

### Task 9: Root Integration

**Files:**
- Modify: `src/index.ts`
- Modify: `package.json` (root)

- [ ] **Step 1: Modify `src/index.ts` to import and register the plugin**

Add import at the top:

```typescript
import { AppVerkPythonDeveloperPlugin } from "../packages/python-developer/dist/index.js"
```

Change `defaultPluginFactories` array:

```typescript
const defaultPluginFactories: Plugin[] = [AppVerkCommitPlugin, AppVerkPythonDeveloperPlugin]
```

Full context of changes (show surrounding lines for uniqueness):

Old:
```typescript
import type { Hooks, Plugin } from "@opencode-ai/plugin"
import { AppVerkCommitPlugin } from "../packages/commit/dist/index.js"

const defaultPluginFactories: Plugin[] = [AppVerkCommitPlugin]
```

New:
```typescript
import type { Hooks, Plugin } from "@opencode-ai/plugin"
import { AppVerkCommitPlugin } from "../packages/commit/dist/index.js"
import { AppVerkPythonDeveloperPlugin } from "../packages/python-developer/dist/index.js"

const defaultPluginFactories: Plugin[] = [AppVerkCommitPlugin, AppVerkPythonDeveloperPlugin]
```

- [ ] **Step 2: Modify root `package.json` to add workspace reference**

Add to `files` array:

Old:
```json
"files": [
  "src/index.js",
  "src/index.d.ts",
  "packages/commit/dist"
]
```

New:
```json
"files": [
  "src/index.js",
  "src/index.d.ts",
  "packages/commit/dist",
  "packages/python-developer/dist"
]
```

Update scripts to include the new workspace. For each of `build`, `test`, `typecheck`, `check`, append `&& npm run <script> --workspace @appverk/opencode-python-developer` or use a pattern that includes all workspaces.

Old `scripts`:
```json
"scripts": {
  "build": "npm run build --workspace @appverk/opencode-commit",
  "test": "vitest run --config vitest.config.ts && npm run test --workspace @appverk/opencode-commit",
  "typecheck": "tsc -p tsconfig.json --noEmit && npm run typecheck --workspace @appverk/opencode-commit",
  "check": "npm run typecheck && npm run test && npm run build"
}
```

New `scripts`:
```json
"scripts": {
  "build": "npm run build --workspace @appverk/opencode-commit && npm run build --workspace @appverk/opencode-python-developer",
  "test": "vitest run --config vitest.config.ts && npm run test --workspace @appverk/opencode-commit && npm run test --workspace @appverk/opencode-python-developer",
  "typecheck": "tsc -p tsconfig.json --noEmit && npm run typecheck --workspace @appverk/opencode-commit && npm run typecheck --workspace @appverk/opencode-python-developer",
  "check": "npm run typecheck && npm run test && npm run build"
}
```

- [ ] **Step 3: Build the new package so root import resolves**

```bash
cd packages/python-developer && npm run build
```

- [ ] **Step 4: Verify root typecheck still passes**

```bash
npm run typecheck
```

Expected: zero errors

- [ ] **Step 5: Commit**

```bash
git add src/index.ts package.json
git commit -m "feat(root): wire python-developer plugin into bundle"
```

---

### Task 10: Documentation

**Files:**
- Create: `docs/plugins/python-developer.md`
- Modify: `README.md` (root)

- [ ] **Step 1: Create `docs/plugins/python-developer.md`**

```markdown
# @appverk/opencode-python-developer

Python development workflow for OpenCode. Provides the `/develop` command and `python-developer` agent with modular skill loading for FastAPI, Django, Celery, SQLAlchemy, Pydantic, and async patterns.

## Installation

The root plugin bundle (`av-opencode-plugins`) includes this package automatically. No separate install needed.

## Usage

Run the Python development workflow:

```text
/develop <task description>
```

Example:
```text
/develop Add user authentication endpoint with JWT
```

The command:
1. Detects your project stack (FastAPI, Django, Celery, etc.)
2. Loads relevant Python development skills
3. Follows TDD: writes tests first, then implementation
4. Runs quality gates (typecheck, tests, lint)

## Direct Agent Use

You can also invoke the agent directly:

```bash
opencode agent python-developer "Refactor user service to use repository pattern"
```

## Available Skills

The plugin bundles 10 skills loaded on demand via the `load_python_skill` tool:

- `coding-standards` — AppVerk Python rules (types, imports, naming)
- `tdd-workflow` — Red-green-refactor cycle, fakes over mocks
- `fastapi-patterns` — DDD/Clean Architecture with FastAPI
- `sqlalchemy-patterns` — Async repository pattern, UoW
- `pydantic-patterns` — Model validation, settings
- `async-python-patterns` — asyncio, uvicorn, non-blocking I/O
- `uv-package-manager` — uv add/run/lock workflows
- `django-web-patterns` — Views, ViewSets, DRF serializers
- `django-orm-patterns` — Models, queries, migrations, N+1 prevention
- `celery-patterns` — Idempotent tasks, retry, pass IDs not objects

## Project Structure

- `src/index.ts` — Plugin entry point (config hook + tool registration)
- `src/agent-prompt.md` — Core system prompt for `python-developer` agent
- `src/commands/develop.md` — `/develop` command template
- `src/tools/load-skill.ts` — `load_python_skill` tool implementation
- `src/skills/*.md` — 10 skill markdown files
```

- [ ] **Step 2: Modify root `README.md`**

Add a new row to the Available Packages table (after commit row):

```markdown
| [`@appverk/opencode-python-developer`](docs/plugins/python-developer.md) | `0.1.0` | Python development workflow with TDD, coding standards, and stack-specific patterns (FastAPI, Django, Celery). |
```

Update the repository structure bullet list to include:
```markdown
- `packages/python-developer` - plugin source, tests, skill files, and build scripts for the Python development workflow.
- `docs/plugins/python-developer.md` - package-level behavior and usage guide.
```

Update the documentation section to include:
```markdown
- [Python Developer Plugin Guide](docs/plugins/python-developer.md)
```

Update the badge at the top from `package-1-blue` to `package-2-blue`.

- [ ] **Step 3: Commit**

```bash
git add docs/plugins/python-developer.md README.md
git commit -m "docs: add python-developer plugin guide and README updates"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run full root check**

```bash
npm run check
```

Expected: typecheck passes, all tests pass (root + commit + python-developer), build succeeds

- [ ] **Step 2: Verify plugin bundle includes both packages**

```bash
ls packages/python-developer/dist/
ls packages/commit/dist/
```

Expected: both `dist/` directories contain `index.js`, `index.d.ts`, and skill/command assets

- [ ] **Step 3: Commit any final fixes**

If any issues found in Step 1, fix them and commit:

```bash
git add <files>
git commit -m "fix(python-developer): address final verification issues"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Agent registration (Task 6) — config hook sets `agent["python-developer"]`
- [x] Command registration (Task 6) — config hook sets `command.develop` with `agent: python-developer`
- [x] Custom tool (Tasks 5 + 6) — `load_python_skill` implemented and registered
- [x] Skill files (Task 2) — 10 files copied from av-marketplace
- [x] Build pipeline (Task 7) — `copy-skills.mjs` copies to `dist/skills/`
- [x] Root integration (Task 9) — imported in `src/index.ts`, scripts updated
- [x] Documentation (Task 10) — README + docs/plugins/python-developer.md
- [x] Tests (Tasks 5, 6, 8) — load-skill, plugin, build-output, package-smoke

**Placeholder scan:** None found. Every step has exact code, exact commands, expected output.

**Type consistency:** `loadPythonSkill(name: string): string` used consistently. `AppVerkPythonDeveloperPlugin: Plugin` matches commit plugin pattern.
