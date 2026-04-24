# Design: Global Skills Availability for All OpenCode Agents

**Date:** 2026-04-24  
**Status:** Draft  
**Scope:** Make AppVerk plugin skills accessible to all agents in OpenCode (built-in and custom), with mandatory activation rules.

---

## 1. Problem Statement

Currently, AppVerk plugin skills are loaded via dedicated tools (`load_python_skill`, `load_frontend_skill`) registered inside individual plugins (`python-developer`, `frontend-developer`). This means:

- **Other agents** (e.g. `security-auditor`, `code-quality-auditor`, built-in OpenCode agents) cannot discover or use these skills.
- Each new skill package requires a new tool, fragmenting the API.
- Agents have no instruction on **when** to load which skill — leading to inconsistent usage.

## 2. Goals

1. **Universal access:** All agents (built-in and custom) can discover and load AppVerk skills.
2. **Mandatory activation:** Agents must know **when** to load each skill and be instructed to do so.
3. **Single tool:** One unified tool replaces `load_python_skill` and `load_frontend_skill`.
4. **Minimal intrusion:** Reuse existing skill files and build pipeline where possible.

## 3. Non-Goals

- Replacing OpenCode's built-in skill system — we integrate with it.
- Modifying skill content / rules — only frontmatter and tooling change.
- Changing how skills are written — they remain Markdown files.

## 4. Architecture

### 4.1 High-Level Design

```
+---------------------------------------------------+
|              OpenCode Agent (any)                  |
|  (system prompt includes skill catalog + rules)   |
+----------------------+----------------------------+
                       |
         +-------------+-------------+
         |                           |
   load_appverk_skill()     built-in /user skills
         |                           |
+--------v--------+          +-------v--------+
| Skill Registry  |          |   OpenCode     |
|  (new package)  |          |   /skill API   |
+-----------------+          +----------------+
         |
   reads dist/skills/*.md
   from python-developer &
   frontend-developer
```

### 4.2 Components

| Component | Location | Responsibility |
|-----------|----------|----------------|
| **Skill Registry** | `packages/skill-registry/` | Scans skill folders, parses frontmatter, generates catalog, registers `load_appverk_skill` tool, injects system prompt via `experimental.chat.system.transform` |
| **Root Plugin** | `src/index.ts`, `src/index.js` | Aggregates all plugins (skill-registry + existing ones), merges tools/hooks/config |
| **Skill Files** | `packages/*/src/skills/*.md` | Source of truth; each gets `activation` field in frontmatter |
| **Developer Agents** | `packages/python-developer/src/agent-prompt.md`, `packages/frontend-developer/src/agent-prompt.md` | Updated to reference `load_appverk_skill` instead of old tools; skill tables removed (now in global system prompt) |

## 5. Skill Registration (Discovery)

OpenCode exposes `config.skills.paths: string[]` in the `Config` type. In the `config` hook of our root plugin (via `skill-registry`), we optionally append our skill directories:

```typescript
config.skills ??= { paths: [] }
config.skills.paths.push(
  path.resolve(__dirname, "../../packages/python-developer/dist/skills"),
  path.resolve(__dirname, "../../packages/frontend-developer/dist/skills")
)
```

This makes OpenCode's native `/skill` endpoint aware of our skills for ecosystem consistency. **However**, the primary mechanism for skill availability is **not** OpenCode's built-in skill system — it is our own `experimental.chat.system.transform` hook combined with the `load_appverk_skill` tool. We use this dual approach because:

1. OpenCode's native skill system handles discovery and listing, but does not guarantee that agents will know **when** to load skills or that they have access to a loading tool.
2. Our system prompt injection + custom tool ensures mandatory activation rules and universal accessibility across all agents.

## 6. Mandatory Activation via System Prompt Injection

### 6.1 Mechanism

We use the `experimental.chat.system.transform` hook. For **every chat session** (regardless of agent), we append a generated block to the system prompt.

### 6.2 Generated System Prompt Block

```
## AppVerk Skills — Mandatory Activation Rules

You have access to the `load_appverk_skill(name)` tool. Load skills BEFORE 
starting work. Do not guess — follow the rules below.

### Universal Rules (all tasks)
| When you are... | You MUST load... |
|---|---|
| Writing, modifying, or reviewing Python code | `python-coding-standards` |
| Writing, modifying, or reviewing TypeScript/React code | `frontend-coding-standards` |
| Writing tests, fixing bugs, refactoring Python code | `python-tdd-workflow` |
| Writing tests, fixing bugs, refactoring TypeScript/React code | `frontend-tdd-workflow` |
| Adding/removing/updating Python dependencies | `uv-package-manager` |
| Adding/removing/updating TypeScript dependencies | `pnpm-package-manager` |

### Python Stack Rules
| When the project uses... | You MUST load... |
|---|---|
| FastAPI | `fastapi-patterns` |
| SQLAlchemy | `sqlalchemy-patterns` |
| Pydantic | `pydantic-patterns` |
| asyncio / uvicorn | `async-python-patterns` |
| Django | `django-web-patterns` + `django-orm-patterns` |
| Celery | `celery-patterns` |

### TypeScript/React Stack Rules
| When the project uses... | You MUST load... |
|---|---|
| Tailwind CSS | `tailwind-patterns` |
| Zustand | `zustand-patterns` |
| TanStack Query | `tanstack-query-patterns` |
| React Hook Form | `form-patterns` |
| TanStack Router | `tanstack-router-patterns` |

### HARD-RULES
- BEFORE any coding, review, or refactoring: check the table above and load ALL applicable skills.
- If unsure whether a skill applies: load it — better to have context than miss constraints.
- After loading a skill, follow its HARD-RULES strictly.
- Do NOT begin implementation without loading applicable skills first.
```

### 6.3 Dynamic Catalog

The tables above are **generated at plugin initialization** by scanning the `dist/skills/` directories and reading frontmatter. If a new skill file is added (with proper frontmatter), it automatically appears in the system prompt after rebuild/restart.

## 7. Global Tool: `load_appverk_skill(name)`

Replaces `load_python_skill` and `load_frontend_skill`.

**Implementation:**
- Scans `packages/*/dist/skills/` for a file matching `<name>.md`
- Returns full Markdown content
- In-memory cache (Map) — same pattern as current tools
- If not found: returns error with available skill list

**Registration:**
- Registered by `skill-registry` package
- Merged into global tools by root plugin's `mergeTools`

## 8. Frontmatter Extension

Each skill file gets a new `activation` field. Additionally, skill names must be **globally unique** across all packages to avoid collisions in the unified `load_appverk_skill` tool.

### 8.1 New `activation` field

```markdown
---
name: python-tdd-workflow
description: Test-driven development workflow rules for Python
activation: "MUST load when writing new code, fixing bugs, or refactoring Python code"
---
```

The `activation` field is used when generating the dynamic catalog to provide human-readable guidance in the system prompt tables.

If `activation` is missing, the default is: `"Load when relevant to the task"`.

### 8.2 Unique naming rule

Because `load_appverk_skill` is a single global tool, skill names must not collide across packages. The following skills exist in both `python-developer` and `frontend-developer` and must be renamed:

| Old name (python-developer) | New unique name |
|---|---|
| `coding-standards` | `python-coding-standards` |
| `tdd-workflow` | `python-tdd-workflow` |

| Old name (frontend-developer) | New unique name |
|---|---|
| `coding-standards` | `frontend-coding-standards` |
| `tdd-workflow` | `frontend-tdd-workflow` |

All other skills already have unique names. The tool resolves skills by their `name` field in frontmatter, not by filename.

## 9. Changes to Existing Files

### 9.1 New Package: `packages/skill-registry/`

Files to create:
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- `src/index.ts` — main plugin export
- `src/skill-loader.ts` — tool implementation + file scanning
- `src/prompt-injector.ts` — `experimental.chat.system.transform` hook
- `tests/plugin.test.ts` — smoke test
- `tests/skill-loader.test.ts` — unit tests for loading/validation

### 9.2 Modified: `src/index.ts` and `src/index.js`

- Import `AppVerkSkillRegistryPlugin`
- Add to `defaultPluginFactories` array

### 9.3 Modified: `packages/python-developer/src/index.ts`

- Remove `load_python_skill` tool registration
- Remove `loadPythonSkill` import
- Update `agent-prompt.md` references

### 9.4 Modified: `packages/frontend-developer/src/index.ts`

- Remove `load_frontend_skill` tool registration
- Remove `loadFrontendSkill` import
- Update `agent-prompt.md` references

### 9.5 Modified: `packages/python-developer/src/agent-prompt.md`

- Remove the "Available Skills" table (now in global system prompt)
- Change all `load_python_skill(name)` references to `load_appverk_skill(name)`

### 9.6 Modified: `packages/frontend-developer/src/agent-prompt.md`

- Remove the "Available Skills" table (now in global system prompt)
- Change all `load_frontend_skill(name)` references to `load_appverk_skill(name)`

### 9.7 Modified: All skill files (`packages/*/src/skills/*.md`)

- Add `activation` field to frontmatter
- Rename `coding-standards` → `python-coding-standards` (in python-developer) and `coding-standards` → `frontend-coding-standards` (in frontend-developer)
- Rename `tdd-workflow` → `python-tdd-workflow` (in python-developer) and `tdd-workflow` → `frontend-tdd-workflow` (in frontend-developer)
- Update `description` fields to mention the target language/stack

## 10. Build & Packaging

| Step | Command | Notes |
|------|---------|-------|
| Build new package | `npm run build --workspace @appverk/opencode-skill-registry` | Standard `tsup` ESM + DTS |
| Copy assets | `copy-assets.mjs` in skill-registry | Copies nothing — skills live in other packages |
| Root build | `npm run build` | Now includes skill-registry workspace |
| Tests | `npm run test` | Includes new test suite |

## 11. Error Handling

| Scenario | Behavior |
|---|---|
| Skill file not found | Tool returns error: `Skill "x" not found. Available: a, b, c` |
| Skill missing frontmatter | Ignored during scan; warning logged |
| `activation` field missing | Uses default: `"Load when relevant to the task"` |
| Duplicate skill name across packages | Error at plugin init — prevent shadowing. All skill names must be globally unique (see §8.2). |
| `dist/skills/` folder missing | Silently ignored with warning (package not built yet) |

## 12. Testing Strategy

1. **Unit tests:**
   - `skill-loader.test.ts`: loading skill by name, cache behavior, error on unknown skill, duplicate detection
   - `prompt-injector.test.ts`: system prompt generation, frontmatter parsing

2. **Integration tests:**
   - `root-plugin.test.ts`: verify `load_appverk_skill` is present in merged tools
   - Verify `experimental.chat.system.transform` is registered

3. **Manual verification:**
   - Start OpenCode with updated plugin
   - Ask any built-in agent: "What AppVerk skills are available?"
   - Agent should list skills and know how to load them

## 13. Rollout Plan

1. Create `packages/skill-registry/` with core logic
2. Update frontmatter in all skill files
3. Remove old tools from python-developer and frontend-developer
4. Update agent prompts
5. Register skill-registry in root entrypoints
6. Build and test
7. Bump version in all `package.json` files
8. Create git tag

## 14. Backward Compatibility

- Old tools (`load_python_skill`, `load_frontend_skill`) are **removed** — they were internal to our plugins and not documented for external use.
- All our internal agents are updated in the same commit.
- Users consuming our plugin bundle get the new tool automatically via root plugin.

## 15. Open Questions

None at this time. All critical decisions have been made during brainstorming.
