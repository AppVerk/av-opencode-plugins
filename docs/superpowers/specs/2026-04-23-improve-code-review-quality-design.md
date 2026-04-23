# Design: Improve Code Review Quality in av-opencode-plugins

**Date:** 2026-04-23
**Scope:** `packages/code-review` plugin
**Status:** Draft — awaiting review

---

## 1. Context & Problem

Recent side-by-side comparison of code review outputs (Kimi K2.6 vs Opus 4.7) on the same codebase revealed systematic quality gaps in the current `/review` workflow:

| Gap | Kimi (current) | Opus (target) |
|-----|----------------|---------------|
| **Duplications** | 31 findings with overlaps (e.g. SEC-004 ≈ PERF-001, SEC-008 = SEC-002 + SEC-006) | 23 unique findings |
| **Systems thinking** | Treats each finding in isolation | 4 composite findings linking root causes |
| **Adversarial review** | `[verified]` with no evidence | Transparent "Challenged Findings" table with 5 justified downgrades |
| **Actionability** | Generic recommendations | Ready-to-use code snippets in remediation |
| **PR grouping** | Flat list of 31 tickets | 4 grouped PRs with clear scope |
| **Doc verification** | 6 documentation findings | 0 (coverage gap, not methodology gap) |

The root cause is not the model but the **architecture of the review pipeline**: agents return unstructured markdown, verification is lightweight, and there is no dedicated synthesis step that deduplicates, composites, and prioritizes findings before the final report.

---

## 2. Goals

1. **Eliminate duplication** — deterministic deduplication before final report.
2. **Enable composite findings** — identify shared root causes across security, architecture, and performance.
3. **Enforce adversarial transparency** — every challenged finding must show evidence.
4. **Increase actionability** — every HIGH+ finding must include a ready code snippet.
5. **Group into PRs** — present findings as executable work packages, not a flat list.
6. **Preserve documentation coverage** — keep the documentation auditor in the loop.

---

## 3. Non-Goals

- Changing the set of auditors (security, quality, docs remain).
- Adding new external tools (SAST, linters, dependency scanners remain as-is).
- Reducing token usage or execution time — quality is the priority.

---

## 4. Architecture & Flow

### 4.1 Current Flow (simplified)

```
Stack Detection
  → Launch Agents (parallel: security, quality, docs)
  → Host Analysis (performance + architecture)
  → Verification (cross-verifier + challenger)
  → Merge (host manual)
  → Assign IDs
  → Final Report
```

### 4.2 Proposed Flow

```
Stack Detection
  → Launch Agents (parallel, structured markdown output)
  → Host Analysis (structured markdown output)
  → Collect Results
  → Verification (cross-verifier + challenger, structured markdown + reasoning tables)
  → Synthesis (NEW: synthesis-agent)
  → Assign IDs
  → Final Report (PR-grouped, with code examples)
```

### 4.3 New Agent: `synthesis-agent`

- **Role:** Single-responsibility agent that transforms raw findings into a coherent, prioritized set.
- **Mode:** `subagent` (hidden from tab-completion, invoked programmatically by `/review`).
- **Input:** All auditor outputs + cross-verifier composites + challenger adjustments.
- **Output:** Deduplicated findings, composite findings, PR groups, ready remediation code.

---

## 5. Structured Markdown Format

All agents (auditors, host, cross-verifier, challenger, synthesis) communicate via a **structured markdown** block format. This avoids JSON escaping issues with multi-line code while remaining deterministic to parse.

### 5.1 Finding Block Template

```markdown
### FINDING
id: SEC-001
category: Security
severity: HIGH
title: SQL Injection in UserRepository.search
file: src/repositories/user.py
line: 42
end_line: 55
effort: easy
tags: sql, input-validation, repository
related_files: src/services/user_service.py
source_agent: security-auditor
cwe: CWE-89
owasp: A05:2025
cvss: 8.5

#### PROBLEM
User input is concatenated directly into SQL query.

#### IMPACT
Attacker can extract arbitrary data.

#### REMEDIATION
Use parameterized queries.

#### CODE_EXAMPLE
```python
# Before
cursor.execute(f"SELECT * FROM users WHERE name = {name}")

# After
cursor.execute("SELECT * FROM users WHERE name = ?", (name,))
```
```

### 5.2 Key Fields Supporting Synthesis

| Field | Purpose |
|-------|---------|
| `tags` | Cluster findings by shared concepts (e.g. `input-validation`, `repository`). |
| `related_files` | Discover cross-module correlations. |
| `source_agent` | Track provenance; resolve conflicts. |
| `cwe` / `owasp` / `principle` | Enable cross-domain matching. |
| `effort` | Support prioritization (trivial → easy → medium → hard). |

### 5.3 Why Structured Markdown Instead of JSON

| Risk with JSON | Structured Markdown Solution |
|----------------|------------------------------|
| `"` inside code breaks JSON strings | Code lives in fenced code blocks, not string literals. |
| `\n` requires escaping | Natural newlines in markdown. |
| LLM may forget closing `}` / `]` | Markdown is more forgiving; `### FINDING` is a clear delimiter. |
| Hard to debug malformed JSON | Human-readable; regex/parser friendly. |

---

## 6. Agent Prompts

### 6.1 Cross-Verifier (Enhanced)

**Added requirements:**

1. **Mandatory workflow steps** (must not be skipped):
   - Step 1: Deduplication Analysis — list all duplicates with confidence (`certain` / `likely` / `maybe`).
   - Step 2: Correlation Mapping — for each Security finding, list Quality findings in the same file/module.
   - Step 3: Composite Construction — build composites only when 2+ findings share a root cause.
   - Step 4: Severity Calibration — explicit table of adjustments with reasoning.
   - Step 5: Coverage Gap Analysis — list what each auditor missed.

2. **Strict output tables:**
   - `Duplicates` table
   - `Correlations` table
   - `Composite Findings` table
   - `Severity Adjustments` table
   - `Coverage Gaps` table

### 6.2 Challenger (Enhanced)

**Added requirements:**

1. **Mandatory workflow steps:**
   - Step 1: Evidence Collection — answer concrete questions (does flagged code receive user input? is it in a test file?).
   - Step 2: Severity Calibration — one row per challenged finding with evidence.
   - Step 3: Decision — `confirmed`, `downgraded:OLD->NEW`, or `false-positive`.

2. **Strict output tables:**
   - `Challenged Findings` table with columns: `Finding ID`, `Original Severity`, `Decision`, `Evidence`, `Impact if Downgraded`.
   - `Confirmed Findings` table with columns: `Finding ID`, `Severity`, `Confirmation Reason`.

3. **Critical rule:** If a finding is marked `false-positive`, the challenger MUST quote the specific code or documentation that disproves it.

---

## 7. Synthesis Agent Specification

### 7.1 Workflow (enforced in prompt)

```markdown
### Step 1: Parse All Findings
Extract findings from all sources using `### FINDING` blocks.

### Step 2: Apply Challenger Decisions
- Remove false-positives.
- Apply severity downgrades.
- Mark remaining findings as [verified].

### Step 3: Deduplicate
- **Hard match:** same `file` + `line` + `category` + normalized `title`.
- **Soft match:** same `file` + `category` + ≥60% shared title words.
- Merge duplicates: higher severity wins; longer description wins.

### Step 4: Build Composite Findings
Find groups sharing a root cause:
- Same file/module + related `tags`.
- Example: SEC-003 (unescaped LIKE) + ARCH-001 (missing VO) → COMPOSITE-1.

For each composite:
- Assign ID: COMPOSITE-001, COMPOSITE-002...
- Severity = max(severity of components).
- Remediation = fix the shared root cause (include ready code).
- Remove original component findings to avoid duplication.

### Step 5: Add Remediation Code
For every HIGH+ finding and composite, generate a complete before/after code snippet.

### Step 6: PR-Level Grouping
Group findings into recommended change sets:
```
PR-1: SearchTerm VO (COMPOSITE-001)
PR-2: Input validation boundary (SEC-002 + SEC-004 + MAINT-004)
PR-3: Index optimizations (PERF-003 + PERF-004)
```

### Step 7: Prioritize
Sort order:
1. CRITICAL severity first.
2. Architecture before Security (architectural fixes often enable security fixes).
3. Composite before individual.
4. Effort: trivial → easy → medium → hard.

### Step 8: Output
Return structured markdown with:
- Deduplication Log
- Composite Findings
- PR Groups
- Final Findings List
```

### 7.2 Output Format

```markdown
## Synthesis Results

### Deduplication Log
| Removed ID | Kept ID | Reason |

### Composite Findings
### FINDING
id: COMPOSITE-001
category: Composite
severity: HIGH
title: SearchTerm Value Object
basis: SEC-003, ARCH-001
...

### PR Groups
| PR ID | Title | Findings | Effort | Priority |

### Final Findings List
[All remaining findings after dedup, composites replacing originals]
```

---

## 8. Final Report Format

Generated by `/review` command from synthesis output.

### 8.1 Report Structure

```markdown
## Code Review Report

### Executive Summary
- X CRITICAL issues
- Y HIGH issues
- Z MEDIUM issues
- W LOW issues
- N Composite findings (replace M individual findings)

### PR-Level Action Plan
#### PR-1 (Block Merge): <Title>
**Findings:** <list>
**Effort:** <effort>
**Why first:** <rationale>

### Security Findings
### [SEVERITY] ID: Title
[Standard structured finding block with CODE_EXAMPLE]

### Composite Findings
### [SEVERITY] COMPOSITE-NNN: Title
**Basis:** <component IDs>
**Combined Risk:** <explanation>
**Remediation:** <code>

### Challenged Findings
| Finding ID | Original | Adjusted | Reasoning |

### Documentation Findings
[Same structured format]

### Recommendations
[Same as PR-Level Action Plan]
```

### 8.2 Improvements Over Current Format

| Aspect | Current | New |
|--------|---------|-----|
| Total findings | 31 flat | ~20 after dedup |
| Composite | Rare / absent | Always when shared root cause |
| Ready code | Rare | Every HIGH+ |
| PR grouping | None | Recommended change sets |
| Prioritization | Severity only | Severity + dependencies + effort |
| Transparency | `[verified]` no justification | "Challenged Findings" table with evidence |
| Actionability | Ticket list | Execution path (4 PRs) |

---

## 9. Files to Change

| File | Change |
|------|--------|
| `packages/code-review/src/commands/review.md` | Update flow: add Synthesis step, structured markdown I/O, PR grouping in final report. |
| `packages/code-review/src/agents/cross-verifier.md` | Add mandatory workflow steps, strict output tables, reasoning requirements. |
| `packages/code-review/src/agents/challenger.md` | Add mandatory workflow steps, strict output tables, evidence requirements. |
| `packages/code-review/src/agents/security-auditor.md` | Update output format to structured markdown (`### FINDING` blocks). |
| `packages/code-review/src/agents/code-quality-auditor.md` | Update output format to structured markdown (`### FINDING` blocks). |
| `packages/code-review/src/agents/documentation-auditor.md` | Update output format to structured markdown (`### FINDING` blocks). |
| `packages/code-review/src/agents/synthesis-agent.md` | **NEW** — agent definition, workflow, and output format. |
| `packages/code-review/src/index.ts` | Register `synthesis-agent` in `AGENTS` array. |
| `packages/code-review/scripts/copy-assets.mjs` | Ensure new `.md` files are copied to `dist/`. |
| `packages/code-review/tests/plugin.test.ts` | Add assertion that `synthesis-agent` is registered. |

---

## 10. Testing Strategy

1. **Unit tests:**
   - `plugin.test.ts` — verify `synthesis-agent` is loaded and registered with `mode: "subagent"`.
   - `build-output.test.ts` — verify `synthesis-agent.md` is present in `dist/agents/`.

2. **Integration / smoke tests:**
   - Run `/review` on a small known codebase and assert:
     - Output contains `### FINDING` blocks.
     - No duplicate IDs in final report.
     - Composite findings present when expected.
     - "Challenged Findings" table present when challenger downgrades.

3. **Regression:**
   - Ensure existing agents (security, quality, docs) still launch correctly.
   - Ensure `/fix` and `/fix-report` commands still work (they consume the final report format).

---

## 11. Rollout & Limitations

### Rollout
1. Update prompts and add `synthesis-agent`.
2. Build and run tests.
3. Run a manual `/review` on a test repo to validate end-to-end flow.
4. Bump version in all `package.json` files and tag.

### Known Limitations (MVP)
- **Soft-match deduplication** (60% title word overlap) is heuristic; edge cases may require tuning.
- **PR grouping** is advisory — the agent suggests groups, but the developer decides the actual PR scope.
- **Structured markdown parsing** in `/review` uses regex; extremely malformed output from an agent may still break parsing. A future improvement could be a robust parser or JSON with base64-encoded code.

---

## 12. Open Questions

None at this stage. All sections have been reviewed and approved.
