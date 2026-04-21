# Python Developer Plugin Migration — Design Spec

**Date:** 2026-04-21
**Topic:** python-developer
**Source:** Claude Code plugin `av-marketplace/plugins/python-developer` → OpenCode plugin `@appverk/opencode-python-developer`
**Approach:** B + Hybrid (modular skills loaded via custom tool)

---

## 1. Goal

Migrate the `python-developer` plugin from the Claude Code `av-marketplace` repository to the OpenCode plugin repository (`av-opencode-plugins`). Preserve both the **command** (`/develop`) and **agent** (`python-developer`) surfaces, while adapting the Claude-specific `Skill tool` mechanism to OpenCode's plugin model.

---

## 2. Architecture Overview

The plugin registers three elements through its `config` hook:

| Element | OpenCode Mechanism | Purpose |
|---|---|---|
| `agent.python-developer` | `config.agent` | Core persona with Python/TDD expertise. System prompt lists available skills and instructs the agent when to call `load_python_skill`. |
| `command.develop` | `config.command` | Prompt template with `agent: python-developer` frontmatter. Orchestrates stack detection → core skill loading → conditional skill loading → TDD cycle. |
| `tool.load_python_skill` | `tool` (custom tool) | AI-callable tool returning the markdown content of a named skill file bundled with the plugin. |

**Skill files** (10 files from `av-marketplace`) are bundled as static assets in `dist/skills/` and loaded at runtime by the tool.

---

## 3. User Flow

```
User types: /develop napraw bug w views.py
        ↓
OpenCode reads commands/develop.md
        ↓
Frontmatter: agent: python-developer → OpenCode uses that agent
        ↓
Agent receives combined prompt:
        [core system prompt]
        +
        [command template with $ARGUMENTS]
        ↓
Agent Step 1: Read pyproject.toml, grep imports → detect stack
        ↓
Agent Step 2: Calls tool load_python_skill("coding-standards")
        ↓
Tool reads dist/skills/coding-standards.md → returns markdown content
        ↓
OpenCode injects skill content into agent context
        ↓
Agent Step 3: Conditionally calls load_python_skill for detected frameworks
        ↓
Skills inject into context one by one
        ↓
Agent Step 4: Executes TDD cycle per loaded tdd-workflow skill
        ↓
Agent Step 5: Runs quality gates, generates developer report
```

---

## 4. Directory Structure

```
packages/python-developer/
├── package.json                    # @appverk/opencode-python-developer
├── tsconfig.json                   # extends base tsconfig
├── vitest.config.ts                # workspace test config
├── src/
│   ├── index.ts                    # plugin entry point; exports config hook + tool
│   ├── agent-prompt.md             # core system prompt for agent.python-developer
│   ├── commands/
│   │   └── develop.md              # /develop command prompt template
│   ├── skills/                     # 10 migrated skill markdown files
│   │   ├── coding-standards.md
│   │   ├── tdd-workflow.md
│   │   ├── fastapi-patterns.md
│   │   ├── sqlalchemy-patterns.md
│   │   ├── pydantic-patterns.md
│   │   ├── async-python-patterns.md
│   │   ├── uv-package-manager.md
│   │   ├── django-web-patterns.md
│   │   ├── django-orm-patterns.md
│   │   └── celery-patterns.md
│   └── tools/
│       └── load-skill.ts           # loadPythonSkill(name) implementation
├── tests/
│   ├── plugin.test.ts              # config hook registration tests
│   ├── load-skill.test.ts          # tool happy path + error cases
│   ├── build-output.test.ts        # dist/skills/ presence validation
│   └── package-smoke.test.ts       # package.json manifest assertions
├── scripts/
│   └── copy-skills.mjs             # copies src/skills/*.md → dist/skills/
└── dist/                           # tsup build output + copied skills
```

---

## 5. Component Details

### 5.1 Plugin Entry Point (`src/index.ts`)

Exports `AppVerkPythonDeveloperPlugin: Plugin`.

In its `config` hook it sets:

- `config.agent["python-developer"]` with:
  - `description`: "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns."
  - `prompt`: runtime-loaded content of `agent-prompt.md`
  - `tools`: all default tools enabled (read, edit, write, grep, glob, bash, etc.) plus custom `load_python_skill`
- `config.command["develop"]` with:
  - `description`: "Python development workflow enforcing coding standards, TDD, and stack-specific patterns."
  - `template`: runtime-loaded content of `commands/develop.md`
  - `agent`: `"python-developer"`

In its `tool` hook it registers:

- `load_python_skill`: `tool({ description, args: { name }, execute })`

### 5.2 Custom Tool (`src/tools/load-skill.ts`)

```typescript
function loadPythonSkill(name: string): string
```

Resolves the skill file path relative to `__dirname`:
- `dist/skills/{name}.md` (packaged)
- `src/skills/{name}.md` (development fallback)

Validates `existsSync`; throws descriptive `Error` with available skill list if missing.

### 5.3 Command Template (`src/commands/develop.md`)

Frontmatter:
```yaml
---
description: Python development workflow enforcing coding standards, TDD, and stack-specific patterns.
agent: python-developer
---
```

Body contains the orchestration prompt (stack detection, skill loading via tool calls, TDD cycle, quality gates). Adapted from the original Claude Code `commands/develop.md` with `Skill tool` instructions replaced by `load_python_skill` tool calls.

### 5.4 Agent Prompt (`src/agent-prompt.md`)

Two sections:

1. **Core persona** — identity, TDD-first mandate, workflow steps.
2. **Skill catalog** — table of all 10 skills with descriptions and load conditions (e.g., "`fastapi-patterns` — load when FastAPI detected in pyproject.toml or imports").

### 5.5 Skills (`src/skills/*.md`)

Direct migration of the 10 `SKILL.md` files from `av-marketplace/plugins/python-developer/skills/`. No content changes except removing Claude-specific directives (e.g., "Use the Skill tool with: skill: ...") if present.

---

## 6. Build Pipeline

`package.json` scripts:

```json
{
  "build": "tsup src/index.ts --format esm --dts && node ./scripts/copy-skills.mjs",
  "test": "npm run build && vitest run --config vitest.config.ts",
  "typecheck": "tsc -p tsconfig.json --noEmit"
}
```

`scripts/copy-skills.mjs`:
- Creates `dist/skills/` if missing.
- Copies all 10 `.md` files from `src/skills/` to `dist/skills/`.

The tool implementation resolves paths relative to `__dirname`, falling back from `dist/skills/` to `src/skills/` for development.

---

## 7. Error Handling

| Scenario | Behavior |
|---|---|
| `load_python_skill("nonexistent")` | Tool throws `Error` listing all 10 available skill names. Agent sees the error and can correct the call. |
| Skill file missing in runtime | Tool checks `existsSync`; throws hard error with file path. Build-output test prevents this in releases. |
| `/develop` without arguments | Command template uses `$ARGUMENTS`; prompt instructs the agent to analyze the project and suggest improvements if empty. |
| Stack detection finds no frameworks | Agent loads only core skills (`coding-standards`, `tdd-workflow`) and asks the user for clarification. |
| Quality gate fails | Agent iterates (max 3 attempts per gate) as per loaded `tdd-workflow` skill rules. |

---

## 8. Testing

| Test file | Coverage |
|---|---|
| `plugin.test.ts` | Config hook registers agent `python-developer` and command `develop`. Hook populates correct fields. |
| `load-skill.test.ts` | Tool returns exact markdown content for each of the 10 skills. Tool throws descriptive error for invalid name. |
| `build-output.test.ts` | After `npm run build`, `dist/skills/` contains exactly 10 `.md` files with expected names. |
| `package-smoke.test.ts` | `package.json` has correct `name` (`@appverk/opencode-python-developer`), `main`, `types`, `exports`. |

---

## 9. Root Integration

After `python-developer` package is added:

- `src/index.ts` (root): import `AppVerkPythonDeveloperPlugin` and append to `defaultPluginFactories`.
- Root `package.json`:
  - Add workspace reference to `packages/python-developer`.
  - Update `scripts.build`, `scripts.test`, `scripts.typecheck`, `scripts.check` to include the new workspace.
- Root `README.md`: add package row and installation example.
- `docs/plugins/python-developer.md`: package-level behavior and usage guide.

---

## 10. Migration Checklist (from av-marketplace)

- [ ] Copy `agents/developer.md` → adapt to `src/agent-prompt.md` (remove Claude-specific subagent/TaskCreate/TaskUpdate refs)
- [ ] Copy `commands/develop.md` → adapt to `src/commands/develop.md` (replace `Skill tool` instructions with `load_python_skill` tool calls)
- [ ] Copy all 10 `skills/*/SKILL.md` → `src/skills/{name}.md` (strip Claude-specific loading instructions)
- [ ] Implement `src/index.ts` with config hook + tool registration
- [ ] Implement `src/tools/load-skill.ts`
- [ ] Add `package.json`, `tsconfig.json`, `vitest.config.ts`
- [ ] Add `scripts/copy-skills.mjs`
- [ ] Write tests (plugin, load-skill, build-output, package-smoke)
- [ ] Wire into root package (index.ts, package.json scripts, README, docs)

---

## 11. Design Decisions

1. **Why custom tool instead of inline skills?**
   - Preserves modularity. Skills are separate files in source, loaded on demand. Easier to maintain and extend.

2. **Why 10 separate skill files instead of one monolith?**
   - Matches original Claude Code structure. Allows selective loading per detected stack. Keeps individual skill files focused.

3. **Why `agent: python-developer` in command frontmatter instead of subagent?**
   - OpenCode does not have Claude-style auto-subagent dispatch. Explicit `agent` field in command is the idiomatic way to route to a specific persona.

4. **Why not auto-detect Python and auto-switch agent?**
   - OpenCode SDK does not support automatic agent switching based on file types or message content. The `chat.message` hook could show a nudge, but that is intrusive. Manual `/develop` command is the cleanest UX.

5. **Why keep both command and agent?**
   - The original plugin had both: `commands/develop.md` for `/develop` and `agents/developer.md` for subagent invocation. In OpenCode, the agent can also be invoked directly (`opencode agent python-developer ...`) or via command frontmatter. Both surfaces provide flexibility.

---

## 12. Scope

This spec covers **only** the `python-developer` plugin migration. It does **not** include:
- Migration of other marketplace plugins (frontend-developer, php-developer, qa, etc.)
- Changes to existing `commit` plugin
- New features not present in the original Claude Code plugin

---

*Spec written: 2026-04-21*
