# standards-discovery Skill — Design Spec

**Date:** 2026-04-29
**Topic:** Migrating `standards-discovery` from av-marketplace to av-opencode-plugins
**Status:** Draft

---

## Overview & Goals

The `standards-discovery` skill discovers project-specific coding standards, style guides, and architecture documentation before code review or fix workflows begin. It was previously available in the Claude Code marketplace (`av-marketplace`) as a skill within the `code-review` plugin. This spec describes its migration to the OpenCode plugin ecosystem.

### Goals
1. Make `standards-discovery` available globally via `load_appverk_skill("standards-discovery")`
2. Ensure all code-review agents and commands load it before starting analysis
3. Keep the skill content identical to the marketplace version (no functional changes)
4. Follow existing OpenCode plugin conventions (dist-based assets, copy-assets scripts, test coverage)

### Non-Goals
- Migrate `developer-plugins-integration` (deferred to a follow-up task)
- Migrate the 3 shell helper scripts (`slugify-branch.sh`, `allocate-feedback-file.sh`, `extract-issue-ids.sh`) — those belong to `analyze-feedback` persistence, not `standards-discovery`
- Change the skill's discovery logic or output format

---

## Approaches Considered

### Option A: Global Skill in skill-registry (Recommended)
Place the skill under `packages/code-review/src/skills/` and register the `dist/skills/` directory in `skill-registry`. Agents load it on-demand via `load_appverk_skill`.

**Pros:**
- Reuses existing global skill infrastructure
- Available to all agents (code-review, fix, and potentially others)
- Consistent with how `python-coding-standards`, `fastapi-patterns`, etc. work
- No code changes to TypeScript plugin logic

**Cons:**
- Requires agents to remember to load it (reliability depends on prompt compliance)
- Slightly more tokens per agent invocation (skill content is loaded into context)

### Option B: Inline into agent prompts
Copy the discovery workflow directly into every code-review agent and command prompt as a "Step 0".

**Pros:**
- No new files or build steps
- Agents cannot forget to run it — it's part of their prompt

**Cons:**
- Massive duplication across 9 prompt files
- Any future change to discovery logic requires editing 9 files
- Increases prompt size for every agent (token cost)
- Violates DRY principle

### Option C: Dedicated subagent
Register `standards-discovery` as a `subagent` (like `skill-secret-scanner`) that is spawned by other agents.

**Pros:**
- Fits existing code-review pattern (other skills were migrated as agents)
- Can be invoked programmatically

**Cons:**
- Semantically wrong — it's a data-gathering tool, not an autonomous decision-maker
- Adds unnecessary agent spawn overhead
- Not consistent with global skill model used by python-developer/frontend-developer skills

**Decision:** Option A. It aligns with OpenCode's existing skill architecture and avoids duplication.

---

## Architecture

### Components

| Component | Location | Purpose |
|---|---|---|
| **Skill Markdown** | `packages/code-review/src/skills/standards-discovery/SKILL.md` | The skill content (port from marketplace) |
| **Asset Copy Script** | `packages/code-review/scripts/copy-assets.mjs` | Copies `src/skills/` → `dist/skills/` at build time |
| **Skill Registry** | `packages/skill-registry/src/index.ts` | Registers `code-review/dist/skills` as a skill path |
| **Agent Prompts** | `packages/code-review/src/agents/*.md` | Load skill before analysis (9 files) |
| **Command Prompts** | `packages/code-review/src/commands/*.md` | Load skill before analysis (4 files) |

### Skill Registry Integration

`skill-registry` scans directories listed in `skillDirectories` for `*/SKILL.md` files. By adding `code-review/dist/skills` to the list, `standards-discovery/SKILL.md` is automatically catalogued and made available via `load_appverk_skill`.

The skill's `activation` field appears in the "All Available Skills" table injected into every agent's system prompt.

### Build Dependency Chain

```
code-review build → creates dist/skills/standards-discovery/SKILL.md
skill-registry build → scans code-review/dist/skills into catalog
```

Root `npm run build` already orders packages correctly: `code-review` builds before `skill-registry`.

---

## Data Flow

1. **Agent starts** → System prompt includes activation rules table
2. **Agent reads its own prompt** → Sees "Pre-Analysis: load standards-discovery"
3. **Agent calls `load_appverk_skill("standards-discovery")`** → Returns full markdown content
4. **Agent executes discovery workflow** → Searches for CONTRIBUTING.md, CODING_STANDARDS.md, ARCHITECTURE.md, docs/*.md, linter configs
5. **Agent produces JSON output** → Structured rules (naming, architecture, testing, imports, documentation)
6. **Agent applies rules** → Uses discovered standards as additional review/fix criteria

### Output Format (preserved from marketplace)

```json
{
  "standards_found": true,
  "confidence": "HIGH",
  "sources": [{ "file": "CONTRIBUTING.md", "sections_found": ["Code Style"] }],
  "rules": {
    "naming": { "classes": "PascalCase", "functions": "snake_case" },
    "architecture": { "pattern": "Clean Architecture", "layers": ["domain", "application"] },
    "testing": { "min_coverage": "80%", "frameworks": ["pytest"] },
    "imports": { "style": "absolute", "circular_allowed": false },
    "documentation": { "docstrings_required": true }
  },
  "explicit_rules": ["All public functions must have docstrings"],
  "warnings": []
}
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| No standards files found | Return `standards_found: false`, `confidence: LOW`, use industry defaults |
| Partial standards found | Return `confidence: MEDIUM`, list found sources, note gaps in `warnings` |
| Skill file missing at runtime | `load_appverk_skill` throws with list of available skills; agent reports error |
| `dist/skills/` missing at build | `skill-registry` skips directory gracefully (`if (!existsSync(dir)) continue`) |
| Linter configs without docs | Parse config files (`.eslintrc.json`, `pyproject.toml` [tool.ruff]) as implicit standards |

---

## Testing Strategy

### Unit Tests
1. **`build-output.test.ts`** — verify `dist/skills/standards-discovery/SKILL.md` exists after build
2. **`plugin.test.ts`** — verify `standards-discovery` is NOT registered as an agent (it's a skill, not an agent)
3. **`skill-registry` tests** — verify catalog includes `standards-discovery` when `code-review/dist/skills` is present

### Integration Tests
1. Run `npm run build` at root → confirm `dist/skills/standards-discovery/SKILL.md` is created
2. Run `npm run test` at root → all tests pass
3. Verify `load_appverk_skill("standards-discovery")` returns content (manual/smoke)

---

## Files Changed

| File | Action | Details |
|---|---|---|
| `packages/code-review/src/skills/standards-discovery/SKILL.md` | Create | Port from marketplace |
| `packages/code-review/scripts/copy-assets.mjs` | Modify | Add `{ from: "src/skills", to: "dist/skills", type: "dir" }` |
| `packages/skill-registry/src/index.ts` | Modify | Add `code-review/dist/skills` to `skillDirectories` |
| `packages/code-review/src/agents/security-auditor.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/agents/code-quality-auditor.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/agents/documentation-auditor.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/agents/fix-auto.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/agents/feedback-analyzer.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/commands/review.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/commands/fix.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/commands/fix-report.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/src/commands/analyze-feedback.md` | Modify | Add Pre-Analysis step |
| `packages/code-review/tests/build-output.test.ts` | Modify | Add `skills/standards-discovery/SKILL.md` to `EXPECTED_FILES` |
| `packages/code-review/tests/plugin.test.ts` | Modify | Verify agent count unchanged (skill ≠ agent) |
| `README.md` | Modify | Add `standards-discovery` to available skills list |
| `AGENTS.md` | Modify | Update skill count, add skill description |
| `docs/plugins/code-review.md` | Modify | Document new skill in architecture table |
| 7× `package.json` | Bump | Increment version (root + 6 workspaces) |

---

## Rollout Plan

1. Create skill markdown and modify copy-assets script
2. Modify skill-registry to include code-review skills
3. Add Pre-Analysis steps to all 9 prompts
4. Update tests
5. Update documentation (README, AGENTS.md, docs/)
6. Bump versions
7. Run `npm run check` (typecheck + test + build)
8. Commit with `/commit` workflow

---

## Spec Self-Review

- **Placeholder scan:** No TBD/TODO placeholders.
- **Internal consistency:** Build order confirmed — code-review builds before skill-registry. `dist/skills/` is committed (`.gitignore` exception exists).
- **Scope:** Single skill migration. `developer-plugins-integration` and shell scripts are explicitly out of scope.
- **Ambiguity:** None identified. All file paths are absolute within repo.

---

## Open Questions

None. Design approved by user.
