# QA Plugin Design — OpenCode Migration

**Date:** 2026-04-29
**Scope:** Migrate the `qa` plugin from the Claude Code marketplace (`av-marketplace`) to the OpenCode plugin bundle (`av-opencode-plugins`).
**Status:** Approved for implementation

---

## 1. Overview

The QA plugin provides automated quality-assurance testing workflows. It analyzes code changes, generates detailed test plans with FE and BE scenarios, executes them using Playwright (browser) and HTTP/DB tools, and produces reports with `QA-XXX` issue IDs compatible with the code-review plugin.

### Marketplace Origin
- **Source:** `av-marketplace/plugins/qa`
- **Version:** 1.0.0
- **Commands:** `/qa:create-plan`, `/qa:run`
- **Agents:** `fe-tester`, `be-tester`
- **Skills:** `test-plan-format`, `report-format`, `fe-testing`, `be-testing`

### Target Platform
- **Destination:** `av-opencode-plugins/packages/qa`
- **Format:** TypeScript ESM package built with `tsup`
- **Registration:** Manual (like `code-review`), not via `createSkillPlugin`

---

## 2. Goals

1. Preserve all marketplace functionality (plan generation, test execution, reporting).
2. Adapt Claude-Code-specific constructs (`TaskCreate/TaskUpdate`, `Skill`, `AskUserQuestion`) to OpenCode equivalents (`todowrite`, `skill`, `question`).
3. Support both MCP Playwright (if user-installed) and bash `playwright` CLI fallback.
4. Maintain `QA-XXX` issue ID compatibility with the `code-review` plugin.
5. Follow existing monorepo conventions (tests import from `dist/`, `tsup` build, committed `dist/`).

---

## 3. Architecture

### 3.1 Plugin Registration (Manual)

`packages/qa/src/index.ts` registers agents and commands directly into the OpenCode `Config` object (same pattern as `code-review`):

```typescript
export const AppVerkQAPlugin: Plugin = async () => ({
  config: async (config) => {
    // Agents
    config.agent["qa-fe-tester"] = {
      description: "...",
      get prompt() { return loadAgentPrompt("fe-tester"); },
      mode: "subagent",
    };
    config.agent["qa-be-tester"] = {
      description: "...",
      get prompt() { return loadAgentPrompt("be-tester"); },
      mode: "subagent",
    };

    // Commands
    config.command["create-qa-plan"] = {
      description: "...",
      get template() { return loadCommandTemplate("create-qa-plan"); },
    };
    config.command["run-qa"] = {
      description: "...",
      get template() { return loadCommandTemplate("run-qa"); },
    };
  },
});
```

### 3.2 Why Not `createSkillPlugin`?

`createSkillPlugin` supports exactly **one agent + one command + optional skill loader**. The QA plugin needs **two agents + two commands**, so manual registration is required.

### 3.3 Skill Loading

Skills are loaded globally by the `skill-registry` plugin. QA skills will be registered by adding the QA `dist/skills/` path to `skill-registry/src/index.ts`:

```typescript
const skillDirectories = [
  // ...existing paths
  path.resolve(moduleDirectory, "../../qa/dist/skills"),
];
```

Skills are then invoked in markdown templates via the `skill` tool:

```markdown
Load the test-plan-format skill:

```
skill(name: "test-plan-format")
```
```

---

## 4. Package Structure

```
packages/qa/
├── package.json              # Workspace package manifest
├── tsconfig.json             # Extends tsconfig.base.json
├── vitest.config.ts          # Test config (globals mode)
├── scripts/
│   └── copy-assets.mjs       # Copies markdown assets to dist/
├── src/
│   ├── index.ts              # Plugin factory — manual registration
│   ├── commands/
│   │   ├── create-qa-plan.md # Command template: /create-qa-plan
│   │   └── run-qa.md         # Command template: /run-qa
│   ├── agents/
│   │   ├── fe-tester.md      # Subagent prompt: qa-fe-tester
│   │   └── be-tester.md      # Subagent prompt: qa-be-tester
│   └── skills/
│       ├── test-plan-format/
│       │   └── SKILL.md
│       ├── report-format/
│       │   └── SKILL.md
│       ├── fe-testing/
│       │   └── SKILL.md
│       └── be-testing/
│           └── SKILL.md
└── tests/
    └── qa-plugin.test.ts     # Smoke tests: plugin factory, template loading
```

---

## 5. Commands

### 5.1 `/create-qa-plan [PR | branch | commits]`

**Purpose:** Analyze code changes and generate a structured test plan.

**Workflow (adapted for OpenCode):**

1. **Progress tracking** — Create 6 todos via `todowrite`:
   - Resolve diff source
   - Analyze changes
   - Gather context
   - Detect available tools
   - Generate test plan
   - Save test plan

2. **Resolve diff source** — Parse `$ARGUMENTS`:
   - (empty) → check open PR via `gh pr view`, fallback to branch diff
   - `#123` / `PR #123` → `gh pr diff 123`
   - `feature/xyz` → `git diff main...feature/xyz`
   - `last N commits` → `git diff HEAD~N...HEAD`
   - `staged` → `git diff --staged`

3. **Analyze changes** — Classify changed files as FE or BE:
   - **FE:** `.tsx`, `.jsx`, `.vue`, `.css`, paths with `components/`, `pages/`, etc.
   - **BE:** `.py`, `.php`, `.go`, paths with `api/`, `controllers/`, `models/`, etc.
   - **Ambiguous:** `.ts`, `.js` — inspect imports and path context.

4. **Gather context** — Read related files (routers, serializers, parent components, stores), check `docs/`, OpenAPI specs, existing tests.

5. **Detect available tools** (bash only — no MCP probing at plan time):
   ```bash
   command -v curl && echo "curl: available" || echo "curl: unavailable"
   command -v psql && echo "psql: available" || echo "psql: unavailable"
   command -v playwright && echo "playwright: available" || echo "playwright: unavailable"
   ```

6. **Generate test plan** — Load `test-plan-format` skill, then generate:
   - Source section
   - Changes summary
   - Detected tools
   - FE Test Scenarios (if FE changes)
   - BE Test Scenarios (if BE changes)
   - Each scenario must have >=2 edge cases

7. **Save test plan** — Write to `docs/testing/plans/YYYY-MM-DD-<topic>-test-plan.md`

8. **Propose next step** — Display path and suggest `/run-qa` or `/run-qa <path>`.

### 5.2 `/run-qa [path-to-plan]`

**Purpose:** Execute a test plan and produce a report.

**Workflow:**

1. **Progress tracking** — Create 6 todos via `todowrite`:
   - Validate environment
   - Execute FE tests
   - Execute BE tests
   - Collect results
   - Generate report
   - Save report

2. **Load plan** — Read the test plan file (default: most recent in `docs/testing/plans/`).

3. **Validate environment** — Check tool availability at execution time:
   - Playwright (MCP or bash) for FE tests
   - `curl` / `httpie` for BE tests
   - DB clients (`psql`, `sqlite3`, `mysql`) for DB checks

4. **Execute FE tests** (sequential, if plan has FE scenarios):
   ```
   task(
     subagent_type: "qa-fe-tester",
     description: "Execute FE test scenarios",
     prompt: "Base URL: ...\nScenarios: ..."
   )
   ```

5. **Execute BE tests** (sequential, if plan has BE scenarios):
   ```
   task(
     subagent_type: "qa-be-tester",
     description: "Execute BE test scenarios",
     prompt: "Base URL: ...\nScenarios: ..."
   )
   ```

6. **Collect results** — Combine FE and BE results into unified structure.

7. **Generate report** — Load `report-format` skill, assign `QA-XXX` IDs to failures, calculate severity.

8. **Save report** — Write to `docs/testing/reports/YYYY-MM-DD-<topic>-report.md`.

9. **Display summary** — Total/Pass/Fail/Skip counts, top 3 issues with QA-XXX IDs.

---

## 6. Agents

### 6.1 `qa-fe-tester` (subagent)

**Purpose:** Execute FE test scenarios using Playwright.

**Playwright Strategy:**
1. **Try bash playwright first:** `command -v playwright`
2. **If available:** Use `playwright screenshot`, `playwright open`, and `browser_evaluate`-like patterns via bash.
3. **If unavailable:** Try MCP Playwright tools (if present in the session). Do not hardcode tool names — attempt generic browser navigation and fall back gracefully.
4. **If neither works:** Mark all FE scenarios as SKIP.

**Allowed tools:** `Read`, `Write`, `Bash(playwright:*)`, `Bash(mkdir:*)`, optionally MCP browser tools.

### 6.2 `qa-be-tester` (subagent)

**Purpose:** Execute BE test scenarios via HTTP and DB.

**Tool priority:**
1. HTTP: `curl` (preferred) → `httpie` → `wget`
2. DB: MCP servers (preferred) → CLI clients (`psql`, `sqlite3`, `mysql`) → SKIP
3. JSON parsing: `jq` (preferred) → `grep`

**Allowed tools:** `Read`, `Write`, `Bash(curl:*)`, `Bash(httpie:*)`, `Bash(psql:*)`, `Bash(sqlite3:*)`, `Bash(jq:*)`, `Bash(mkdir:*)`, optionally MCP DB tools.

---

## 7. Skills

All skills are adapted from the marketplace with OpenCode-specific tool names.

### 7.1 `test-plan-format`
Structure, naming conventions, edge-case rules, and file-saving conventions for QA test plans.

### 7.2 `report-format`
Report structure with `QA-XXX` issue IDs, severity levels, and compatibility notes with `code-review`.

### 7.3 `fe-testing`
Playwright patterns for navigation, interaction, assertions, screenshots. Includes bash-first fallback instructions.

### 7.4 `be-testing`
API request construction, response verification, DB state checks, error handling patterns.

---

## 8. Playwright Strategy (Detailed)

| Priority | Method | Detection | Usage |
|----------|--------|-----------|-------|
| 1 | Bash `playwright` CLI | `command -v playwright` | `playwright screenshot <url>`, `playwright open <url>` + JS eval via node |
| 2 | MCP Playwright | Try `browser_navigate` | If available, use full MCP toolset |
| 3 | None | Both fail | All FE scenarios = SKIP |

**Rationale:** OpenCode does not document MCP tool naming conventions. A bash-first approach is deterministic and does not depend on undocumented MCP behavior.

---

## 9. Root Integration

Files that must be updated when adding the QA package:

| File | Change |
|------|--------|
| `src/index.ts` | Import and register `AppVerkQAPlugin` |
| `src/index.js` | Mirror the TS import and registration |
| `package.json` (root) | Add `packages/qa/dist/` to `files` array |
| `package.json` (root scripts) | Add `npm run build --workspace @appverk/opencode-qa` etc. |
| `.gitignore` | Add `!packages/qa/dist/` and `!packages/qa/dist/**` |
| `packages/skill-registry/src/index.ts` | Add `../../qa/dist/skills` to `skillDirectories` |
| `README.md` | Update plugin count, add QA section |
| `AGENTS.md` | Update plugin counts and structure table |
| `docs/plugins/qa.md` | Create per-plugin documentation |

---

## 10. Testing

### 10.1 Package Tests (`packages/qa/tests/qa-plugin.test.ts`)

```typescript
import { AppVerkQAPlugin } from "../dist/index.js"

test("exports a plugin factory", () => {
  expect(typeof AppVerkQAPlugin).toBe("function")
})

test("registers all agents and commands", async () => {
  const hooks = await AppVerkQAPlugin(...)
  const config = { agent: {}, command: {} }
  await hooks.config!(config)

  expect(config.agent).toHaveProperty("qa-fe-tester")
  expect(config.agent).toHaveProperty("qa-be-tester")
  expect(config.command).toHaveProperty("create-qa-plan")
  expect(config.command).toHaveProperty("run-qa")
})

test("agent prompts load without error", async () => {
  // Verify lazy loading works for all 2 agents
})

test("command templates load without error", async () => {
  // Verify lazy loading works for all 2 commands
})
```

### 10.2 Root Tests
- Update `tests/root-plugin.test.ts` to include QA in packaging assertions.

---

## 11. Differences from Marketplace

| Aspect | Marketplace (Claude Code) | OpenCode |
|--------|---------------------------|----------|
| Commands | `/qa:create-plan`, `/qa:run` | `/create-qa-plan`, `/run-qa` |
| Task progress | `TaskCreate/TaskUpdate/TaskList` | `todowrite` |
| Subagent launch | `Task(subagent_type, run_in_background)` | `task` tool (sequential) |
| Skill invocation | `Skill(skill: "qa:name")` | `skill(name: "name")` |
| User questions | `AskUserQuestion` | `question` tool |
| Playwright | MCP-only (`mcp__plugin_playwright_*`) | Bash-first + MCP fallback |
| FE/BE parallelism | Parallel | Sequential (MVP) |

---

## 12. Future Improvements

1. **Parallel FE/BE execution** — Investigate OpenCode `task` tool async capabilities or plugin-level `Promise.all`.
2. **MCP auto-detection** — Add runtime probing for MCP Playwright tool names once documented.
3. **Playwright test codegen** — Generate actual Playwright test files (`*.spec.ts`) from test plans.
4. **Integration with `/fix`** — Enable `/fix QA-001` to resolve QA issues using the code-review fix pipeline.
5. **CI/CD integration** — Add `/qa:ci` command that runs plans in headless mode for CI pipelines.

---

## 13. Acceptance Criteria

- [ ] `npm run build` succeeds for the `qa` workspace.
- [ ] `npm run test` passes for the `qa` workspace.
- [ ] `npm run check` passes at root (typecheck + test + build).
- [ ] Root packaging test (`tests/root-plugin.test.ts`) includes QA.
- [ ] `dist/` directory is committed for `packages/qa/`.
- [ ] Commands `/create-qa-plan` and `/run-qa` appear in OpenCode.
- [ ] Agents `qa-fe-tester` and `qa-be-tester` are visible as subagents.
- [ ] All 4 skills are loadable via the global `skill` tool.
