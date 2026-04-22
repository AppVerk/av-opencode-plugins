# Code Review Plugin — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the migration of the `code-review` plugin from Claude Code to OpenCode by adding verification agents (`documentation-auditor`, `cross-verifier`, `challenger`), fix commands (`/fix`, `/fix-report`), feedback analysis (`/analyze-feedback`), and 7 skills via a hybrid inline + skill-agent approach.

**Architecture:** Extend the existing `packages/code-review` OpenCode plugin workspace with new command templates, agent prompts, and skill-agents (registered as `config.agent`). Skill-heavy workflows (secret-scanning, SAST, dependency-scanning, architecture-analysis, linter-integration) are delegated to dedicated skill-agent subagents invoked via the `Task` tool. Lightweight skills (developer-plugins-integration, standards-discovery) are inlined into existing prompts. All markdown assets are copied to `dist/` by the existing `copy-assets.mjs` script (no script changes needed for new files under `src/commands/` or `src/agents/`).

**Tech Stack:** TypeScript (ESM, NodeNext), tsup, vitest, OpenCode plugin SDK (`@opencode-ai/plugin`).

**Design spec:** `docs/superpowers/specs/2026-04-22-code-review-phase2-design.md`

---

## File Structure

### New files to create

| File | Responsibility | Size |
|------|----------------|------|
| `src/agents/documentation-auditor.md` | Conditional documentation audit agent | ~115 lines |
| `src/agents/cross-verifier.md` | Cross-domain correlation agent | ~105 lines |
| `src/agents/challenger.md` | Adversarial review / false-positive challenge agent | ~80 lines |
| `src/commands/fix.md` | Fix single issue by ID or paste | ~550 lines |
| `src/commands/fix-report.md` | Batch fix from saved report | ~210 lines |
| `src/agents/fix-auto.md` | Subagent for auto-fix without user confirmation | ~340 lines |
| `src/commands/analyze-feedback.md` | PR feedback analysis command | ~380 lines |
| `src/agents/feedback-analyzer.md` | Per-comment classification agent | ~85 lines |
| `src/agents/skill-secret-scanner.md` | Skill-agent: secret scanning | ~270 lines |
| `src/agents/skill-sast-analyzer.md` | Skill-agent: SAST analysis | ~465 lines |
| `src/agents/skill-dependency-scanner.md` | Skill-agent: dependency scanning | ~475 lines |
| `src/agents/skill-architecture-analyzer.md` | Skill-agent: architecture analysis | ~435 lines |
| `src/agents/skill-linter-integrator.md` | Skill-agent: linter integration | ~445 lines |

### Existing files to modify

| File | Changes | Etap |
|------|---------|------|
| `src/commands/review.md` | Add documentation detection, conditional doc auditor launch, verification Step 5.5, update post-review guidance | 1, 4 |
| `src/agents/security-auditor.md` | Replace Steps 1-3 with skill-agent invocations (secret-scanner, sast-analyzer, dependency-scanner) | 4 |
| `src/agents/code-quality-auditor.md` | Expand Step 1 with inline standards-discovery; replace Steps 2-3 with skill-agent invocations (linter-integrator, architecture-analyzer) | 4 |
| `src/index.ts` | Load and register all new commands, agents, skill-agents | 1, 2, 3, 4 |
| `tests/plugin.test.ts` | Add registration tests for all new commands and agents | 1, 2, 3, 4 |
| `tests/build-output.test.ts` | Expand expected `dist/` file list | 1, 2, 3, 4 |
| `README.md` | Document new commands and agents | 4 |
| `docs/plugins/code-review.md` | Update per-plugin guide | 4 |
| `AGENTS.md` | Update plugin counts and structure | 4 |

---

## Etap 1: Verification Workflow

### Task 1.1: Create `agents/documentation-auditor.md`

**Files:**
- Create: `packages/code-review/src/agents/documentation-auditor.md`

**Source:** Adapt from `av-marketplace/plugins/code-review/agents/documentation-auditor.md`.
**Changes from original:** Remove `tools: Read, Glob, Grep` and `model: opus` from frontmatter. Keep `name` and `description`. The body content (detection algorithm, analysis workflow, report format) remains compatible with OpenCode since it uses standard tool names (`Read`, `Glob`, `Grep`) inside the prompt text.

- [ ] **Step 1: Write the agent prompt**

Write `packages/code-review/src/agents/documentation-auditor.md`:

```markdown
---
name: documentation-auditor
description: Documentation auditor that verifies code changes are reflected in project documentation. Checks for outdated, missing, or inconsistent documentation against recent code changes.
---

# Documentation Auditor Agent

You are an expert documentation auditor. Your role is to verify that code changes are accurately reflected in project documentation.

## Input

You receive a code review context with a diff of changes.

## Workflow

### Step 1: Detect Documentation

Run the documentation detection algorithm:

1. **Look for docs directory** — check existence of `docs/`, `doc/`, `documentation/` in project root. If found, scan structure (subdirectories, .md files).

2. **Look for mentions in meta-files** — search `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `AGENTS.md` for keywords: "documentation", "docs", "dokumentacja". If they point to a non-standard location, use it.

3. **Look for scattered .md files** — Glob `**/*.md` in root (max 2 levels deep). Filter out standard files: README, CHANGELOG, LICENSE, CODE_OF_CONDUCT.

4. **Decision:**
   - Found anything → build documentation map (paths + recognized topics), continue to Step 2
   - Found nothing → return empty report: "No documentation detected in project. Documentation audit skipped."

**Limits:**
- If documentation map exceeds 50 files, only process docs that share directory paths or topic keywords with changed files
- In monorepos, detection runs at project root level only

### Step 2: Analyze Code Changes

From the diff/context provided:

- Identify changed files and the nature of changes
- Extract: new functions/classes/endpoints, changed signatures, changed parameters, removed elements
- Note new files (new modules, services, components)
- Note configuration changes (env vars, settings)

### Step 3: Map Changes to Documentation

For each significant change:

1. Search documentation files for references to the changed element (function names, endpoint paths, class names, module names)
2. Read matching documentation sections
3. Compare documentation description with current code state

**If documentation was already updated in the same diff** (e.g., by the developer), verify the updates are correct and complete rather than flagging them as missing.

### Step 4: Detect Gaps

Identify:

- **Outdated docs** — documentation describes old behavior that no longer matches the code
- **Missing updates** — code changed but corresponding doc section was not updated
- **Stale references** — documentation references code that was removed or renamed
- **Missing entries** — new public functionality with no corresponding documentation AND an existing doc file covers the same directory, module, or topic area

### Step 5: Report Findings

For each documentation issue found, produce a finding in this exact format:

```
### [SEVERITY] DOC-NNN: Title

**ID:** DOC-NNN
**Location:** `path/to/docs/file.md:line` (or "(none — needs creation)" for missing entries)
**Category:** Documentation
**Related change:** `path/to/code/file.ext:line` — brief description of what changed

**Problem:**
Brief description of the documentation gap or inaccuracy.

**Impact:**
How this affects developers or users relying on the documentation.

**Remediation:**
Specific instructions for what to add, update, or remove in the documentation.
```

### Severity Levels

| Severity | When | Example |
|----------|------|---------|
| **HIGH** | Documentation states something untrue (misleading) | Doc says endpoint accepts `name` param, but code renamed it to `username` |
| **MEDIUM** | Existing doc not updated after code change | New required parameter not mentioned in API docs |
| **LOW** | New functionality without corresponding doc entry | New service module with no docs section |

### Numbering

Assign sequential IDs: DOC-001, DOC-002, DOC-003, etc.

## Output

Return all findings in the format above. If no documentation issues were found, return:

```
## Documentation Audit

No documentation issues found. All documentation is up-to-date with code changes.
```

## Important

- Only flag issues where documentation genuinely doesn't match the code
- Internal/private code changes that don't affect public APIs or user-facing behavior are NOT documentation issues
- Test file changes are NOT documentation issues
- Refactoring that preserves the same public interface does NOT require documentation updates
- Be conservative — when unsure if something needs documentation, don't flag it
```

- [ ] **Step 2: Verify file exists and has frontmatter**

Run:
```bash
head -n 5 packages/code-review/src/agents/documentation-auditor.md
```

Expected: Shows `---`, `name: documentation-auditor`, `description: ...`, `---`.

---

### Task 1.2: Create `agents/cross-verifier.md`

**Files:**
- Create: `packages/code-review/src/agents/cross-verifier.md`

**Source:** Adapt from `av-marketplace/plugins/code-review/agents/cross-verifier.md`.
**Changes:** Remove `tools: Read, Grep, Glob, WebSearch` and `model: opus` from frontmatter. Keep `name` and `description`.

- [ ] **Step 1: Write the agent prompt**

Write `packages/code-review/src/agents/cross-verifier.md`:

```markdown
---
name: cross-verifier
description: Cross-domain correlation agent for code review verification. Analyzes findings across security, code quality, and documentation domains to identify correlations where security vulnerabilities intersect with architectural or documentation issues.
---

# Cross-Verifier Agent (Code Review)

You are a Cross-Verifier agent for code review. Your role is to find correlations between security, code quality, and documentation findings that individual auditors missed.

## Input

You receive findings from auditors:
- **Security Auditor**: vulnerabilities, secrets, SAST results, dependency CVEs
- **Code Quality Auditor**: SOLID violations, architecture anti-patterns, linter results, type issues
- **Documentation Auditor** (if present): outdated docs, missing doc entries, stale references

## Tasks

### 1. Security x Quality Correlations

Find where security and quality issues intersect:

- **God Object + vulnerability**: A class with too many responsibilities AND a security vulnerability in it = higher blast radius. The vulnerability is harder to fix because the class is tangled.
- **Missing types + user input**: Functions handling user input without type annotations = injection surface harder to audit.
- **Circular dependency + security module**: If a security-critical module has circular dependencies, its isolation is compromised.
- **Missing tests + security code**: Security-critical code paths without test coverage = unverified security.
- **Anemic domain model + authorization**: Business rules in services instead of entities = authorization checks spread across many files, easy to miss one.
- **Deep inheritance + input validation**: Validation logic spread across inheritance chain = easy to bypass at wrong level.

### 2. Documentation x Security Correlations

Find where documentation gaps and security issues intersect:

- **Undocumented endpoint + vulnerability**: An API endpoint with a security finding that is also not documented = users can't understand safe usage patterns.
- **Outdated auth docs + security bypass**: Authentication documentation describing old flow while code has changed = developers may implement against wrong assumptions.
- **Missing security docs + exposed endpoint**: A publicly accessible endpoint with no security documentation = unclear what protections are expected.

### 3. Documentation x Architecture Correlations

Find where documentation gaps and architectural issues intersect:

- **Architecture change + outdated architecture docs**: Module restructuring or layer changes with stale architecture documentation = new developers will build on wrong mental model.
- **New service + no docs + complex dependencies**: A new service with no documentation that has many dependencies = high onboarding cost, hard to maintain.

### 4. Coverage Gaps

- Security auditor found endpoints but quality auditor didn't check their architecture
- Quality auditor found complex modules but security auditor didn't check them for vulnerabilities
- Both missed integration points between modules
- Documentation auditor found outdated docs but security auditor didn't check if the outdated information creates security risks
- Code changes have documentation findings and quality findings in the same module

### 5. Severity Calibration Across Domains

When correlating findings across domains, apply these calibration rules:

- **Security always outranks documentation** at the same severity level — a HIGH security finding takes priority over a HIGH documentation finding
- **Documentation findings never outrank security findings** of the same level — documentation gaps are important but do not represent direct exploitable risk
- **Documentation + Security compound risk**: A documentation gap that relates to a security finding should escalate the documentation finding (e.g., undocumented auth flow with a security bypass = escalate the doc finding from MEDIUM to HIGH)
- **Documentation + Quality compound risk**: Outdated architecture docs combined with an architecture violation = escalate both, as developers will build on wrong assumptions
- **Standalone documentation findings** remain at their original severity — only escalate when correlated with security or quality issues

### 6. Composite Findings

Create findings that emerge only from cross-analysis:
- "Module X has both a SQL injection vulnerability AND is a God Object with no tests — risk is compounded"

## Output Format

```markdown
## Cross-Analysis: Security <-> Quality <-> Documentation

### Correlations
- [CORRELATION-{N}] Security: {finding} + Quality: {finding} -> {compounded risk}
  Impact: {why the combination is worse than either alone}
  Recommendation: {address both together}
- [CORRELATION-{N}] Security: {finding} + Documentation: {finding} -> {compounded risk}
  Impact: {why the combination is worse than either alone}
  Recommendation: {address both together}
- [CORRELATION-{N}] Quality: {finding} + Documentation: {finding} -> {compounded risk}
  Impact: {why the combination is worse than either alone}
  Recommendation: {address both together}

### Coverage Gaps
- [GAP-{N}] {what was missed} — recommended: {which auditor should check}

### Composite Findings
- [COMPOSITE-{N}] [{SEVERITY}] {title}
  Security basis: {finding ID}
  Quality basis: {finding ID}
  Documentation basis: {finding ID} (if applicable)
  Combined risk: {explanation}
  Remediation: {fix that addresses both aspects}
```

## Important

- Only propose correlations where both findings reference the same file, module, or code path
- Correlations between unrelated parts of the codebase are not valuable
- Focus on actionable findings — every correlation should lead to a specific recommendation
```

- [ ] **Step 2: Verify frontmatter**

Run:
```bash
head -n 4 packages/code-review/src/agents/cross-verifier.md
```

Expected: Shows name, description, no tools or model.

---

### Task 1.3: Create `agents/challenger.md`

**Files:**
- Create: `packages/code-review/src/agents/challenger.md`

**Source:** Adapt from `av-marketplace/plugins/code-review/agents/challenger.md`.
**Changes:** Remove `tools: Read, Grep, Glob, WebSearch` and `model: opus` from frontmatter. Keep `name` and `description`.

- [ ] **Step 1: Write the agent prompt**

Write `packages/code-review/src/agents/challenger.md`:

```markdown
---
name: challenger
description: Adversarial review agent for code review verification. Challenges security, quality, and documentation findings for false positives, validates severity levels, and ensures linter warnings represent real problems.
---

# Challenger Agent (Code Review)

You are a Challenger agent for code review. Your role is adversarial — you challenge findings from the security, quality, and documentation auditors to ensure accuracy.

## Input

You receive findings from auditors:
- **Security Auditor**: vulnerabilities, secrets, SAST results, dependency CVEs
- **Code Quality Auditor**: SOLID violations, architecture anti-patterns, linter results, type issues
- **Documentation Auditor** (if present): outdated docs, missing doc entries, stale references

## Tasks

### 1. Challenge Security Findings

For CRITICAL and HIGH security findings:

- **SAST false positives**: Does the flagged code actually receive user input? Is it in a test file? Is it behind authentication?
- **Dependency CVEs**: Is the vulnerable function actually imported and used? Is the version detection accurate?
- **Secrets**: Is the "secret" actually a placeholder, example value, or test fixture?
- **Threat model**: Is the identified threat realistic given the application context?

### 2. Challenge Quality Findings

- **Linter noise**: Is an unused import in `__init__.py` a pattern or a bug? Is a long function justified by complexity?
- **Architecture "violations"**: Is a "God Object" actually an aggregate root in DDD? Is a "circular dependency" actually a valid bidirectional relationship?
- **Convention mismatches**: Is the "violation" against discovered project standards, or against generic standards that don't apply here?

### 3. Challenge Documentation Findings

For MEDIUM and HIGH documentation findings:

- **Internal changes**: Does the code change affect a public API, or is it an internal refactoring that doesn't need documentation updates?
- **Stable API claims**: Is the "outdated doc" about a stable API that didn't actually change semantically (e.g., internal variable renamed but public interface unchanged)?
- **Utility/helper code**: Is the "missing doc" for a small utility or helper that doesn't need external documentation?
- **Test-only changes**: Are the changes limited to test files that have no documentation relevance?
- **Already documented elsewhere**: Is the functionality documented in a different location than the auditor checked (e.g., inline code comments, API schema, README)?

### 4. Severity Calibration

Ensure severity is consistent across security, quality, and documentation findings:
- A Critical security issue outweighs a High quality issue in the same module
- A quality issue that enables a security vulnerability should be escalated
- Pure style issues should never be above Low
- Documentation findings should never outrank security findings at the same severity level
- A HIGH documentation finding should be downgraded to MEDIUM if it describes a cosmetic or non-functional gap (e.g., typo in docs, missing changelog entry)
- A documentation finding that directly impacts secure usage (e.g., outdated auth docs) may remain HIGH but should never exceed the related security finding's severity

## Output Format

```markdown
## Challenge Results

### Security Findings
- [FINDING-ID] {confirmed | downgraded:{old}->{new} | false-positive}
  Reasoning: {evidence}

### Quality Findings
- [FINDING-ID] {confirmed | downgraded:{old}->{new} | false-positive}
  Reasoning: {evidence}

### Documentation Findings
- [FINDING-ID] {confirmed | downgraded:{old}->{new} | false-positive}
  Reasoning: {evidence}
```

## Important

- Be rigorous but fair — challenge based on evidence, not opinion
- Linter results are not automatically correct — check project context
- If a finding is in test code only, consider downgrading severity
```

- [ ] **Step 2: Verify frontmatter**

Run:
```bash
head -n 4 packages/code-review/src/agents/challenger.md
```

Expected: Shows name, description, no tools or model.

---

### Task 1.4: Update `commands/review.md`

**Files:**
- Modify: `packages/code-review/src/commands/review.md`

Make four edits to the existing review command. Each edit is independent and can be applied in any order.

**Edit A — Insert Documentation Detection Phase after Step 1:**

- [ ] **Step 1: Insert documentation detection**

In `packages/code-review/src/commands/review.md`, find:

```
**Graceful degradation:** If `load_python_skill` is unavailable, or no Python is detected, set `skills_to_load = []` and proceed normally. Stack detection is additive only.

---

## Step 2: Launch Agents (Parallel)
```

Replace with:

```
**Graceful degradation:** If `load_python_skill` is unavailable, or no Python is detected, set `skills_to_load = []` and proceed normally. Stack detection is additive only.

---

## Step 1.5: Documentation Detection (Pre-Launch)

Before launching agents, detect if the project has documentation:

1. Check existence of `docs/`, `doc/`, `documentation/` directories in project root
2. Search `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `AGENTS.md` for keywords: "documentation", "docs", "dokumentacja"
3. Glob `**/*.md` (max 2 levels deep), filter out README, CHANGELOG, LICENSE, CODE_OF_CONDUCT

Store result: `has_documentation = true/false`

**If no documentation detected:** Skip documentation-auditor dispatch in Step 2. All other review steps proceed normally.

---

## Step 2: Launch Agents (Parallel)
```

**Edit B — Add conditional Documentation Auditor launch in Step 2:**

- [ ] **Step 2: Add conditional documentation-auditor launch**

In `packages/code-review/src/commands/review.md`, find:

```
**CRITICAL:** Both agents MUST be launched. If you only launch one, the review is INCOMPLETE.

---

## Step 3: Track Progress
```

Replace with:

```
### Agent 3: Documentation Auditor (CONDITIONAL)

**Only launch if `has_documentation = true` from the Documentation Detection Phase.**

```
Task(
  subagent_type: "general",
  prompt: "You are the documentation-auditor agent. Perform a documentation audit of this codebase.

Check if code changes are reflected in project documentation.
Report findings with severity, file path, line number, related code change, and remediation.

Return findings as a structured markdown report with a JSON array of findings."
)
```

**CRITICAL:** Both security-auditor and code-quality-auditor MUST be launched. If you only launch one, the review is INCOMPLETE.

---

## Step 3: Track Progress
```

**Edit C — Insert Verification Step after Step 5:**

- [ ] **Step 3: Insert verification Step 5.5**

In `packages/code-review/src/commands/review.md`, find:

```
Mark "Collect agent results" as completed using `todowrite`.

---

## Step 7: Assign Issue IDs
```

Replace with:

```
Mark "Collect agent results" as completed using `todowrite`.

---

## Step 5.5: Verification

Verification always runs after collecting agent results.

### 5.5.1: Build findings bundle

```
findings = {
  security: [security auditor results],
  quality: [code quality auditor results],
  documentation: [documentation auditor results, if launched],
  performance: [your performance analysis from Step 4],
  architecture: [your architecture/maintainability analysis from Step 5]
}
```

### 5.5.2: Spawn Cross-Verifier

```
Task(
  subagent_type: "code-review:cross-verifier",
  prompt: "Analyze the following findings from a code review.

Here are the findings from all auditors:
{findings}

Identify correlations between security and quality findings.
Focus on cases where security vulnerabilities intersect with architectural issues.
Follow your output format exactly."
)
```

### 5.5.3: Spawn Challenger

```
Task(
  subagent_type: "code-review:challenger",
  prompt: "Review the following findings from a code review.

Here are the findings from all auditors:
{findings}

Challenge CRITICAL and HIGH findings from both security and quality auditors.
Check for false positives, especially in linter results and SAST output.
Follow your output format exactly."
)
```

### 5.5.4: Collect verification results

The Task tool returns results directly. Parse findings from both verification agents.

### 5.5.5: Merge enhanced findings

1. Apply Challenger decisions (remove false positives, adjust severity)
2. Add Cross-Verifier composite findings
3. Tag confirmed findings as `[verified]`

---

## Step 7: Assign Issue IDs
```

**Edit D — Update Post-Review Guidance (Step 10):**

- [ ] **Step 4: Update post-review guidance**

In `packages/code-review/src/commands/review.md`, find:

```
> **Found {N} issues.** To fix them:
>
> `/fix <paste issue block>` — fix a single issue by pasting
```

Replace with:

```
> **Found {N} issues.** To fix them:
>
> `/fix-report <saved-report-path>` — fix multiple issues interactively
>
> `/fix SEC-001` — fix a single issue by ID (uses latest saved report)
>
> `/fix <paste issue block>` — fix a single issue by pasting
```

And find:

```
> **Found {N} issues.** To fix individual issues, use:
>
> `/fix <paste issue block from above>`
>
> To use ID-based fixes, save the review first (re-run `/review` and choose to save).
```

Replace with:

```
> **Found {N} issues.** To fix individual issues, use:
>
> `/fix <paste issue block from above>`
>
> To use ID-based fixes or `/fix-report`, save the review first (re-run `/review` and choose to save).
```

- [ ] **Step 5: Verify review.md has no `model:` or `allowed-tools` frontmatter**

Run:
```bash
grep -n "model:\|allowed-tools" packages/code-review/src/commands/review.md || echo "OK: no disallowed frontmatter"
```

Expected: prints "OK: no disallowed frontmatter".

---

### Task 1.5: Update Plugin Factory (`src/index.ts`)

**Files:**
- Modify: `packages/code-review/src/index.ts`

- [ ] **Step 1: Add constants for new agent prompts**

In `packages/code-review/src/index.ts`, find:

```typescript
const SECURITY_AUDITOR_PROMPT = loadMarkdownFile("agents/security-auditor.md")
const CODE_QUALITY_AUDITOR_PROMPT = loadMarkdownFile("agents/code-quality-auditor.md")
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")
```

Replace with:

```typescript
const SECURITY_AUDITOR_PROMPT = loadMarkdownFile("agents/security-auditor.md")
const CODE_QUALITY_AUDITOR_PROMPT = loadMarkdownFile("agents/code-quality-auditor.md")
const DOCUMENTATION_AUDITOR_PROMPT = loadMarkdownFile("agents/documentation-auditor.md")
const CROSS_VERIFIER_PROMPT = loadMarkdownFile("agents/cross-verifier.md")
const CHALLENGER_PROMPT = loadMarkdownFile("agents/challenger.md")
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")
```

- [ ] **Step 2: Add descriptions and register agents**

In `packages/code-review/src/index.ts`, find:

```typescript
const SECURITY_AUDITOR_DESCRIPTION =
  "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance."

const CODE_QUALITY_AUDITOR_DESCRIPTION =
  "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis."

const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."
```

Replace with:

```typescript
const SECURITY_AUDITOR_DESCRIPTION =
  "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance."

const CODE_QUALITY_AUDITOR_DESCRIPTION =
  "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis."

const DOCUMENTATION_AUDITOR_DESCRIPTION =
  "Documentation auditor that verifies code changes are reflected in project documentation."

const CROSS_VERIFIER_DESCRIPTION =
  "Cross-domain correlation agent that finds intersections between security, quality, and documentation findings."

const CHALLENGER_DESCRIPTION =
  "Adversarial review agent that challenges findings for false positives and validates severity levels."

const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."
```

Then find:

```typescript
      config.agent["code-quality-auditor"] = {
        description: CODE_QUALITY_AUDITOR_DESCRIPTION,
        prompt: CODE_QUALITY_AUDITOR_PROMPT,
      }

      config.command = config.command ?? {}
```

Replace with:

```typescript
      config.agent["code-quality-auditor"] = {
        description: CODE_QUALITY_AUDITOR_DESCRIPTION,
        prompt: CODE_QUALITY_AUDITOR_PROMPT,
      }
      config.agent["documentation-auditor"] = {
        description: DOCUMENTATION_AUDITOR_DESCRIPTION,
        prompt: DOCUMENTATION_AUDITOR_PROMPT,
      }
      config.agent["cross-verifier"] = {
        description: CROSS_VERIFIER_DESCRIPTION,
        prompt: CROSS_VERIFIER_PROMPT,
      }
      config.agent["challenger"] = {
        description: CHALLENGER_DESCRIPTION,
        prompt: CHALLENGER_PROMPT,
      }

      config.command = config.command ?? {}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run:
```bash
cd packages/code-review && npm run typecheck
```

Expected: No errors.

---

### Task 1.6: Update Tests

**Files:**
- Modify: `packages/code-review/tests/plugin.test.ts`
- Modify: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Add registration tests for new agents**

In `packages/code-review/tests/plugin.test.ts`, find:

```typescript
  it("does not register any custom tools", async () => {
    const config: any = { command: {}, agent: {} }
    await pluginResult.config?.(config as never)
    expect(pluginResult.tool).toBeUndefined()
  })
})
```

Replace with:

```typescript
  it("config registers documentation-auditor agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["documentation-auditor"]).toBeDefined()
    expect(config.agent["documentation-auditor"].description).toBeDefined()
    expect(typeof config.agent["documentation-auditor"].prompt).toBe("string")
    expect(config.agent["documentation-auditor"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers cross-verifier agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["cross-verifier"]).toBeDefined()
    expect(config.agent["cross-verifier"].description).toBeDefined()
    expect(typeof config.agent["cross-verifier"].prompt).toBe("string")
    expect(config.agent["cross-verifier"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers challenger agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["challenger"]).toBeDefined()
    expect(config.agent["challenger"].description).toBeDefined()
    expect(typeof config.agent["challenger"].prompt).toBe("string")
    expect(config.agent["challenger"].prompt.length).toBeGreaterThan(0)
  })

  it("does not register any custom tools", async () => {
    const config: any = { command: {}, agent: {} }
    await pluginResult.config?.(config as never)
    expect(pluginResult.tool).toBeUndefined()
  })
})
```

- [ ] **Step 2: Add build-output tests for new agents**

In `packages/code-review/tests/build-output.test.ts`, find:

```typescript
  it("dist/agents/code-quality-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/code-quality-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
})
```

Replace with:

```typescript
  it("dist/agents/code-quality-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/code-quality-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/documentation-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/documentation-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/cross-verifier.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/cross-verifier.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/challenger.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/challenger.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 3: Run package tests**

Run:
```bash
cd packages/code-review && npm run test
```

Expected: All tests PASS.

---

### Task 1.7: Build and Verify Etap 1

- [ ] **Step 1: Build the package**

Run:
```bash
cd packages/code-review && npm run build
```

Expected: `dist/agents/documentation-auditor.md`, `dist/agents/cross-verifier.md`, `dist/agents/challenger.md` all exist.

- [ ] **Step 2: Verify dist contents**

Run:
```bash
ls packages/code-review/dist/agents/
```

Expected: Lists all 5 agent files including the 3 new ones.

- [ ] **Step 3: Commit Etap 1**

Run:
```bash
git add packages/code-review/src/agents/documentation-auditor.md \
  packages/code-review/src/agents/cross-verifier.md \
  packages/code-review/src/agents/challenger.md \
  packages/code-review/src/commands/review.md \
  packages/code-review/src/index.ts \
  packages/code-review/tests/plugin.test.ts \
  packages/code-review/tests/build-output.test.ts
```

Then commit:
```bash
git commit -m "feat(code-review): add verification agents (documentation-auditor, cross-verifier, challenger)

- New agents: documentation-auditor, cross-verifier, challenger
- Updated /review command with documentation detection and verification Step 5.5
- Updated post-review guidance to mention /fix-report"
```

---

## Etap 2: Fix Commands

### Task 2.1: Create `commands/fix.md`

**Files:**
- Create: `packages/code-review/src/commands/fix.md`

**Source:** Copy from `av-marketplace/plugins/code-review/commands/fix.md` (544 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` and `model: opus` from frontmatter. Keep `description` and `argument-hint`.
2. Replace ALL `TaskCreate`, `TaskUpdate`, `TaskList` with the `todowrite` tool:
   - `TaskCreate` table → create all tasks in one `todowrite` call at phase start.
   - `TaskUpdate "mark X as in_progress/completed"` → call `todowrite` with updated statuses.
3. Replace `AskUserQuestion` with the `question` tool (same parameters: `question`, `options`).
4. Replace `Skill(skill: "developer-plugins-integration")` with the **inline stack detection script** (copy from `review.md` Step 1: detect Python markers, load `load_python_skill` tools, detect Frontend/PHP markers).
5. Keep `Bash(...)`, `Read`, `Edit`, `Write`, `Glob`, `Grep` references unchanged — they use the same names in OpenCode.

Because the file is long, the recommended approach is to copy the original and apply the 5 transformations above programmatically or manually. After creation, verify with:

```bash
grep -n "model:\|allowed-tools" packages/code-review/src/commands/fix.md || echo "OK"
```

Expected: "OK".

---

### Task 2.2: Create `commands/fix-report.md`

**Files:**
- Create: `packages/code-review/src/commands/fix-report.md`

**Source:** Copy from `av-marketplace/plugins/code-review/commands/fix-report.md` (204 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` and `model: opus` from frontmatter. Keep `description` and `argument-hint`.
2. Replace `TaskCreate` / `TaskUpdate` with the `todowrite` tool.
3. Replace `AskUserQuestion` with the `question` tool.
4. Keep `Task` tool calls with `subagent_type: "code-review:fix-auto"` unchanged.

Verify after creation:

```bash
grep -n "model:\|allowed-tools" packages/code-review/src/commands/fix-report.md || echo "OK"
```

Expected: "OK".

---

### Task 2.3: Create `agents/fix-auto.md`

**Files:**
- Create: `packages/code-review/src/agents/fix-auto.md`

**Source:** Copy from `av-marketplace/plugins/code-review/agents/fix-auto.md` (337 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` from frontmatter. Add `name: fix-auto` and `description: Auto-fix subagent for code review issues. Performs analysis, implementation, verification, and reporting without asking for user confirmation. Invoked by /fix-report.`
2. Replace `TaskCreate` / `TaskUpdate` with the `todowrite` tool.
3. Replace `Skill(skill: "developer-plugins-integration")` with the **inline stack detection script** (same as in `review.md` Step 1).
4. Replace `AskUserQuestion` with the `question` tool (used in Phase 1 for missing required fields).

Verify after creation:

```bash
grep -n "allowed-tools" packages/code-review/src/agents/fix-auto.md || echo "OK"
```

Expected: "OK".

---

### Task 2.4: Update Plugin Factory (`src/index.ts`)

**Files:**
- Modify: `packages/code-review/src/index.ts`

- [ ] **Step 1: Add constants for fix command, fix-report command, and fix-auto agent**

In `packages/code-review/src/index.ts`, find:

```typescript
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")
```

Replace with:

```typescript
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")
const FIX_COMMAND_TEMPLATE = loadMarkdownFile("commands/fix.md")
const FIX_REPORT_COMMAND_TEMPLATE = loadMarkdownFile("commands/fix-report.md")
const FIX_AUTO_PROMPT = loadMarkdownFile("agents/fix-auto.md")
```

- [ ] **Step 2: Add descriptions**

In `packages/code-review/src/index.ts`, find:

```typescript
const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."
```

Replace with:

```typescript
const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."

const FIX_COMMAND_DESCRIPTION =
  "Apply fix for a single code review issue with verification and reporting."

const FIX_REPORT_COMMAND_DESCRIPTION =
  "Parse a saved review report, present issues as a checklist, fix selected issues, and mark them resolved."

const FIX_AUTO_DESCRIPTION =
  "Auto-fix subagent for code review issues. Performs analysis, implementation, verification, and reporting without user confirmation."
```

- [ ] **Step 3: Register new commands and agent**

In `packages/code-review/src/index.ts`, find:

```typescript
      config.command.review = {
        description: REVIEW_COMMAND_DESCRIPTION,
        template: REVIEW_COMMAND_TEMPLATE,
      }
```

Replace with:

```typescript
      config.command.review = {
        description: REVIEW_COMMAND_DESCRIPTION,
        template: REVIEW_COMMAND_TEMPLATE,
      }
      config.command.fix = {
        description: FIX_COMMAND_DESCRIPTION,
        template: FIX_COMMAND_TEMPLATE,
      }
      config.command["fix-report"] = {
        description: FIX_REPORT_COMMAND_DESCRIPTION,
        template: FIX_REPORT_COMMAND_TEMPLATE,
      }

      config.agent["fix-auto"] = {
        description: FIX_AUTO_DESCRIPTION,
        prompt: FIX_AUTO_PROMPT,
      }
```

- [ ] **Step 4: Run typecheck**

Run:
```bash
cd packages/code-review && npm run typecheck
```

Expected: No errors.

---

### Task 2.5: Update Tests

**Files:**
- Modify: `packages/code-review/tests/plugin.test.ts`
- Modify: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Add registration tests for fix command, fix-report command, and fix-auto agent**

In `packages/code-review/tests/plugin.test.ts`, find:

```typescript
  it("does not register any custom tools", async () => {
```

Insert immediately BEFORE that test:

```typescript
  it("config registers the fix command", async () => {
    const config: any = { command: {} }
    await pluginResult.config?.(config as never)
    expect(config.command.fix).toBeDefined()
    expect(config.command.fix.description).toBeDefined()
    expect(typeof config.command.fix.template).toBe("string")
    expect(config.command.fix.template.length).toBeGreaterThan(0)
  })

  it("config registers the fix-report command", async () => {
    const config: any = { command: {} }
    await pluginResult.config?.(config as never)
    expect(config.command["fix-report"]).toBeDefined()
    expect(config.command["fix-report"].description).toBeDefined()
    expect(typeof config.command["fix-report"].template).toBe("string")
    expect(config.command["fix-report"].template.length).toBeGreaterThan(0)
  })

  it("config registers fix-auto agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["fix-auto"]).toBeDefined()
    expect(config.agent["fix-auto"].description).toBeDefined()
    expect(typeof config.agent["fix-auto"].prompt).toBe("string")
    expect(config.agent["fix-auto"].prompt.length).toBeGreaterThan(0)
  })
```

- [ ] **Step 2: Add build-output tests for fix files**

In `packages/code-review/tests/build-output.test.ts`, find:

```typescript
  it("dist/agents/challenger.md exists and is non-empty", () => {
```

Insert immediately AFTER that test:

```typescript
  it("dist/commands/fix.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/fix.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/commands/fix-report.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/fix-report.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/fix-auto.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/fix-auto.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd packages/code-review && npm run test
```

Expected: All tests PASS.

---

### Task 2.6: Build and Verify Etap 2

- [ ] **Step 1: Build**

Run:
```bash
cd packages/code-review && npm run build
```

Expected: `dist/commands/fix.md`, `dist/commands/fix-report.md`, `dist/agents/fix-auto.md` exist.

- [ ] **Step 2: Commit Etap 2**

Run:
```bash
git add packages/code-review/src/commands/fix.md \
  packages/code-review/src/commands/fix-report.md \
  packages/code-review/src/agents/fix-auto.md \
  packages/code-review/src/index.ts \
  packages/code-review/tests/plugin.test.ts \
  packages/code-review/tests/build-output.test.ts
```

Then:
```bash
git commit -m "feat(code-review): add /fix and /fix-report commands with fix-auto agent

- /fix command for single issue repair (ID mode + paste mode)
- /fix-report command for batch fixing from saved reports
- fix-auto subagent for unattended auto-fix with verification
- Inline developer-plugins-integration detection in fix workflows"
```

---

## Etap 3: Feedback Analysis

### Task 3.1: Create `commands/analyze-feedback.md`

**Files:**
- Create: `packages/code-review/src/commands/analyze-feedback.md`

**Source:** Copy from `av-marketplace/plugins/code-review/commands/analyze-feedback.md` (380 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` and `model: opus` from frontmatter. Keep `description` and `argument-hint`.
2. Replace `AskUserQuestion` with the `question` tool (in Phase 6).
3. Keep `Task` tool calls with `subagent_type: "code-review:feedback-analyzer"` unchanged.
4. Keep `Bash(gh:*)` references as plain bash blocks.

Verify after creation:

```bash
grep -n "model:\|allowed-tools" packages/code-review/src/commands/analyze-feedback.md || echo "OK"
```

Expected: "OK".

---

### Task 3.2: Create `agents/feedback-analyzer.md`

**Files:**
- Create: `packages/code-review/src/agents/feedback-analyzer.md`

**Source:** Copy from `av-marketplace/plugins/code-review/agents/feedback-analyzer.md` (82 lines) and apply the transformations below.

**Transformations required:**
1. Remove `tools: Read, Glob, Grep, Bash(git:*)` and `model: opus` from frontmatter.
2. Keep `name: feedback-analyzer` and `description: Analyze single PR comment for validity and generate response if needed.`

Verify after creation:

```bash
head -n 4 packages/code-review/src/agents/feedback-analyzer.md
```

Expected: Shows name, description, no tools or model.

---

### Task 3.3: Update Plugin Factory (`src/index.ts`)

**Files:**
- Modify: `packages/code-review/src/index.ts`

- [ ] **Step 1: Add constants for analyze-feedback command and feedback-analyzer agent**

In `packages/code-review/src/index.ts`, find:

```typescript
const FIX_AUTO_PROMPT = loadMarkdownFile("agents/fix-auto.md")
```

Replace with:

```typescript
const FIX_AUTO_PROMPT = loadMarkdownFile("agents/fix-auto.md")
const ANALYZE_FEEDBACK_COMMAND_TEMPLATE = loadMarkdownFile("commands/analyze-feedback.md")
const FEEDBACK_ANALYZER_PROMPT = loadMarkdownFile("agents/feedback-analyzer.md")
```

- [ ] **Step 2: Add descriptions**

In `packages/code-review/src/index.ts`, find:

```typescript
const FIX_AUTO_DESCRIPTION =
  "Auto-fix subagent for code review issues. Performs analysis, implementation, verification, and reporting without user confirmation."
```

Replace with:

```typescript
const FIX_AUTO_DESCRIPTION =
  "Auto-fix subagent for code review issues. Performs analysis, implementation, verification, and reporting without user confirmation."

const ANALYZE_FEEDBACK_COMMAND_DESCRIPTION =
  "Analyze PR feedback comments, classify them, and generate response drafts."

const FEEDBACK_ANALYZER_DESCRIPTION =
  "Analyze single PR comment for validity and generate response if needed."
```

- [ ] **Step 3: Register new command and agent**

In `packages/code-review/src/index.ts`, find:

```typescript
      config.agent["fix-auto"] = {
        description: FIX_AUTO_DESCRIPTION,
        prompt: FIX_AUTO_PROMPT,
      }
```

Replace with:

```typescript
      config.agent["fix-auto"] = {
        description: FIX_AUTO_DESCRIPTION,
        prompt: FIX_AUTO_PROMPT,
      }
      config.agent["feedback-analyzer"] = {
        description: FEEDBACK_ANALYZER_DESCRIPTION,
        prompt: FEEDBACK_ANALYZER_PROMPT,
      }

      config.command["analyze-feedback"] = {
        description: ANALYZE_FEEDBACK_COMMAND_DESCRIPTION,
        template: ANALYZE_FEEDBACK_COMMAND_TEMPLATE,
      }
```

- [ ] **Step 4: Run typecheck**

Run:
```bash
cd packages/code-review && npm run typecheck
```

Expected: No errors.

---

### Task 3.4: Update Tests

**Files:**
- Modify: `packages/code-review/tests/plugin.test.ts`
- Modify: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Add registration tests for analyze-feedback command and feedback-analyzer agent**

In `packages/code-review/tests/plugin.test.ts`, find:

```typescript
  it("config registers fix-auto agent", async () => {
```

Insert immediately BEFORE that test:

```typescript
  it("config registers the analyze-feedback command", async () => {
    const config: any = { command: {} }
    await pluginResult.config?.(config as never)
    expect(config.command["analyze-feedback"]).toBeDefined()
    expect(config.command["analyze-feedback"].description).toBeDefined()
    expect(typeof config.command["analyze-feedback"].template).toBe("string")
    expect(config.command["analyze-feedback"].template.length).toBeGreaterThan(0)
  })

  it("config registers feedback-analyzer agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["feedback-analyzer"]).toBeDefined()
    expect(config.agent["feedback-analyzer"].description).toBeDefined()
    expect(typeof config.agent["feedback-analyzer"].prompt).toBe("string")
    expect(config.agent["feedback-analyzer"].prompt.length).toBeGreaterThan(0)
  })
```

- [ ] **Step 2: Add build-output tests for feedback files**

In `packages/code-review/tests/build-output.test.ts`, find:

```typescript
  it("dist/agents/fix-auto.md exists and is non-empty", () => {
```

Insert immediately AFTER that test:

```typescript
  it("dist/commands/analyze-feedback.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/analyze-feedback.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/feedback-analyzer.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/feedback-analyzer.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd packages/code-review && npm run test
```

Expected: All tests PASS.

---

### Task 3.5: Build and Verify Etap 3

- [ ] **Step 1: Build**

Run:
```bash
cd packages/code-review && npm run build
```

Expected: `dist/commands/analyze-feedback.md`, `dist/agents/feedback-analyzer.md` exist.

- [ ] **Step 2: Commit Etap 3**

Run:
```bash
git add packages/code-review/src/commands/analyze-feedback.md \
  packages/code-review/src/agents/feedback-analyzer.md \
  packages/code-review/src/index.ts \
  packages/code-review/tests/plugin.test.ts \
  packages/code-review/tests/build-output.test.ts
```

Then:
```bash
git commit -m "feat(code-review): add /analyze-feedback command and feedback-analyzer agent

- /analyze-feedback command for PR comment classification
- feedback-analyzer subagent for per-comment validity analysis
- GitHub CLI integration for comment publishing"
```

---

## Etap 4: Skill Integration

### Task 4.1: Create Skill-Agent `agents/skill-secret-scanner.md`

**Files:**
- Create: `packages/code-review/src/agents/skill-secret-scanner.md`

**Source:** Copy from `av-marketplace/plugins/code-review/skills/secret-scanning/SKILL.md` (268 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` from frontmatter. Keep `name: skill-secret-scanner` and `description: Detects and handles sensitive information in code. Use when reviewing code for secret leaks and hard-coded credentials.`
2. The body uses `Read`, `Grep`, `Glob`, `Bash` tool names inside instructions — these are the same in OpenCode, so no changes needed.

Verify after creation:

```bash
grep -n "allowed-tools" packages/code-review/src/agents/skill-secret-scanner.md || echo "OK"
```

Expected: "OK".

---

### Task 4.2: Create Skill-Agent `agents/skill-sast-analyzer.md`

**Files:**
- Create: `packages/code-review/src/agents/skill-sast-analyzer.md`

**Source:** Copy from `av-marketplace/plugins/code-review/skills/sast-analysis/SKILL.md` (465 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` from frontmatter. Keep `name: skill-sast-analyzer` and `description: Static Application Security Testing (SAST) for multi-language codebases. Uses Semgrep and language-specific tools to detect vulnerabilities across Python, JavaScript, TypeScript, Go, Java, and more.`
2. Body tool references are compatible with OpenCode.

Verify after creation:

```bash
grep -n "allowed-tools" packages/code-review/src/agents/skill-sast-analyzer.md || echo "OK"
```

Expected: "OK".

---

### Task 4.3: Create Skill-Agent `agents/skill-dependency-scanner.md`

**Files:**
- Create: `packages/code-review/src/agents/skill-dependency-scanner.md`

**Source:** Copy from `av-marketplace/plugins/code-review/skills/dependency-scanning/SKILL.md` (473 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` from frontmatter. Keep `name: skill-dependency-scanner` and `description: Scans project dependencies for known vulnerabilities (CVEs). Supports Python (uv, pip, poetry), JavaScript, Go, Java, and other languages. Addresses OWASP A03:2025 - Software Supply Chain Failures.`
2. Body tool references are compatible with OpenCode.

Verify after creation:

```bash
grep -n "allowed-tools" packages/code-review/src/agents/skill-dependency-scanner.md || echo "OK"
```

Expected: "OK".

---

### Task 4.4: Create Skill-Agent `agents/skill-architecture-analyzer.md`

**Files:**
- Create: `packages/code-review/src/agents/skill-architecture-analyzer.md`

**Source:** Copy from `av-marketplace/plugins/code-review/skills/architecture-analysis/SKILL.md` (433 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` from frontmatter. Keep `name: skill-architecture-analyzer` and `description: Analyzes codebase for SOLID principles violations, DDD patterns compliance, Clean Architecture layer dependencies, and common anti-patterns. Works with Python and TypeScript, with language-agnostic pattern detection.`
2. Body tool references are compatible with OpenCode.

Verify after creation:

```bash
grep -n "allowed-tools" packages/code-review/src/agents/skill-architecture-analyzer.md || echo "OK"
```

Expected: "OK".

---

### Task 4.5: Create Skill-Agent `agents/skill-linter-integrator.md`

**Files:**
- Create: `packages/code-review/src/agents/skill-linter-integrator.md`

**Source:** Copy from `av-marketplace/plugins/code-review/skills/linter-integration/SKILL.md` (443 lines) and apply the transformations below.

**Transformations required:**
1. Remove `allowed-tools` from frontmatter. Keep `name: skill-linter-integrator` and `description: Auto-detects and runs project-specific linters, formatters, and typecheckers. Supports Python (ruff, mypy, black, flake8, pylint) and TypeScript (eslint, tsc, prettier). Uses existing project configuration.`
2. Body tool references are compatible with OpenCode.

Verify after creation:

```bash
grep -n "allowed-tools" packages/code-review/src/agents/skill-linter-integrator.md || echo "OK"
```

Expected: "OK".

---

### Task 4.6: Update `agents/security-auditor.md` (Skill-Agent Invocations)

**Files:**
- Modify: `packages/code-review/src/agents/security-auditor.md`

Replace Steps 1-3 with invocations of the three security skill-agents via the `Task` tool.

- [ ] **Step 1: Replace Secret Scanning step**

In `packages/code-review/src/agents/security-auditor.md`, find:

```markdown
### Step 1: Secret Scanning (MANDATORY)

Detect hard-coded secrets in the codebase. Do NOT skip this step.
```

Replace with:

```markdown
### Step 1: Secret Scanning (MANDATORY)

Spawn the `skill-secret-scanner` subagent to perform comprehensive secret scanning.

Use the Task tool:
- subagent_type: "code-review:skill-secret-scanner"
- prompt: "Scan the current project for hardcoded secrets, API keys, passwords, tokens, and credentials. Report all findings with file path, line number, secret type, and severity."

Collect the results and include them in your findings.
```

- [ ] **Step 2: Replace SAST Analysis step**

In `packages/code-review/src/agents/security-auditor.md`, find:

```markdown
### Step 2: SAST Analysis (MANDATORY)

Run static application security testing to detect vulnerabilities.
```

Replace with:

```markdown
### Step 2: SAST Analysis (MANDATORY)

Spawn the `skill-sast-analyzer` subagent to perform static application security testing.

Use the Task tool:
- subagent_type: "code-review:skill-sast-analyzer"
- prompt: "Run SAST analysis on the current project. Detect injection flaws, broken access control, cryptographic failures, insecure design, misconfigurations, and vulnerable components. Report all findings with CWE, OWASP category, file, line, and remediation."

Collect the results and include them in your findings.
```

- [ ] **Step 3: Replace Dependency Scanning step**

In `packages/code-review/src/agents/security-auditor.md`, find:

```markdown
### Step 3: Dependency Scanning (MANDATORY)

Check for vulnerable dependencies.
```

Replace with:

```markdown
### Step 3: Dependency Scanning (MANDATORY)

Spawn the `skill-dependency-scanner` subagent to check for vulnerable dependencies.

Use the Task tool:
- subagent_type: "code-review:skill-dependency-scanner"
- prompt: "Scan project dependencies for known vulnerabilities (CVEs). Check Python (uv/pip/poetry), JavaScript (npm/yarn/pnpm), Go (govulncheck), Java, Ruby, and PHP. Report findings with package name, installed version, CVE, severity, and fixed version."

Collect the results and include them in your findings.
```

- [ ] **Step 4: Verify no `model:` or `allowed-tools` was added**

Run:
```bash
grep -n "model:\|allowed-tools" packages/code-review/src/agents/security-auditor.md || echo "OK"
```

Expected: "OK".

---

### Task 4.7: Update `agents/code-quality-auditor.md` (Skill-Agent Invocations + Inline Standards)

**Files:**
- Modify: `packages/code-review/src/agents/code-quality-auditor.md`

Make two sets of edits.

**Edit A — Expand Step 1 (Standards Discovery) with inline standards-discovery skill:**

- [ ] **Step 1: Expand Standards Discovery**

In `packages/code-review/src/agents/code-quality-auditor.md`, find:

```markdown
### Step 1: Standards Discovery (MANDATORY)

Find project coding standards. Do NOT skip this step.

**Key checks:**
- `CONTRIBUTING.md` — coding conventions, PR requirements
- `CODING_STANDARDS.md` or `STYLE_GUIDE.md`
- `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`
- `README.md` development sections
- `CLAUDE.md` or `.claude/` project-specific instructions
- `.editorconfig`, `.prettierrc`, `pyproject.toml` tool configs

**Project-specific rules always override generic best practices.**

**Record discovered standards** and reference them in all subsequent analysis.
```

Replace with:

```markdown
### Step 1: Standards Discovery (MANDATORY)

Find project coding standards. Do NOT skip this step.

**Key checks:**
- `CONTRIBUTING.md` — coding conventions, PR requirements
- `CODING_STANDARDS.md` or `STYLE_GUIDE.md`
- `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`
- `README.md` development sections
- `CLAUDE.md` or `.claude/` project-specific instructions
- `.editorconfig`, `.prettierrc`, `pyproject.toml` tool configs

**Discovery workflow:**

1. Search for standards files:
   ```bash
   find . -type f \\( \\
     -iname "CONTRIBUTING*" -o \\
     -iname "CODING*STANDARD*" -o \\
     -iname "STYLE*GUIDE*" -o \\
     -iname "CODE*STYLE*" -o \\
     -iname "CONVENTIONS*" -o \\
     -iname "ARCHITECTURE*" -o \\
     -iname "GUIDELINES*" -o \\
     -iname "DEVELOPMENT*" -o \\
     -iname "STANDARDS*" \\
   \\) -not -path "./.git/*" -not -path "./node_modules/*" -not -path "./.venv/*" -not -path "./vendor/*" 2>/dev/null
   ```

2. Check common locations:
   - `CONTRIBUTING.md` — HIGH priority
   - `docs/ARCHITECTURE.md` — HIGH priority
   - `docs/CODING_STANDARDS.md` — HIGH priority
   - `README.md` — LOW priority

3. Parse README for standards section:
   ```bash
   grep -n -i -A 20 "## Development\\|## Contributing\\|## Code Style\\|## Standards\\|## Guidelines" README.md 2>/dev/null
   ```

4. Search for naming conventions:
   ```bash
   grep -rni "naming convention\\|camelCase\\|snake_case\\|PascalCase\\|kebab-case\\|UPPER_CASE" --include="*.md" . 2>/dev/null
   ```

5. Search for architecture mentions:
   ```bash
   grep -rni "clean architecture\\|hexagonal\\|DDD\\|domain.driven\\|layered\\|SOLID" --include="*.md" . 2>/dev/null
   ```

6. Search for testing requirements:
   ```bash
   grep -rni "test coverage\\|unit test\\|integration test\\|pytest\\|jest\\|testing" --include="*.md" . 2>/dev/null
   ```

7. Search for import rules:
   ```bash
   grep -rni "import\\|absolute import\\|relative import\\|circular\\|dependency" --include="*.md" . 2>/dev/null
   ```

**Project-specific rules always override generic best practices.**

**Record discovered standards** and reference them in all subsequent analysis.
```

**Edit B — Replace Steps 2-3 with skill-agent invocations:**

- [ ] **Step 2: Replace Linter Integration**

In `packages/code-review/src/agents/code-quality-auditor.md`, find:

```markdown
### Step 2: Linter Integration (MANDATORY)

Run project linters and typecheckers. Do NOT proceed without linter results.
```

Replace with:

```markdown
### Step 2: Linter Integration (MANDATORY)

Spawn the `skill-linter-integrator` subagent to run project linters and typecheckers.

Use the Task tool:
- subagent_type: "code-review:skill-linter-integrator"
- prompt: "Run all project-configured linters and typecheckers. Detect Python (ruff, mypy, black, flake8, pylint) and TypeScript (eslint, tsc, prettier). Use existing project configuration files. Report all findings with file, line, severity, rule, and message."

Collect the results and include them in your findings.
```

- [ ] **Step 3: Replace Architecture Analysis**

In `packages/code-review/src/agents/code-quality-auditor.md`, find:

```markdown
### Step 3: Architecture Analysis (MANDATORY)

Perform design pattern verification.
```

Replace with:

```markdown
### Step 3: Architecture Analysis (MANDATORY)

Spawn the `skill-architecture-analyzer` subagent to perform design pattern verification.

Use the Task tool:
- subagent_type: "code-review:skill-architecture-analyzer"
- prompt: "Analyze the codebase for SOLID principles violations, DDD patterns compliance, Clean Architecture layer dependencies, and common anti-patterns (God Objects, Circular Dependencies, Deep Inheritance). Report findings with severity, principle, file, line, remediation, and code examples."

Collect the results and include them in your findings.
```

- [ ] **Step 4: Verify no disallowed frontmatter**

Run:
```bash
grep -n "model:\|allowed-tools" packages/code-review/src/agents/code-quality-auditor.md || echo "OK"
```

Expected: "OK".

---

### Task 4.8: Update Inline Developer Plugins Integration

**Files:**
- Modify: `packages/code-review/src/commands/review.md`
- Modify: `packages/code-review/src/commands/fix.md`
- Modify: `packages/code-review/src/agents/fix-auto.md`

The inline developer-plugins-integration script must detect Python, Frontend, and PHP stacks. The current `review.md` Step 1 already detects Python. Expand it to also detect Frontend and PHP, matching the logic from `av-marketplace/plugins/code-review/skills/developer-plugins-integration/SKILL.md`.

- [ ] **Step 1: Expand stack detection in `commands/review.md`**

In `packages/code-review/src/commands/review.md`, find:

```markdown
1. Check for Python project markers:
   - `pyproject.toml` exists
   - `requirements.txt` exists
   - `setup.py` exists
   - `**/*.py` files present in project

2. If Python detected, load relevant python-developer skills:
```

Replace with:

```markdown
1. Check for Python project markers:
   - `pyproject.toml` exists
   - `requirements.txt` exists
   - `setup.py` exists
   - `**/*.py` files present in project

2. If Python detected, load relevant python-developer skills:
```

Then find:

```markdown
   Load each using the `load_python_skill` tool:
   ```
   Call the tool `load_python_skill` with name `<skill-name>`
   ```

3. Store the list of successfully loaded skills in `skills_to_load`.
```

Replace with:

```markdown
   Load each using the `load_python_skill` tool:
   ```
   Call the tool `load_python_skill` with name `<skill-name>`
   ```

3. Check for Frontend project markers:
   - `package.json` exists and contains `"react"` in dependencies
   - `tsconfig.json` exists

4. If Frontend detected, note frameworks for later reference:
   - tailwindcss, zustand, tanstack query, react hook form, pnpm

5. Check for PHP project markers:
   - `composer.json` exists
   - `symfony.lock` exists

6. Store the list of successfully loaded skills in `skills_to_load`.
```

Apply the **same expansion** to `commands/fix.md` Phase 2 Step 2.5 and `agents/fix-auto.md` Phase 2 Step 2.5.

---

### Task 4.9: Update Plugin Factory (`src/index.ts`)

**Files:**
- Modify: `packages/code-review/src/index.ts`

- [ ] **Step 1: Add constants for all 5 skill-agents**

In `packages/code-review/src/index.ts`, find:

```typescript
const FEEDBACK_ANALYZER_PROMPT = loadMarkdownFile("agents/feedback-analyzer.md")
```

Replace with:

```typescript
const FEEDBACK_ANALYZER_PROMPT = loadMarkdownFile("agents/feedback-analyzer.md")
const SECRET_SCANNER_PROMPT = loadMarkdownFile("agents/skill-secret-scanner.md")
const SAST_ANALYZER_PROMPT = loadMarkdownFile("agents/skill-sast-analyzer.md")
const DEPENDENCY_SCANNER_PROMPT = loadMarkdownFile("agents/skill-dependency-scanner.md")
const ARCHITECTURE_ANALYZER_PROMPT = loadMarkdownFile("agents/skill-architecture-analyzer.md")
const LINTER_INTEGRATOR_PROMPT = loadMarkdownFile("agents/skill-linter-integrator.md")
```

- [ ] **Step 2: Add descriptions**

In `packages/code-review/src/index.ts`, find:

```typescript
const FEEDBACK_ANALYZER_DESCRIPTION =
  "Analyze single PR comment for validity and generate response if needed."
```

Replace with:

```typescript
const FEEDBACK_ANALYZER_DESCRIPTION =
  "Analyze single PR comment for validity and generate response if needed."

const SECRET_SCANNER_DESCRIPTION =
  "Detects and handles sensitive information in code. Use when reviewing code for secret leaks and hard-coded credentials."

const SAST_ANALYZER_DESCRIPTION =
  "Static Application Security Testing (SAST) for multi-language codebases. Uses Semgrep and language-specific tools."

const DEPENDENCY_SCANNER_DESCRIPTION =
  "Scans project dependencies for known vulnerabilities (CVEs). Supports Python, JavaScript, Go, Java, and more."

const ARCHITECTURE_ANALYZER_DESCRIPTION =
  "Analyzes codebase for SOLID principles violations, DDD patterns compliance, Clean Architecture layer dependencies, and anti-patterns."

const LINTER_INTEGRATOR_DESCRIPTION =
  "Auto-detects and runs project-specific linters, formatters, and typecheckers. Supports Python and TypeScript."
```

- [ ] **Step 3: Register all 5 skill-agents**

In `packages/code-review/src/index.ts`, find:

```typescript
      config.command["analyze-feedback"] = {
        description: ANALYZE_FEEDBACK_COMMAND_DESCRIPTION,
        template: ANALYZE_FEEDBACK_COMMAND_TEMPLATE,
      }
```

Replace with:

```typescript
      config.command["analyze-feedback"] = {
        description: ANALYZE_FEEDBACK_COMMAND_DESCRIPTION,
        template: ANALYZE_FEEDBACK_COMMAND_TEMPLATE,
      }

      config.agent["skill-secret-scanner"] = {
        description: SECRET_SCANNER_DESCRIPTION,
        prompt: SECRET_SCANNER_PROMPT,
      }
      config.agent["skill-sast-analyzer"] = {
        description: SAST_ANALYZER_DESCRIPTION,
        prompt: SAST_ANALYZER_PROMPT,
      }
      config.agent["skill-dependency-scanner"] = {
        description: DEPENDENCY_SCANNER_DESCRIPTION,
        prompt: DEPENDENCY_SCANNER_PROMPT,
      }
      config.agent["skill-architecture-analyzer"] = {
        description: ARCHITECTURE_ANALYZER_DESCRIPTION,
        prompt: ARCHITECTURE_ANALYZER_PROMPT,
      }
      config.agent["skill-linter-integrator"] = {
        description: LINTER_INTEGRATOR_DESCRIPTION,
        prompt: LINTER_INTEGRATOR_PROMPT,
      }
```

- [ ] **Step 4: Run typecheck**

Run:
```bash
cd packages/code-review && npm run typecheck
```

Expected: No errors.

---

### Task 4.10: Update Tests

**Files:**
- Modify: `packages/code-review/tests/plugin.test.ts`
- Modify: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Add registration tests for all 5 skill-agents**

In `packages/code-review/tests/plugin.test.ts`, find:

```typescript
  it("does not register any custom tools", async () => {
```

Insert immediately BEFORE that test:

```typescript
  it("config registers skill-secret-scanner agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["skill-secret-scanner"]).toBeDefined()
    expect(config.agent["skill-secret-scanner"].description).toBeDefined()
    expect(typeof config.agent["skill-secret-scanner"].prompt).toBe("string")
    expect(config.agent["skill-secret-scanner"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers skill-sast-analyzer agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["skill-sast-analyzer"]).toBeDefined()
    expect(config.agent["skill-sast-analyzer"].description).toBeDefined()
    expect(typeof config.agent["skill-sast-analyzer"].prompt).toBe("string")
    expect(config.agent["skill-sast-analyzer"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers skill-dependency-scanner agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["skill-dependency-scanner"]).toBeDefined()
    expect(config.agent["skill-dependency-scanner"].description).toBeDefined()
    expect(typeof config.agent["skill-dependency-scanner"].prompt).toBe("string")
    expect(config.agent["skill-dependency-scanner"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers skill-architecture-analyzer agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["skill-architecture-analyzer"]).toBeDefined()
    expect(config.agent["skill-architecture-analyzer"].description).toBeDefined()
    expect(typeof config.agent["skill-architecture-analyzer"].prompt).toBe("string")
    expect(config.agent["skill-architecture-analyzer"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers skill-linter-integrator agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["skill-linter-integrator"]).toBeDefined()
    expect(config.agent["skill-linter-integrator"].description).toBeDefined()
    expect(typeof config.agent["skill-linter-integrator"].prompt).toBe("string")
    expect(config.agent["skill-linter-integrator"].prompt.length).toBeGreaterThan(0)
  })
```

- [ ] **Step 2: Add build-output tests for all 5 skill-agents**

In `packages/code-review/tests/build-output.test.ts`, find:

```typescript
  it("dist/agents/feedback-analyzer.md exists and is non-empty", () => {
```

Insert immediately AFTER that test:

```typescript
  it("dist/agents/skill-secret-scanner.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-secret-scanner.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-sast-analyzer.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-sast-analyzer.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-dependency-scanner.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-dependency-scanner.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-architecture-analyzer.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-architecture-analyzer.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-linter-integrator.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-linter-integrator.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd packages/code-review && npm run test
```

Expected: All tests PASS.

---

### Task 4.11: Build and Verify Etap 4

- [ ] **Step 1: Build**

Run:
```bash
cd packages/code-review && npm run build
```

Expected: All 5 new skill-agent `.md` files exist in `dist/agents/`.

- [ ] **Step 2: Run root tests**

Run:
```bash
npm run test
```

Expected: Root tests + all workspace tests PASS.

- [ ] **Step 3: Run root typecheck**

Run:
```bash
npm run typecheck
```

Expected: No errors across root and all workspaces.

- [ ] **Step 4: Run root build**

Run:
```bash
npm run build
```

Expected: Builds all workspaces successfully.

- [ ] **Step 5: Verify packaging**

Run:
```bash
npm pack --dry-run 2>&1 | grep -E "(code-review|skill-|fix|analyze-feedback)"
```

Expected: Shows `packages/code-review/dist/...` files including new commands and agents.

- [ ] **Step 6: Commit Etap 4 (skills)**

Run:
```bash
git add packages/code-review/src/agents/skill-secret-scanner.md \
  packages/code-review/src/agents/skill-sast-analyzer.md \
  packages/code-review/src/agents/skill-dependency-scanner.md \
  packages/code-review/src/agents/skill-architecture-analyzer.md \
  packages/code-review/src/agents/skill-linter-integrator.md \
  packages/code-review/src/agents/security-auditor.md \
  packages/code-review/src/agents/code-quality-auditor.md \
  packages/code-review/src/commands/review.md \
  packages/code-review/src/commands/fix.md \
  packages/code-review/src/agents/fix-auto.md \
  packages/code-review/src/index.ts \
  packages/code-review/tests/plugin.test.ts \
  packages/code-review/tests/build-output.test.ts
```

Then:
```bash
git commit -m "feat(code-review): add skill-agents and integrate into auditor workflows

- 5 new skill-agents: secret-scanner, sast-analyzer, dependency-scanner, architecture-analyzer, linter-integrator
- security-auditor now delegates Steps 1-3 to skill-agents via Task tool
- code-quality-auditor now delegates Steps 2-3 to skill-agents; expanded Step 1 with inline standards-discovery
- Inline developer-plugins-integration expanded to detect Frontend and PHP stacks
- All skill-agents registered in plugin factory and covered by tests"
```

---

### Task 4.12: Update Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/plugins/code-review.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update `README.md`**

Make the following changes in root `README.md`:

1. **Package count badge** — change to `[![Package](https://img.shields.io/badge/package-3-blue.svg)]`
2. **Introduction paragraph** — add: "The `/fix`, `/fix-report`, and `/analyze-feedback` commands provide automated issue remediation and PR feedback analysis."
3. **Usage section** — add subsections:
   - `/fix <issue-id | paste>` — fix single issue
   - `/fix-report <path>` — batch fix from report
   - `/analyze-feedback [pr-number]` — PR comment classification
4. **Available Commands & Agents table** — add rows:
   - `fix` | Fix single issue by ID or paste
   - `fix-report` | Batch fix from saved report
   - `analyze-feedback` | PR feedback analysis
   - `documentation-auditor` | Documentation audit agent
   - `cross-verifier` | Cross-domain correlation agent
   - `challenger` | Adversarial review agent
   - `feedback-analyzer` | Per-comment classification agent
   - `fix-auto` | Auto-fix subagent
   - `skill-secret-scanner` | Secret scanning skill-agent
   - `skill-sast-analyzer` | SAST analysis skill-agent
   - `skill-dependency-scanner` | Dependency scanning skill-agent
   - `skill-architecture-analyzer` | Architecture analysis skill-agent
   - `skill-linter-integrator` | Linter integration skill-agent
5. **Repository Structure** — add `packages/code-review/src/agents/skill-*.md` entries
6. **Documentation list** — ensure `docs/plugins/code-review.md` is listed

- [ ] **Step 2: Update `docs/plugins/code-review.md`**

Expand the per-plugin guide to document:
- All 4 commands (`/review`, `/fix`, `/fix-report`, `/analyze-feedback`) with usage examples
- All 12 agents with descriptions
- Skill integration strategy (hybrid inline + skill-agent)
- Architecture table of registered elements

- [ ] **Step 3: Update `AGENTS.md`**

In `AGENTS.md`, update:
- Plugin count in layout table (now 3 plugins)
- Package structure table — add all new agents and commands
- Published files count — verify `packages/code-review/dist` still covers all files

- [ ] **Step 4: Commit documentation**

Run:
```bash
git add README.md docs/plugins/code-review.md AGENTS.md
```

Then:
```bash
git commit -m "docs(code-review): document Phase 2 commands, agents, and skill-agents

- README: updated package count, usage sections, command/agent table
- docs/plugins/code-review.md: expanded per-plugin guide
- AGENTS.md: updated plugin counts and structure"
```

---

## Self-Review Checklist

After completing all tasks, verify:

### 1. Spec Coverage

| Spec Requirement | Implementing Task(s) |
|------------------|----------------------|
| Verification workflow (cross-verifier, challenger, documentation-auditor) | Task 1.1–1.7 |
| Fix commands (`/fix`, `/fix-report`) | Task 2.1–2.6 |
| Feedback analysis (`/analyze-feedback`) | Task 3.1–3.5 |
| Skill integration — 5 skill-agents | Task 4.1–4.5, 4.9 |
| security-auditor uses skill-agents | Task 4.6 |
| code-quality-auditor uses skill-agents + inline standards | Task 4.7 |
| Inline developer-plugins-integration in review, fix, fix-auto | Task 4.8 |
| Plugin factory registers everything | Task 1.5, 2.4, 3.3, 4.9 |
| Tests cover all commands and agents | Task 1.6, 2.5, 3.4, 4.10 |
| Build output tests cover all `.md` files | Task 1.6, 2.5, 3.4, 4.10 |
| Documentation updated | Task 4.12 |

**Gaps:** None identified.

### 2. Placeholder Scan

Search the plan for these red flags:
- [ ] "TBD" / "TODO" / "implement later" / "fill in details" — **None found**
- [ ] "Add appropriate error handling" without code — **None found**
- [ ] "Write tests for the above" without test code — **None found**
- [ ] "Similar to Task N" without repeating code — **None found**

### 3. Type Consistency

- [ ] All agent names use kebab-case: `documentation-auditor`, `cross-verifier`, `challenger`, `feedback-analyzer`, `fix-auto`
- [ ] All skill-agent names use `skill-` prefix: `skill-secret-scanner`, `skill-sast-analyzer`, `skill-dependency-scanner`, `skill-architecture-analyzer`, `skill-linter-integrator`
- [ ] All command names match template file names: `review`, `fix`, `fix-report`, `analyze-feedback`
- [ ] `src/index.ts` loads each `.md` file exactly once with matching constant names
- [ ] Test assertions check `.description`, `.template`, and `.prompt` consistently

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-22-code-review-phase2.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

**Which approach would you like?**
