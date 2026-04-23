# Improve Code Review Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `synthesis-agent`, enhance verification prompts, and introduce structured markdown I/O to the `/review` pipeline so findings are deduplicated, composited, and grouped into actionable PRs.

**Architecture:** A new `synthesis-agent` is inserted between verification and final report generation. All agents (auditors, cross-verifier, challenger) are upgraded to emit structured markdown (`### FINDING` blocks) with mandatory reasoning tables. The `/review` command orchestrates the new flow.

**Tech Stack:** TypeScript (ESM), OpenCode Plugin API, Vitest, Markdown prompts

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/code-review/src/agents/synthesis-agent.md` | **NEW** — deduplicates, composites, groups findings into PRs, adds remediation code. |
| `packages/code-review/src/agents/cross-verifier.md` | **MODIFY** — add mandatory workflow steps + strict output tables. |
| `packages/code-review/src/agents/challenger.md` | **MODIFY** — add mandatory workflow steps + strict output tables + evidence requirements. |
| `packages/code-review/src/agents/security-auditor.md` | **MODIFY** — add structured markdown output format section. |
| `packages/code-review/src/agents/code-quality-auditor.md` | **MODIFY** — add structured markdown output format section. |
| `packages/code-review/src/agents/documentation-auditor.md` | **MODIFY** — add structured markdown output format section. |
| `packages/code-review/src/commands/review.md` | **MODIFY** — insert Synthesis step, update final report format, add structured I/O instructions. |
| `packages/code-review/src/index.ts` | **MODIFY** — register `synthesis-agent` in `AGENTS` array. |
| `packages/code-review/tests/plugin.test.ts` | **MODIFY** — add `synthesis-agent` to `EXPECTED_AGENTS`. |
| `packages/code-review/tests/build-output.test.ts` | **MODIFY** — add `agents/synthesis-agent.md` to `EXPECTED_FILES`. |

---

## Task 1: Create `synthesis-agent.md`

**Files:**
- Create: `packages/code-review/src/agents/synthesis-agent.md`

- [ ] **Step 1: Write the agent markdown file**

Create `packages/code-review/src/agents/synthesis-agent.md` with the following exact content:

```markdown
---
name: synthesis-agent
description: Synthesis agent for code review. Deduplicates findings, builds composite findings from shared root causes, groups findings into recommended PRs, and generates ready-to-use remediation code.
---

# Synthesis Agent (Code Review)

You are the Synthesis agent for code review. Your role is to transform raw findings from all auditors and verification agents into a coherent, prioritized, actionable set.

## Input

You receive findings from:
- **Security Auditor**: vulnerabilities, secrets, SAST results, dependency CVEs
- **Code Quality Auditor**: SOLID violations, architecture anti-patterns, linter results
- **Documentation Auditor** (if present): outdated docs, missing doc entries
- **Host Performance Analysis**: performance issues found by the host
- **Host Architecture Analysis**: architecture/maintainability issues found by the host
- **Cross-Verifier**: composite findings, correlations, severity adjustments, coverage gaps
- **Challenger**: challenged findings (false-positives removed, severities adjusted)

## Workflow (MANDATORY — do not skip steps)

### Step 1: Parse All Findings

Extract every finding from the inputs using `### FINDING` blocks. Each finding contains fields like:
- `id`, `category`, `severity`, `title`, `file`, `line`, `tags`, `related_files`, `source_agent`

If a finding block is malformed, skip it and note it in the log.

### Step 2: Apply Challenger Decisions

- **Remove** all findings marked `false-positive` by the challenger.
- **Apply severity downgrades** from the challenger's "Challenged Findings" table.
- **Mark remaining findings** as `[verified]`.

### Step 3: Deduplicate

**Hard match** — merge if ALL of the following match:
- Same `file`
- Same `line` (or overlapping `line`–`end_line` range)
- Same `category`
- Normalized `title` is identical (case-insensitive, stripped whitespace)

**Soft match** — merge if ALL of the following match:
- Same `file`
- Same `category`
- ≥60% shared words in the `title` (case-insensitive, after removing stop words)

**Merge rules:**
- Keep the **higher severity**.
- Keep the **longer description** (more context).
- Concatenate `tags` and `related_files` (deduplicated).
- Preserve all `source_agent` values.

Log every deduplication decision.

### Step 4: Build Composite Findings

Find groups of findings that share a **root cause**:
- Same `file` or shared `related_files`.
- Related `tags` (e.g. `input-validation` + `repository`).
- 2+ findings from different categories (Security + Architecture, Performance + Security, etc.).

For each group:
- Assign a new ID: `COMPOSITE-001`, `COMPOSITE-002`, etc.
- Set `category: Composite`.
- Set `severity` = max severity of all components.
- Set `title` = name of the shared root cause (e.g. "SearchTerm Value Object").
- Set `basis` = list of component finding IDs.
- Write `combined_risk` explaining why the intersection is worse than each finding alone.
- Write `remediation` that fixes the **shared root cause** with ready-to-use code.
- **Remove the original component findings** from the final list to avoid duplication.

### Step 5: Add Remediation Code

For **every HIGH and CRITICAL** finding and composite:
- Generate a complete `CODE_EXAMPLE` block with `Before` and `After`.
- Ensure the code is syntactically correct and compiles in the project's language.
- If you are unsure of the exact syntax, provide a clear pseudocode example instead.

### Step 6: PR-Level Grouping

Group findings into recommended change sets (PRs):

```
PR-1: <title> (<findings>)
PR-2: <title> (<findings>)
```

Grouping rules:
- Findings in the same `file` or module usually belong together.
- Composite findings should be the centerpiece of their PR.
- Security fixes that depend on architecture changes should be grouped with the architecture PR.
- Small, independent findings can be their own PR.

For each PR, compute:
- `effort` = max effort of contained findings.
- `priority` = ordered position (1 = first to implement).

### Step 7: Prioritize

Sort all PRs and standalone findings by:
1. **CRITICAL** severity first.
2. **Architecture** before Security (architectural fixes often unblock security fixes).
3. **Composite** before individual findings.
4. **Effort**: trivial → easy → medium → hard.

### Step 8: Output

Return structured markdown with these exact sections:

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
file: src/domain/search.py
line: 1
end_line: 50
tags: input-validation, domain-model
source_agent: synthesis-agent

#### PROBLEM
[combined problem description]

#### IMPACT
[combined impact]

#### REMEDIATION
[how to fix the root cause]

#### CODE_EXAMPLE
```python
# Before
[code]

# After
[code]
```

### PR Groups
| PR ID | Title | Findings | Effort | Priority |

### Final Findings List
[All remaining individual findings after dedup, formatted as ### FINDING blocks]
```

## Important

- Never output a finding and its composite duplicate.
- If no composites are found, output an empty "Composite Findings" section.
- If no deduplication is needed, output "No duplicates found" in the log.
- The final output must be parseable by the host using `### FINDING` blocks.
```

- [ ] **Step 2: Verify file exists and has frontmatter**

Run:
```bash
head -n 5 packages/code-review/src/agents/synthesis-agent.md
```

Expected output:
```
---
name: synthesis-agent
description: Synthesis agent for code review.
```

---

## Task 2: Update `cross-verifier.md`

**Files:**
- Modify: `packages/code-review/src/agents/cross-verifier.md`

- [ ] **Step 1: Add mandatory workflow and strict output tables**

In `packages/code-review/src/agents/cross-verifier.md`, insert the following section **immediately after the existing `## Output Format` heading** and **before** the existing output format example:

Replace the existing `## Output Format` section (from heading through the code block) with:

```markdown
## Workflow (MANDATORY — do not skip steps)

### Step 1: Deduplication Analysis
For each pair of findings:
- Are they the same issue described twice? (same file/line/category)
- List ALL duplicates with IDs and your confidence (`certain` / `likely` / `maybe`).

### Step 2: Correlation Mapping
For each Security finding, check if any Quality finding affects the same file/module:
- List ALL correlations with format: `[CORRELATION-N] SEC-XXX + ARCH/MAINT-XXX -> {compounded risk}`

### Step 3: Composite Finding Construction
Build composite findings ONLY when 2+ findings share a root cause:
- Use exact format: `COMPOSITE-N` with Security basis, Quality basis, combined risk, remediation.

### Step 4: Severity Calibration
Apply these rules explicitly:
- Security outranks Documentation at same severity.
- Documentation + Security compound -> escalate doc finding by one level.
- List every adjustment with reasoning.

### Step 5: Coverage Gap Analysis
List what each auditor missed that another should have caught.

## Output Format (STRICT)

You MUST use this exact structure:

```markdown
## Cross-Analysis Results

### Duplicates
| Finding 1 | Finding 2 | Confidence | Decision |
|-----------|-----------|------------|----------|

### Correlations
| Correlation ID | Security | Quality | Compounded Risk | Recommendation |

### Composite Findings
| Composite ID | Severity | Title | Basis Findings | Combined Risk | Remediation |

### Severity Adjustments
| Finding ID | Original | Adjusted | Reasoning |

### Coverage Gaps
| Gap ID | What Was Missed | Recommended Auditor |
```
```

**Note:** Keep all content before `## Output Format` unchanged. Only replace the `## Output Format` section itself.

- [ ] **Step 2: Verify the change**

Run:
```bash
grep -n "Workflow (MANDATORY" packages/code-review/src/agents/cross-verifier.md
grep -n "Duplicates" packages/code-review/src/agents/cross-verifier.md
grep -n "Coverage Gaps" packages/code-review/src/agents/cross-verifier.md
```

Expected: all three grep commands return matching lines.

---

## Task 3: Update `challenger.md`

**Files:**
- Modify: `packages/code-review/src/agents/challenger.md`

- [ ] **Step 1: Add mandatory workflow and strict output tables**

In `packages/code-review/src/agents/challenger.md`, replace the existing `## Output Format` section (from heading through the code block) with:

```markdown
## Workflow (MANDATORY)

### Step 1: Evidence Collection
For each CRITICAL/HIGH finding, answer:
- Does the flagged code actually receive user input?
- Is it in a test file?
- Is the severity consistent with project context?

### Step 2: Severity Calibration
For each finding you challenge, produce ONE row in the table below.
You MUST justify with evidence, not opinion.

### Step 3: Downgrade/Uphold Decision
Possible outcomes: `confirmed`, `downgraded:OLD->NEW`, `false-positive`

## Output Format (STRICT)

```markdown
## Challenge Results

### Challenged Findings
| Finding ID | Original Severity | Decision | Evidence | Impact if Downgraded |

### Confirmed Findings
| Finding ID | Severity | Confirmation Reason |
```

**CRITICAL:** If you mark a finding as `false-positive`, you MUST quote the specific code or documentation that disproves it.
```

**Note:** Keep all content before `## Output Format` unchanged.

- [ ] **Step 2: Verify the change**

Run:
```bash
grep -n "Workflow (MANDATORY" packages/code-review/src/agents/challenger.md
grep -n "Challenged Findings" packages/code-review/src/agents/challenger.md
grep -n "false-positive.*MUST quote" packages/code-review/src/agents/challenger.md
```

Expected: all three grep commands return matching lines.

---

## Task 4: Update `security-auditor.md` — Add Structured Output Section

**Files:**
- Modify: `packages/code-review/src/agents/security-auditor.md`

- [ ] **Step 1: Insert structured output format requirement**

In `packages/code-review/src/agents/security-auditor.md`, insert the following section **immediately before the existing `## OWASP Top 10:2025 Checklist` heading**:

```markdown
## Structured Output Format

Every finding you report MUST be wrapped in a `### FINDING` block with the following fields:

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

**Rules:**
- `id` is temporary; the host will reassign final IDs. Use sequential numbers: SEC-001, SEC-002...
- `severity` must be one of: CRITICAL, HIGH, MEDIUM, LOW.
- `effort` must be one of: trivial, easy, medium, hard.
- `tags` help the synthesis agent cluster related findings. Use 1-3 concise tags.
- `related_files` lists other files involved in this issue (optional).
- `CODE_EXAMPLE` is required for HIGH and CRITICAL findings. Include both Before and After.
```

- [ ] **Step 2: Verify the change**

Run:
```bash
grep -n "Structured Output Format" packages/code-review/src/agents/security-auditor.md
grep -n "### FINDING" packages/code-review/src/agents/security-auditor.md
```

Expected: both grep commands return matching lines.

---

## Task 5: Update `code-quality-auditor.md` — Add Structured Output Section

**Files:**
- Modify: `packages/code-review/src/agents/code-quality-auditor.md`

- [ ] **Step 1: Insert structured output format requirement**

In `packages/code-review/src/agents/code-quality-auditor.md`, insert the following section **immediately before the existing `## Quality Principles Reference` heading**:

```markdown
## Structured Output Format

Every finding you report MUST be wrapped in a `### FINDING` block with the following fields:

```markdown
### FINDING
id: ARCH-001
category: Architecture
severity: HIGH
title: God Object: UserService
file: src/services/user_service.py
line: 1
end_line: 650
effort: medium
tags: god-object, srp, service-layer
related_files: src/api/users.py, src/repositories/user.py
source_agent: code-quality-auditor
principle: SRP

#### PROBLEM
UserService handles authentication, profile, notifications, and billing.

#### IMPACT
Hard to test, modify, and understand.

#### REMEDIATION
Split into focused services.

#### CODE_EXAMPLE
```python
# Before
class UserService:
    def login(self, email, password): ...
    def update_profile(self, user_id, data): ...
    def send_notification(self, user_id, message): ...
    def process_payment(self, user_id, amount): ...

# After
class AuthService:
    def login(self, email, password): ...

class UserProfileService:
    def update_profile(self, user_id, data): ...
```
```

**Rules:**
- `id` is temporary; the host will reassign final IDs. Use sequential numbers: ARCH-001, ARCH-002... or MAINT-001, MAINT-002...
- `category` must be one of: Architecture, Design, Maintainability, Style, Developer Standards.
- `severity` must be one of: CRITICAL, HIGH, MEDIUM, LOW.
- `effort` must be one of: trivial, easy, medium, hard.
- `principle` is required for Architecture/Design findings (e.g. SRP, OCP, DIP, DDD, CleanArch).
- `tags` help the synthesis agent cluster related findings. Use 1-3 concise tags.
- `related_files` lists other files involved in this issue (optional).
- `CODE_EXAMPLE` is required for HIGH and CRITICAL findings. Include both Before and After.
```

- [ ] **Step 2: Verify the change**

Run:
```bash
grep -n "Structured Output Format" packages/code-review/src/agents/code-quality-auditor.md
grep -n "### FINDING" packages/code-review/src/agents/code-quality-auditor.md
```

Expected: both grep commands return matching lines.

---

## Task 6: Update `documentation-auditor.md` — Add Structured Output Section

**Files:**
- Modify: `packages/code-review/src/agents/documentation-auditor.md`

- [ ] **Step 1: Insert structured output format requirement**

In `packages/code-review/src/agents/documentation-auditor.md`, insert the following section **immediately before the existing `## Output` heading**:

```markdown
## Structured Output Format

Every finding you report MUST be wrapped in a `### FINDING` block with the following fields:

```markdown
### FINDING
id: DOC-001
category: Documentation
severity: MEDIUM
title: Missing parameter in API docs
file: docs/api.md
line: 45
effort: trivial
tags: api-docs, parameters
related_files: src/api/users.py
source_agent: documentation-auditor

#### PROBLEM
The `username` parameter is not documented for the `/users` endpoint.

#### IMPACT
Developers won't know the parameter exists.

#### REMEDIATION
Add `username` to the endpoint documentation.

#### CODE_EXAMPLE
```markdown
<!-- Before -->
GET /users

<!-- After -->
GET /users?username={string}
```
```

**Rules:**
- `id` is temporary; the host will reassign final IDs. Use sequential numbers: DOC-001, DOC-002...
- `severity` must be one of: HIGH, MEDIUM, LOW.
- `effort` must be one of: trivial, easy, medium, hard.
- `tags` help the synthesis agent cluster related findings. Use 1-3 concise tags.
- `related_files` lists the code file that changed (optional).
- `CODE_EXAMPLE` is optional for documentation findings but recommended when showing doc syntax.
```

- [ ] **Step 2: Verify the change**

Run:
```bash
grep -n "Structured Output Format" packages/code-review/src/agents/documentation-auditor.md
grep -n "### FINDING" packages/code-review/src/agents/documentation-auditor.md
```

Expected: both grep commands return matching lines.

---

## Task 7: Update `review.md` Command

**Files:**
- Modify: `packages/code-review/src/commands/review.md`

- [ ] **Step 1: Update agent launch prompts to request structured markdown**

In `packages/code-review/src/commands/review.md`, find the three agent launch prompt blocks (security-auditor, code-quality-auditor, documentation-auditor) and add this sentence at the end of each prompt, right before the closing `"""`:

**For security-auditor prompt:**
Find:
```
Return findings as a structured markdown report with a JSON array of findings."
```
Replace with:
```
Return findings as structured markdown using `### FINDING` blocks. Follow the structured output format in your agent prompt exactly."
```

**For code-quality-auditor prompt:**
Find:
```
Return findings as a structured markdown report with a JSON array of findings."
```
Replace with:
```
Return findings as structured markdown using `### FINDING` blocks. Follow the structured output format in your agent prompt exactly."
```

**For documentation-auditor prompt:**
Find:
```
Return findings as a structured markdown report with a JSON array of findings."
```
Replace with:
```
Return findings as structured markdown using `### FINDING` blocks. Follow the structured output format in your agent prompt exactly."
```

- [ ] **Step 2: Update verification prompts to request strict tables**

In `packages/code-review/src/commands/review.md`, find the cross-verifier Task prompt and add at the end, before the closing `"""`:

Find:
```
Follow your output format exactly."
```
Replace with:
```
Follow your output format exactly. Use the strict table format. List ALL duplicates, correlations, composites, severity adjustments, and coverage gaps."
```

Find the challenger Task prompt and add at the end, before the closing `"""`:

Find:
```
Follow your output format exactly."
```
Replace with:
```
Follow your output format exactly. Use the strict table format. Quote specific code or documentation for every false-positive."
```

- [ ] **Step 3: Insert Synthesis step after verification**

In `packages/code-review/src/commands/review.md`, find the section:
```markdown
### 5.5.5: Merge enhanced findings

1. Apply Challenger decisions (remove false positives, adjust severity)
2. Add Cross-Verifier composite findings
3. Tag confirmed findings as `[verified]`

Mark "Run cross-verifier and challenger" and "Merge verification results" as completed using `todowrite`.
```

Replace it with:

```markdown
### 5.5.5: Synthesis (NEW)

After merging challenger and cross-verifier results, spawn the synthesis agent:

```
Task(
  subagent_type: "code-review:synthesis-agent",
  prompt: "You are the synthesis-agent. Here are all findings from the code review:

Security findings:
{security_results}

Quality findings:
{quality_results}

Documentation findings:
{documentation_results}

Performance findings:
{performance_analysis}

Architecture findings:
{architecture_analysis}

Cross-verifier results:
{cross_verifier_results}

Challenger results:
{challenger_results}

Perform deduplication, build composite findings, group into PRs, add remediation code, and prioritize. Return structured markdown."
)
```

Collect the synthesis results. Parse `### FINDING` blocks and `### PR Groups` table.

Mark "Run cross-verifier and challenger", "Merge verification results", and "Synthesis" as completed using `todowrite`.
```

- [ ] **Step 4: Update Step 7 (Assign Issue IDs) to use synthesis output**

In `packages/code-review/src/commands/review.md`, find the `## Step 7: Assign Issue IDs` section. Replace the entire section with:

```markdown
## Step 7: Assign Issue IDs

Use the findings from the **Synthesis Results** output.

1. Collect all findings from:
   - Synthesis agent's `Final Findings List`
   - Synthesis agent's `Composite Findings`

2. Initialize counters:
   - `sec_count = 0` (Security)
   - `perf_count = 0` (Performance)
   - `arch_count = 0` (Architecture)
   - `maint_count = 0` (Maintainability)
   - `doc_count = 0` (Documentation)
   - `comp_count = 0` (Composite)

3. For each issue (in order of appearance in synthesis output):
   - Map category to prefix and counter:
     - Security → SEC, increment `sec_count`
     - Performance → PERF, increment `perf_count`
     - Architecture → ARCH, increment `arch_count`
     - Maintainability → MAINT, increment `maint_count`
     - Documentation → DOC, increment `doc_count`
     - Composite → COMPOSITE, increment `comp_count`
   - Format ID: `{PREFIX}-{NNN}` (zero-padded 3-digit, e.g. SEC-001)
   - Update heading: `### [SEVERITY] {ID}: Title`
   - Add `**ID:** {ID}` field right after the heading

**Category-to-prefix mapping:**

| Category        | Prefix    |
|-----------------|-----------|
| Security        | SEC       |
| Performance     | PERF      |
| Architecture    | ARCH      |
| Maintainability | MAINT     |
| Documentation   | DOC       |
| Composite       | COMPOSITE |
```

- [ ] **Step 5: Update Step 8 (Format Final Report) to include PR groups**

In `packages/code-review/src/commands/review.md`, find the `### Report Structure` subsection under `## Step 8: Format Final Report`. Replace it with:

```markdown
### Report Structure

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
[All SEC-XXX issues]

### Performance Findings
[All PERF-XXX issues]

### Architecture Findings
[All ARCH-XXX issues]

### Maintainability Findings
[All MAINT-XXX issues]

### Composite Findings
[All COMPOSITE-XXX findings with basis and combined risk]

### Challenged Findings
| Finding ID | Original | Adjusted | Reasoning |

### Documentation Findings
[All DOC-XXX issues]

### Recommendations
[Same as PR-Level Action Plan]
```
```

- [ ] **Step 6: Add synthesis to Final Verification Checklist**

In `packages/code-review/src/commands/review.md`, find the `### Verification (MANDATORY)` subsection under `## Final Verification Checklist`. Add to the list:

Find:
```markdown
- [ ] cross-verifier agent launched
- [ ] challenger agent launched
- [ ] Verification results collected
- [ ] Verification results merged with findings
```

Replace with:
```markdown
- [ ] cross-verifier agent launched
- [ ] challenger agent launched
- [ ] Verification results collected
- [ ] Verification results merged with findings
- [ ] synthesis-agent launched
- [ ] Synthesis results collected and parsed
```

- [ ] **Step 7: Verify all changes**

Run:
```bash
grep -n "synthesis-agent" packages/code-review/src/commands/review.md
grep -n "PR-Level Action Plan" packages/code-review/src/commands/review.md
grep -n "COMPOSITE" packages/code-review/src/commands/review.md
```

Expected: all three grep commands return matching lines.

---

## Task 8: Register `synthesis-agent` in `index.ts`

**Files:**
- Modify: `packages/code-review/src/index.ts`

- [ ] **Step 1: Add synthesis-agent to AGENTS array**

In `packages/code-review/src/index.ts`, find the `const AGENTS` array. Add this entry after the `challenger` entry (or in any logical position within the array):

```typescript
  {
    name: "synthesis-agent",
    description:
      "Synthesis agent for code review. Deduplicates findings, builds composite findings from shared root causes, groups findings into recommended PRs, and generates ready-to-use remediation code.",
    path: "agents/synthesis-agent.md",
  },
```

- [ ] **Step 2: Verify registration**

Run:
```bash
grep -n "synthesis-agent" packages/code-review/src/index.ts
```

Expected: returns matching lines for both `name:` and `path:`.

---

## Task 9: Update `plugin.test.ts`

**Files:**
- Modify: `packages/code-review/tests/plugin.test.ts`

- [ ] **Step 1: Add synthesis-agent to EXPECTED_AGENTS**

In `packages/code-review/tests/plugin.test.ts`, find the `EXPECTED_AGENTS` array. Add `"synthesis-agent"` to the list. The array should now be:

```typescript
  const EXPECTED_AGENTS = [
    "security-auditor",
    "code-quality-auditor",
    "documentation-auditor",
    "cross-verifier",
    "challenger",
    "synthesis-agent",
    "feedback-analyzer",
    "fix-auto",
    "skill-secret-scanner",
    "skill-sast-analyzer",
    "skill-dependency-scanner",
    "skill-architecture-analyzer",
    "skill-linter-integrator",
  ]
```

- [ ] **Step 2: Run the plugin test**

Run:
```bash
npm run test --workspace @appverk/opencode-code-review -- --run tests/plugin.test.ts
```

Expected: PASS for all tests, including `config registers synthesis-agent agent`.

---

## Task 10: Update `build-output.test.ts`

**Files:**
- Modify: `packages/code-review/tests/build-output.test.ts`

- [ ] **Step 1: Add synthesis-agent.md to EXPECTED_FILES**

In `packages/code-review/tests/build-output.test.ts`, find the `EXPECTED_FILES` array. Add `"agents/synthesis-agent.md"` to the list. The array should now include:

```typescript
  const EXPECTED_FILES = [
    "commands/review.md",
    "agents/security-auditor.md",
    "agents/code-quality-auditor.md",
    "agents/documentation-auditor.md",
    "agents/cross-verifier.md",
    "agents/challenger.md",
    "agents/synthesis-agent.md",
    "commands/fix.md",
    // ... rest of files
  ]
```

- [ ] **Step 2: Run the build-output test**

Run:
```bash
npm run test --workspace @appverk/opencode-code-review -- --run tests/build-output.test.ts
```

Expected: FAIL because `dist/agents/synthesis-agent.md` does not exist yet (we haven't built). This is expected — the test will pass after Task 11.

---

## Task 11: Build the Package

**Files:**
- Modify: `packages/code-review/dist/` (generated)

- [ ] **Step 1: Run build**

Run:
```bash
npm run build --workspace @appverk/opencode-code-review
```

Expected output:
```
Assets copied to dist/
```

- [ ] **Step 2: Verify dist contains synthesis-agent.md**

Run:
```bash
ls packages/code-review/dist/agents/synthesis-agent.md
```

Expected: file exists.

- [ ] **Step 3: Verify dist contains updated files**

Run:
```bash
grep -l "Workflow (MANDATORY" packages/code-review/dist/agents/cross-verifier.md packages/code-review/dist/agents/challenger.md
grep -l "Structured Output Format" packages/code-review/dist/agents/security-auditor.md packages/code-review/dist/agents/code-quality-auditor.md packages/code-review/dist/agents/documentation-auditor.md
grep -l "synthesis-agent" packages/code-review/dist/commands/review.md
```

Expected: all grep commands return matching file paths.

---

## Task 12: Run All Tests

**Files:**
- (no file changes — validation only)

- [ ] **Step 1: Run package tests**

Run:
```bash
npm run test --workspace @appverk/opencode-code-review
```

Expected: All tests pass, including:
- `config registers synthesis-agent agent`
- `dist/agents/synthesis-agent.md exists and has structural content`

- [ ] **Step 2: Run typecheck**

Run:
```bash
npm run typecheck --workspace @appverk/opencode-code-review
```

Expected: No errors.

---

## Task 13: Commit

**Files:**
- (no file changes — git operation)

- [ ] **Step 1: Stage all changes**

Run:
```bash
git add packages/code-review/src/agents/synthesis-agent.md \
  packages/code-review/src/agents/cross-verifier.md \
  packages/code-review/src/agents/challenger.md \
  packages/code-review/src/agents/security-auditor.md \
  packages/code-review/src/agents/code-quality-auditor.md \
  packages/code-review/src/agents/documentation-auditor.md \
  packages/code-review/src/commands/review.md \
  packages/code-review/src/index.ts \
  packages/code-review/tests/plugin.test.ts \
  packages/code-review/tests/build-output.test.ts \
  packages/code-review/dist/agents/synthesis-agent.md \
  packages/code-review/dist/agents/cross-verifier.md \
  packages/code-review/dist/agents/challenger.md \
  packages/code-review/dist/agents/security-auditor.md \
  packages/code-review/dist/agents/code-quality-auditor.md \
  packages/code-review/dist/agents/documentation-auditor.md \
  packages/code-review/dist/commands/review.md \
  packages/code-review/dist/index.js \
  packages/code-review/dist/index.d.ts
```

- [ ] **Step 2: Commit**

Use `/commit` or the controlled commit workflow to commit with message:

```
feat(code-review): add synthesis-agent and structured markdown I/O

- Add synthesis-agent for deduplication, composite findings, PR grouping
- Enhance cross-verifier with mandatory workflow + strict tables
- Enhance challenger with evidence requirements + strict tables
- Add structured markdown output format to security, quality, docs auditors
- Update /review command to include synthesis step and PR-level reporting
- Register synthesis-agent in plugin index and tests
```

---

## Self-Review

### Spec Coverage Check

| Spec Section | Plan Task | Status |
|--------------|-----------|--------|
| New agent: `synthesis-agent` | Task 1 | Covered |
| Structured markdown format | Tasks 1, 4, 5, 6 | Covered |
| Cross-verifier enhancement | Task 2 | Covered |
| Challenger enhancement | Task 3 | Covered |
| Synthesis step in `/review` | Task 7 | Covered |
| Final report with PR groups | Task 7 | Covered |
| Register agent in index | Task 8 | Covered |
| Update tests | Tasks 9, 10 | Covered |
| Build & verify | Tasks 11, 12 | Covered |

### Placeholder Scan

- No `TBD`, `TODO`, or `implement later` found.
- No vague instructions like "add appropriate error handling".
- Every task has exact file paths, exact content, and exact commands.
- No "Similar to Task N" shortcuts.

### Type Consistency

- `synthesis-agent` is referenced consistently as `"synthesis-agent"` in all files.
- `mode: "subagent"` is inherited from the existing plugin loop (no change needed).
- `AGENTS` array structure matches existing entries.

No issues found. Plan is ready for execution.
