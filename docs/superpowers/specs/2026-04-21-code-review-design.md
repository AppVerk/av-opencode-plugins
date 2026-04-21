# Design: Code Review Plugin MVP for OpenCode

**Date:** 2026-04-21
**Scope:** MVP — `/review` command only, with python-developer integration
**Status:** Draft

---

## 1. Overview

Migrate the `code-review` plugin from the Claude Code marketplace (`av-marketplace/plugins/code-review`) to the OpenCode plugin system. The MVP covers only the `/review` command with two background agents (security-auditor, code-quality-auditor), python-developer skill integration, and report generation. Future versions will add `/fix`, `/fix-report`, `/analyze-feedback`, cross-verifier, challenger, and documentation-auditor.

---

## 2. Goals & Non-Goals

### Goals (MVP)
- Provide `/review` command for comprehensive code review
- Launch security-auditor and code-quality-auditor agents in parallel
- Aggregate findings, assign IDs, format report
- Optional save to `docs/reviews/YYYY-MM-DD-<branch>.md`
- Integrate python-developer skills (stack detection + framework-specific checks)

### Non-Goals (v2+)
- `/fix` command
- `/fix-report` command
- `/analyze-feedback` command
- Cross-Verifier and Challenger verification agents
- Documentation Auditor
- Frontend-developer integration

---

## 3. Architecture

### 3.1 Package Structure

```
packages/code-review/
├── package.json                 # @appverk/opencode-code-review
├── tsconfig.json               # Extends tsconfig.base.json
├── vitest.config.ts
├── src/
│   ├── index.ts                # Plugin factory
│   ├── commands/
│   │   └── review.md           # /review command template
│   └── agents/
│       ├── security-auditor.md # Security auditor agent prompt
│       └── code-quality-auditor.md # Code quality auditor agent prompt
├── tests/
│   ├── plugin.test.ts          # Config registration tests
│   ├── package-smoke.test.ts # Import resolution test
│   └── build-output.test.ts  # dist/ contents verification
└── scripts/
    └── copy-assets.mjs         # Post-build: copy .md files to dist/
```

### 3.2 Root Registration

`src/index.ts` and `src/index.js` (both must be updated):
- Import `AppVerkCodeReviewPlugin` from `../packages/code-review/dist/index.js`
- Add to `defaultPluginFactories` array
- Register in plugin merger (already handled by existing `createAppVerkPlugins`)

`package.json` root:
- Add `packages/code-review/dist` to `files` array
- Add workspace script entries for build/test/typecheck

### 3.3 Plugin Factory (`src/index.ts`)

```typescript
export const AppVerkCodeReviewPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      // Register agents
      config.agent = config.agent ?? {}
      config.agent["security-auditor"] = {
        description: "Expert security auditor...",
        prompt: loadAgentPrompt("security-auditor"),
      }
      config.agent["code-quality-auditor"] = {
        description: "Expert code quality auditor...",
        prompt: loadAgentPrompt("code-quality-auditor"),
      }

      // Register command
      config.command = config.command ?? {}
      config.command.review = {
        description: "Perform comprehensive code review",
        template: loadCommandTemplate("review"),
      }
    },
    // No custom tools for MVP
  }
}
```

---

## 4. /review Command Workflow

### 4.1 Input

`$ARGUMENTS` — review description (all text is the description)

### 4.2 Step-by-Step Flow

```
Step 1: Stack Detection
  - Detect Python project markers (pyproject.toml, requirements.txt, *.py)
  - If Python: load relevant python-developer skills via load_python_skill tool
  - Store skills_to_load list for agent prompts

Step 2: Launch Agents (parallel)
  - task(subagent_type: "general", prompt: "You are security-auditor... [full prompt with skills_to_load]")
  - task(subagent_type: "general", prompt: "You are code-quality-auditor... [full prompt with skills_to_load]")
  - Both launched in a single response (independent calls)

Step 3: Collect Results
  - task() returns output directly — no AgentOutputTool needed
  - Parse JSON findings from each agent

Step 4: Assign Issue IDs
  - Counters: sec_count=0, perf_count=0, arch_count=0, maint_count=0, doc_count=0
  - Prefix map: Security→SEC, Performance→PERF, Architecture→ARCH, Maintainability→MAINT, Documentation→DOC
  - Format: {PREFIX}-{NNN} (zero-padded, e.g. SEC-001)

Step 5: Format Final Report
  - Executive Summary (issue counts by severity)
  - Security Findings
  - Quality/Architecture Findings
  - Performance Analysis (from /review itself)
  - Maintainability Analysis (from /review itself)
  - Each issue: [SEVERITY] {ID}: Title, Location, Category, OWASP/CWE, Problem, Impact, Remediation

Step 6: Ask to Save
  - question tool: "Save this review to a file?" (Yes/No)
  - If Yes: build path docs/reviews/YYYY-MM-DD-<branch-slug>.md
  - Write report via Write tool

Step 7: Post-Review Guidance
  - If issues found: suggest `/fix <ID>` and `/fix-report <path>`
  - If no issues: "Review complete. No issues found."
```

### 4.3 OpenCode Adaptations vs Original Claude Code Plugin

| Original (Claude) | MVP (OpenCode) | Rationale |
|---|---|---|
| TaskCreate / TaskUpdate (8 tasks) | `todowrite` with 3-4 lightweight tasks | OpenCode uses native todo tracking |
| Cross-Verifier + Challenger | **Excluded from MVP** | Too complex for initial version |
| Documentation Auditor | **Excluded from MVP** | Conditional agent, adds complexity |
| `run_in_background: true` + AgentOutputTool | Parallel `task()` calls, results returned directly | OpenCode task returns output inline |
| `subagent_type: "code-review:security-auditor"` | `subagent_type: "general"` with full prompt | OpenCode agents are not namespaced |
| `AskUserQuestion` | `question` tool | OpenCode native question tool |
| `developer-plugins-integration` skill | Inline stack detection + `load_python_skill` | No separate skill needed for MVP |

---

## 5. Agent Prompts

### 5.1 security-auditor

Based on original marketplace plugin with OpenCode adaptations:

**Core workflow (unchanged):**
1. Secret Scanning (mandatory) — check for API keys, passwords, tokens, connection strings
2. SAST Analysis (mandatory) — run semgrep, bandit (Python), OWASP rules
3. Dependency Scanning (mandatory) — check for CVEs via pip-audit, npm audit, safety
4. AI Threat Modeling — business logic flaws, auth bypass, IDOR, data flow analysis

**Framework-specific checks (if python-developer skills loaded):**

- `fastapi-patterns`: BaseHTTPMiddleware memory leak, exception mapping, dependency injection risks, lifespan management
- `sqlalchemy-patterns`: N+1 query prevention, lazy loading in async, raw SQL avoidance
- `pydantic-patterns`: SecretStr usage, validator exception exposure, from_attributes
- `django-web-patterns`: CSRF middleware, permission decorators, raw SQL parameterization, SECRET_KEY hardcoding
- `django-orm-patterns`: select_related/prefetch_related, QuerySet validation before delete/update
- `celery-patterns`: Task result sensitivity, bind=True retry safety

**Report format:** JSON array of findings with fields: `severity`, `category`, `owasp`, `cwe`, `cvss`, `title`, `file`, `line`, `description`, `exploit_scenario`, `remediation`, `code_example`

### 5.2 code-quality-auditor

Based on original marketplace plugin with OpenCode adaptations:

**Core workflow (unchanged):**
1. Standards Discovery (mandatory) — read CONTRIBUTING.md, CODING_STANDARDS.md, README.md
2. Linter Integration (mandatory) — run ruff, mypy, eslint, tsc with project configs
3. Architecture Analysis (mandatory) — SOLID, DDD, Clean Architecture, anti-patterns
4. AI Design Review — cohesion, coupling, abstraction levels, error handling, testability

**Framework-specific checks (if python-developer skills loaded):**

- `coding-standards`: No relative imports, X \| None, type hints, raise...from, pathlib
- `tdd-workflow`: Fakes vs mocks, coverage targets, factory fixtures
- `fastapi-patterns`: APIRouter, Annotated[T, Depends], exception mapping, no BaseHTTPMiddleware
- `sqlalchemy-patterns`: Mapped[T], eager loading, Repository + UoW, no lazy loading in async
- `pydantic-patterns`: frozen=True, from_attributes, SecretStr
- `django-web-patterns`: Views delegate to services, explicit serializer fields, custom permissions, URL routing
- `django-orm-patterns`: Domain logic in models, select_related/prefetch_related, no N+1, migration separation
- `celery-patterns`: Idempotent tasks, pass IDs, retry backoff, no synchronous task calls

**Report format:** JSON array of findings with fields: `severity`, `category`, `principle`, `title`, `file`, `line`, `end_line`, `metrics`, `description`, `impact`, `remediation`, `code_example`, `effort`

---

## 6. Report Format

### 6.1 Issue Template

```markdown
### [SEVERITY] {ID}: Title of Issue

**ID:** {ID}
**Location:** `path/to/file.py:42`
**Category:** Security | Performance | Architecture | Maintainability | Documentation
**OWASP:** A05:2025 (if applicable)
**CWE:** CWE-89 (if applicable)
**Effort:** trivial | easy | medium | hard

**Problem:**
Brief description.

**Impact:**
What could happen if unfixed.

**Remediation:**
```python
# Before (vulnerable)
...

# After (secure)
...
```
```

### 6.2 ID Assignment Algorithm

```
Initialize counters:
  sec_count = 0, perf_count = 0, arch_count = 0, maint_count = 0, doc_count = 0

For each issue in order of appearance:
  Map category to prefix:
    Security → SEC, increment sec_count
    Performance → PERF, increment perf_count
    Architecture → ARCH, increment arch_count
    Maintainability → MAINT, increment maint_count
    Documentation → DOC, increment doc_count
  Format ID: {PREFIX}-{NNN} (zero-padded 3-digit)
  Update heading: ### [SEVERITY] {ID}: Title
  Add **ID:** {ID} field after heading
```

---

## 7. Stack Detection & python-developer Integration

### 7.1 Detection Logic (in /review command)

```
1. Check pyproject.toml, requirements.txt, setup.py, or **/*.py presence
2. If Python detected:
   a. Load coding-standards skill: load_python_skill("coding-standards")
   b. Load tdd-workflow skill: load_python_skill("tdd-workflow")
   c. Check pyproject.toml deps for:
      - fastapi → load_python_skill("fastapi-patterns")
      - sqlalchemy → load_python_skill("sqlalchemy-patterns")
      - pydantic → load_python_skill("pydantic-patterns")
      - django/djangorestframework → load_python_skill("django-web-patterns"), load_python_skill("django-orm-patterns")
      - celery → load_python_skill("celery-patterns")
      - asyncio/uvicorn/anyio → load_python_skill("async-python-patterns")
      - uv → load_python_skill("uv-package-manager")
   d. Store loaded skill names in skills_to_load list
3. Pass skills_to_load to both agent prompts
```

### 7.2 Graceful Degradation

- If `load_python_skill` tool unavailable → proceed without framework-specific checks
- If no Python detected → proceed with language-agnostic security/quality analysis only
- Skills that fail to load are skipped, others proceed normally

---

## 8. Testing Strategy

### 8.1 Unit/Smoke Tests

**`tests/package-smoke.test.ts`**:
- `import("@appverk/opencode-code-review")` resolves without error
- Exports `AppVerkCodeReviewPlugin` as default

**`tests/plugin.test.ts`**:
- Call `AppVerkCodeReviewPlugin()` and verify returned object has `config` function
- Verify `config` registers `review` command with description and template
- Verify `config` registers `security-auditor` and `code-quality-auditor` agents with descriptions and prompts

**`tests/build-output.test.ts`**:
- `dist/commands/review.md` exists and is non-empty
- `dist/agents/security-auditor.md` exists and is non-empty
- `dist/agents/code-quality-auditor.md` exists and is non-empty
- `dist/index.js` and `dist/index.d.ts` exist

### 8.2 No Integration Tests for MVP

Integration tests would require:
- Running actual agent tasks (expensive, slow, non-deterministic)
- Mocking LLM responses (out of scope for smoke tests)
- Testing markdown template parsing (logic is in template, not code)

These are deferred to v2 when `/fix` command is added (then we can test report parsing and fix application).

---

## 9. Build & Packaging

### 9.1 Build Pipeline

```
1. tsup src/index.ts --format esm --dts
2. node scripts/copy-assets.mjs
   - Copies src/commands/*.md → dist/commands/
   - Copies src/agents/*.md → dist/agents/
```

### 9.2 Root Package Consumption

`src/index.js` (runtime entrypoint):
```javascript
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
```

`src/index.ts` (typed entrypoint):
```typescript
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
```

### 9.3 Published Files

Root `package.json` `files`:
- `src/index.js`
- `src/index.d.ts`
- `packages/commit/dist`
- `packages/python-developer/dist`
- `packages/code-review/dist` ← NEW

---

## 10. Dependencies

### 10.1 New Package Dependencies

`packages/code-review/package.json`:
```json
{
  "name": "@appverk/opencode-code-review",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
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

### 10.2 Root Package Changes

- `workspaces`: already `packages/*`, no change needed
- `scripts.build`: add `&& npm run build --workspace @appverk/opencode-code-review`
- `scripts.test`: add `&& npm run test --workspace @appverk/opencode-code-review`
- `scripts.typecheck`: add `&& npm run typecheck --workspace @appverk/opencode-code-review`
- `files`: add `packages/code-review/dist`

---

## 11. Migration Checklist from Marketplace

| Original File | New Location | Changes |
|---|---|---|
| `.claude-plugin/plugin.json` | `package.json` | Convert to npm package format |
| `commands/review.md` | `src/commands/review.md` | Adapt TaskCreate→todowrite, subagent_type→general, remove cross-verifier/challenger/docs-auditor, add python-developer stack detection |
| `commands/fix.md` | **v2** | Deferred |
| `commands/fix-report.md` | **v2** | Deferred |
| `commands/analyze-feedback.md` | **v2** | Deferred |
| `agents/security-auditor.md` | `src/agents/security-auditor.md` | Remove `allowed-tools` Claude-specific entries, add Django/Celery framework patterns, adapt skill invocation |
| `agents/code-quality-auditor.md` | `src/agents/code-quality-auditor.md` | Remove `allowed-tools` Claude-specific entries, add Django/Celery framework patterns |
| `agents/cross-verifier.md` | **v2** | Deferred |
| `agents/challenger.md` | **v2** | Deferred |
| `agents/documentation-auditor.md` | **v2** | Deferred |
| `agents/feedback-analyzer.md` | **v2** | Deferred |
| `agents/fix-auto.md` | **v2** | Deferred |
| `skills/secret-scanning/SKILL.md` | Inline in agent prompts | Skills become inline instructions (no separate skill files needed for MVP) |
| `skills/sast-analysis/SKILL.md` | Inline in agent prompts | Same |
| `skills/dependency-scanning/SKILL.md` | Inline in agent prompts | Same |
| `skills/standards-discovery/SKILL.md` | Inline in agent prompts | Same |
| `skills/linter-integration/SKILL.md` | Inline in agent prompts | Same |
| `skills/architecture-analysis/SKILL.md` | Inline in agent prompts | Same |
| `skills/developer-plugins-integration/SKILL.md` | Inline in `/review` command | Replaced by inline stack detection |

---

## 12. Future Work (v2+)

1. **Cross-Verifier + Challenger**: Add verification agents for false-positive detection
2. **Documentation Auditor**: Conditional agent for doc review
3. **`/fix` command**: Single issue fix with implementation, verification, reporting
4. **`/fix-report` command**: Parse saved report, present checklist, fix selected issues
5. **`/analyze-feedback` command**: PR comment analysis and response drafting
6. **Frontend-developer integration**: Stack detection and framework-specific checks for frontend projects
7. **Agent-as-tool pattern**: Convert agents to callable tools instead of general subagents for better type safety

---

## 13. Open Questions / Risks

1. **Agent output parsing**: Agents return findings as markdown/JSON in text output. The `/review` command must parse this reliably. We may need to enforce strict JSON output format in agent prompts.

2. **Parallel task execution**: OpenCode's `task` tool behavior with parallel calls in one message needs verification. If tasks block sequentially, the workflow needs adjustment.

3. **Skill loading in command context**: The `load_python_skill` tool is registered by python-developer plugin. If both plugins are loaded, the tool is available. If only code-review is loaded, stack detection should gracefully skip skill loading.

4. **Report save path**: `docs/reviews/` directory may not exist. Need `mkdir -p` logic or Write tool handles it.

5. **Branch name for report filename**: Need `git branch --show-current` call in workflow. If not in git repo, fallback to `review` or timestamp only.
