# Design: Code Review Plugin — Phase 2 Migration

**Date:** 2026-04-22
**Scope:** Post-MVP — `/fix`, `/fix-report`, `/analyze-feedback`, verification agents, and skill integration
**Status:** Draft

---

## 1. Overview

This document describes the second phase of migrating the `code-review` plugin from the Claude Code marketplace (`av-marketplace/plugins/code-review`) to the OpenCode plugin monorepo (`av-opencode-plugins`).

Phase 1 (MVP, completed 2026-04-21) delivered:
- `/review` command
- `security-auditor` and `code-quality-auditor` agents
- Basic report generation with issue IDs
- Optional save to `docs/reviews/`

Phase 2 delivers the remaining functional components:
- Verification workflow (`cross-verifier`, `challenger`, `documentation-auditor`)
- Fix commands (`/fix`, `/fix-report`)
- Feedback analysis (`/analyze-feedback`)
- Skill integration via hybrid inline + skill-agent approach

---

## 2. Goals & Non-Goals

### Goals (Phase 2)

1. **Complete `/review` workflow** — add `documentation-auditor` (conditional), `cross-verifier`, and `challenger` agents; integrate verification into the review pipeline
2. **Fix commands** — implement `/fix` (single issue by ID or paste) and `/fix-report` (batch fix from saved report)
3. **Feedback analysis** — implement `/analyze-feedback` with PR comment classification and optional GitHub publishing
4. **Skill integration** — migrate 7 skills from Claude Code using a hybrid strategy (inline for lightweight skills, skill-agents for heavy tool-based skills)
5. **Update all tests** — ensure plugin tests cover new agents and commands
6. **Update documentation** — `README.md`, `docs/plugins/code-review.md`, `AGENTS.md`

### Non-Goals (Phase 2)

- Frontend-developer integration (depends on frontend-developer plugin existing in this repo)
- PHP-developer integration (depends on php-developer plugin)
- Real-time GitHub PR webhook integration
- Persistent review database or state management beyond file-based reports
- Automatic fix application without user confirmation (the `/fix` command always asks)

---

## 3. Architecture

### 3.1 Package Structure (Target)

```
packages/code-review/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                    # Plugin factory — registers ALL commands & agents
│   ├── commands/
│   │   ├── review.md               # UPDATED: adds verification steps
│   │   ├── fix.md                  # NEW: fix single issue
│   │   ├── fix-report.md           # NEW: batch fix from report
│   │   └── analyze-feedback.md     # NEW: analyze PR feedback
│   ├── agents/
│   │   ├── security-auditor.md     # UPDATED: integrates skill-agents
│   │   ├── code-quality-auditor.md # UPDATED: integrates skill-agents
│   │   ├── documentation-auditor.md # NEW
│   │   ├── cross-verifier.md       # NEW
│   │   ├── challenger.md           # NEW
│   │   ├── feedback-analyzer.md    # NEW
│   │   ├── fix-auto.md             # NEW
│   │   ├── skill-secret-scanner.md # NEW (skill-agent prompt)
│   │   ├── skill-sast-analyzer.md  # NEW (skill-agent prompt)
│   │   ├── skill-dependency-scanner.md # NEW (skill-agent prompt)
│   │   ├── skill-architecture-analyzer.md # NEW (skill-agent prompt)
│   │   └── skill-linter-integrator.md # NEW (skill-agent prompt)
├── tests/
│   ├── plugin.test.ts              # UPDATED: cover all agents & commands
│   ├── package-smoke.test.ts       # as-is
│   └── build-output.test.ts        # UPDATED: verify all .md files in dist/
└── scripts/
    └── copy-assets.mjs             # UPDATED: copy new commands/agents/skills
```

### 3.2 Root Registration

Both root entrypoints must be updated:

**`src/index.ts` and `src/index.js`:**
- Already imports `AppVerkCodeReviewPlugin` (no change needed)
- Plugin factory itself registers all new elements (no root change needed)

**`package.json` root:**
- `files` array already includes `packages/code-review/dist` (no change needed)
- Build/test/typecheck scripts already include workspace (no change needed)

### 3.3 Plugin Factory (`src/index.ts`)

The factory loads all markdown files and registers them:

```typescript
// Commands
config.command.review = { description: "...", template: REVIEW_COMMAND_TEMPLATE }
config.command.fix = { description: "...", template: FIX_COMMAND_TEMPLATE }
config.command["fix-report"] = { description: "...", template: FIX_REPORT_COMMAND_TEMPLATE }
config.command["analyze-feedback"] = { description: "...", template: ANALYZE_FEEDBACK_COMMAND_TEMPLATE }

// Agents
config.agent["security-auditor"] = { description: "...", prompt: SECURITY_AUDITOR_PROMPT }
config.agent["code-quality-auditor"] = { description: "...", prompt: CODE_QUALITY_AUDITOR_PROMPT }
config.agent["documentation-auditor"] = { description: "...", prompt: DOCUMENTATION_AUDITOR_PROMPT }
config.agent["cross-verifier"] = { description: "...", prompt: CROSS_VERIFIER_PROMPT }
config.agent["challenger"] = { description: "...", prompt: CHALLENGER_PROMPT }
config.agent["feedback-analyzer"] = { description: "...", prompt: FEEDBACK_ANALYZER_PROMPT }
config.agent["fix-auto"] = { description: "...", prompt: FIX_AUTO_PROMPT }

// Skill-agents (invoked by main agents via Task tool)
config.agent["skill-secret-scanner"] = { description: "...", prompt: SECRET_SCANNING_PROMPT }
config.agent["skill-sast-analyzer"] = { description: "...", prompt: SAST_ANALYSIS_PROMPT }
config.agent["skill-dependency-scanner"] = { description: "...", prompt: DEPENDENCY_SCANNING_PROMPT }
config.agent["skill-architecture-analyzer"] = { description: "...", prompt: ARCHITECTURE_ANALYSIS_PROMPT }
config.agent["skill-linter-integrator"] = { description: "...", prompt: LINTER_INTEGRATION_PROMPT }
```

### 3.4 Skill Integration Strategy (Hybrid)

| Skill | Strategy | Location | Rationale |
|-------|----------|----------|-----------|
| `developer-plugins-integration` | **Inline** | `review.md`, `fix.md`, `fix-auto.md` | Short detection script (~100 lines), used in 3 places |
| `standards-discovery` | **Inline** | `code-quality-auditor.md` | Project standards are context for quality review |
| `secret-scanning` | **Skill-agent** | `agents/skill-secret-scanner.md` | Heavy tool usage (trufflehog, grep patterns), reusable |
| `sast-analysis` | **Skill-agent** | `agents/skill-sast-analyzer.md` | Heavy tool usage (semgrep, bandit, eslint), multi-language |
| `dependency-scanning` | **Skill-agent** | `agents/skill-dependency-scanner.md` | Heavy tool usage (pip-audit, npm audit, govulncheck) |
| `architecture-analysis` | **Skill-agent** | `agents/skill-architecture-analyzer.md` | Complex analysis workflow, reusable |
| `linter-integration` | **Skill-agent** | `agents/skill-linter-integrator.md` | Heavy tool usage (ruff, mypy, eslint, tsc), reusable |

**How skill-agents work:**

The `security-auditor` agent prompt includes instructions like:

```
## Step X: Secret Scanning

Use the Task tool with these parameters:
- subagent_type: "code-review:skill-secret-scanner"
- run_in_background: false
- prompt: "Scan the current project for secrets. Report all findings with file, line, severity."

Collect results and integrate into your findings.
```

This replaces the Claude Code `Skill(skill: "secret-scanning")` pattern.

---

## 4. Migration Etapów

### Etap 1: Dokończenie workflow `/review`

**Zmiany w `commands/review.md`:**
- Dodać Step 5.5 (Verification) — spawn `cross-verifier` i `challenger` jako background tasks, collect results, merge findings
- Upewnić się, że `documentation-auditor` jest conditional (już jest w MVP)
- Dodać TaskCreate/TaskUpdate/TaskList do `allowed-tools` (dla progress tracking)
- Zamienić Claude-specific syntax na OpenCode-compatible

**Nowe pliki:**
- `agents/documentation-auditor.md` — dokumentacja audit
- `agents/cross-verifier.md` — korelacja findings
- `agents/challenger.md` — adversarial review

**Zależności:** Brak (można zrobić jako pierwsze).

### Etap 2: Komendy fix

**Nowe pliki:**
- `commands/fix.md` — fix pojedynczego issue (ID mode lub paste mode)
- `commands/fix-report.md` — batch fix z saved report
- `agents/fix-auto.md` — subagent do auto-fix (bez pytania o potwierdzenie)

**Zależności:**
- `/fix-report` wymaga `/fix` (używa `fix-auto` agenta)
- `/fix` wymaga saved report w `docs/reviews/` (dla ID mode)
- Implementujemy razem jako jeden etap

**Kluczowe decyzje:**
- `fix-auto` NIE pyta o potwierdzenie — jest to subagent dla `/fix-report`
- `/fix` (główna komenda) pyta o potwierdzenie przed implementacją (Phase 3 w prompt)
- Maksymalnie 3 iteracje auto-fix w `fix-auto`

### Etap 3: Komenda `/analyze-feedback`

**Nowe pliki:**
- `commands/analyze-feedback.md` — PR feedback analysis
- `agents/feedback-analyzer.md` — per-comment classification

**Zależności:** Brak (niezależna funkcjonalność).

### Etap 4: Integracja skilli

**Nowe pliki (skill-agents):**
- `agents/skill-secret-scanner.md`
- `agents/skill-sast-analyzer.md`
- `agents/skill-dependency-scanner.md`
- `agents/skill-architecture-analyzer.md`
- `agents/skill-linter-integrator.md`

**Modyfikacje (inline):**
- `commands/review.md` — dodać developer-plugins-integration inline
- `commands/fix.md` — dodać developer-plugins-integration inline
- `agents/fix-auto.md` — dodać developer-plugins-integration inline
- `agents/code-quality-auditor.md` — dodać standards-discovery inline

**Zależności:**
- Wymaga Etapu 1 (security-auditor i code-quality-auditor muszą istnieć, żeby wywoływać skill-agents)
- Najlepiej zrobić PO Etaach 1-3

---

## 5. OpenCode vs Claude Code — Key Differences

| Feature | Claude Code | OpenCode | Mitigation |
|---------|-------------|----------|------------|
| Skill system | `Skill` tool loads `SKILL.md` files | No native skills | Skill-agents via `Task` tool |
| Task progress | `TaskCreate`, `TaskUpdate`, `TaskList` tools | No native task progress | Include in `allowed-tools`; LLM uses them as regular tools |
| Agent output | `AgentOutputTool` | `Task` tool with `block: true` | Use `Task` + collect results |
| Subagent syntax | `subagent_type: "code-review:security-auditor"` | Same namespace pattern | Consistent with MVP |
| Commands | Slash commands via `.claude-plugin/plugin.json` | Registered in `config.command` | Already working in MVP |
| Model specification | `model: opus` in command header | Not supported in OpenCode | Remove or ignore; OpenCode uses configured model |

---

## 6. Testing Strategy

### 6.1 Unit Tests (`tests/plugin.test.ts`)

For each new command/agent, add a test:

```typescript
it("config registers the fix command", async () => {
  const config: any = { command: {} }
  await pluginResult.config?.(config as never)
  expect(config.command.fix).toBeDefined()
  expect(config.command.fix.description).toBeDefined()
  expect(typeof config.command.fix.template).toBe("string")
  expect(config.command.fix.template.length).toBeGreaterThan(0)
})

it("config registers documentation-auditor agent", async () => {
  const config: any = { agent: {} }
  await pluginResult.config?.(config as never)
  expect(config.agent["documentation-auditor"]).toBeDefined()
})

// Repeat for: fix-report, analyze-feedback, cross-verifier, challenger,
// feedback-analyzer, fix-auto, and all 5 skill-agents
```

### 6.2 Build Output Tests (`tests/build-output.test.ts`)

Verify all `.md` files are copied to `dist/`:

```typescript
const expectedDistFiles = [
  "commands/review.md",
  "commands/fix.md",
  "commands/fix-report.md",
  "commands/analyze-feedback.md",
  "agents/security-auditor.md",
  "agents/code-quality-auditor.md",
  "agents/documentation-auditor.md",
  "agents/cross-verifier.md",
  "agents/challenger.md",
  "agents/feedback-analyzer.md",
  "agents/fix-auto.md",
  "agents/skill-secret-scanner.md",
  "agents/skill-sast-analyzer.md",
  "agents/skill-dependency-scanner.md",
  "agents/skill-architecture-analyzer.md",
  "agents/skill-linter-integrator.md",
]
```

### 6.3 Integration Tests

No new integration tests planned for Phase 2. The existing integration test pattern (`packages/commit/tests/controlled-commit.integration.test.ts`) could be extended in Phase 3 for end-to-end review workflows.

---

## 7. Files to Create / Modify

### Create (new files)

| File | Size | Etap |
|------|------|------|
| `src/commands/fix.md` | ~550 lines | 2 |
| `src/commands/fix-report.md` | ~210 lines | 2 |
| `src/commands/analyze-feedback.md` | ~380 lines | 3 |
| `src/agents/documentation-auditor.md` | ~115 lines | 1 |
| `src/agents/cross-verifier.md` | ~105 lines | 1 |
| `src/agents/challenger.md` | ~80 lines | 1 |
| `src/agents/feedback-analyzer.md` | ~85 lines | 3 |
| `src/agents/fix-auto.md` | ~340 lines | 2 |
| `src/agents/skill-secret-scanner.md` | ~270 lines | 4 |
| `src/agents/skill-sast-analyzer.md` | ~465 lines | 4 |
| `src/agents/skill-dependency-scanner.md` | ~475 lines | 4 |
| `src/agents/skill-architecture-analyzer.md` | ~435 lines | 4 |
| `src/agents/skill-linter-integrator.md` | ~445 lines | 4 |

### Modify (existing files)

| File | Changes | Etap |
|------|---------|------|
| `src/commands/review.md` | Add verification section (Step 5.5), inline developer-plugins-integration | 1, 4 |
| `src/agents/security-auditor.md` | Add skill-agent invocation instructions | 4 |
| `src/agents/code-quality-auditor.md` | Add skill-agent invocation + inline standards-discovery | 4 |
| `src/index.ts` | Register new commands, agents, skill-agents | 1, 2, 3, 4 |
| `scripts/copy-assets.mjs` | Copy new .md files to dist/ | 1, 2, 3, 4 |
| `tests/plugin.test.ts` | Add tests for all new commands and agents | 1, 2, 3, 4 |
| `tests/build-output.test.ts` | Update expected dist files list | 1, 2, 3, 4 |
| `README.md` | Document new commands and agents | 4 |
| `docs/plugins/code-review.md` | Update per-plugin guide | 4 |
| `AGENTS.md` | Update plugin counts and structure | 4 |

---

## 8. Rollback Plan

If any etap introduces breaking changes:

1. **Etap 1** — harmless additive (new agents, review.md update). Rollback: revert `src/index.ts` and `review.md`.
2. **Etap 2** — harmless additive. Rollback: revert `src/index.ts` and remove fix files.
3. **Etap 3** — harmless additive. Rollback: revert `src/index.ts` and remove feedback files.
4. **Etap 4** — modifies existing agent prompts. Rollback: restore original `security-auditor.md` and `code-quality-auditor.md`.

All etapy są addytywne — żaden nie modyfikuje API root entrypointu ani nie zmienia kontraktu z istniejącymi konsumentami.

---

## 9. Success Criteria

- [ ] `npm run check` passes (typecheck + test + build) after each etap
- [ ] All new commands are registered in plugin config
- [ ] All new agents are registered in plugin config
- [ ] `dist/` contains all new `.md` files
- [ ] `npm pack --dry-run` includes all new files
- [ ] Root tests pass (`tests/root-plugin.test.ts`)
- [ ] Package tests pass (`packages/code-review/tests/*.test.ts`)
- [ ] Documentation updated (`README.md`, `docs/plugins/code-review.md`, `AGENTS.md`)

---

## 10. Open Questions

1. **Model specification:** The original Claude plugin specifies `model: opus` in command headers. OpenCode does not support per-command model selection. We will remove these headers. Is this acceptable?

2. **Task progress tools:** `TaskCreate`, `TaskUpdate`, `TaskList` are Claude-specific progress tracking tools. In OpenCode, they must be included in `allowed-tools` and used by the LLM as regular tools. Should we keep them (for prompt compatibility) or remove them (simpler prompts)?

3. **Skill-agent count:** 5 skill-agents increases the agent namespace. Is there a risk of namespace pollution? The naming convention `skill-*` should prevent collisions.

4. **Frontend/PHP developer integration:** The original plugin detects and integrates with `frontend-developer` and `php-developer` plugins. These are not in the OpenCode monorepo yet. Should we include the detection logic anyway (graceful degradation) or defer until those plugins exist?

**Recommended resolutions:**
- Q1: Remove `model: opus` headers (OpenCode uses workspace-configured model).
- Q2: Keep Task* tools in `allowed-tools` for prompt compatibility; LLM will use them if available.
- Q3: Acceptable — `skill-*` prefix is clear.
- Q4: Include detection logic with graceful degradation (as in original) — future-proof.
