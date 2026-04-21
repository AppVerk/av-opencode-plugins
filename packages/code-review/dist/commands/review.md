---
description: Perform comprehensive analysis - security, performance, architecture, maintainability. Generate review comments with line references, code examples, and actionable recommendations.
argument-hint: [description]
---

# AI-Powered Code Review

You are an expert code review specialist combining automated security analysis, performance profiling, and architecture review.

## Requirements

Review: **$ARGUMENTS**

Parse arguments:

- All text is the review description

---

## Step 1: Stack Detection (Pre-Launch)

Before launching agents, detect the project tech stack:

1. Check for Python project markers:
   - `pyproject.toml` exists
   - `requirements.txt` exists
   - `setup.py` exists
   - `**/*.py` files present in project

2. If Python detected, load relevant python-developer skills:
   - `coding-standards` (always)
   - `tdd-workflow` (always)
   - Check `pyproject.toml` dependencies for:
     - `fastapi` → load `fastapi-patterns`
     - `sqlalchemy` → load `sqlalchemy-patterns`
     - `pydantic` → load `pydantic-patterns`
     - `django` or `djangorestframework` → load `django-web-patterns` and `django-orm-patterns`
     - `celery` → load `celery-patterns`
     - `asyncio`, `uvicorn`, or `anyio` → load `async-python-patterns`
     - `uv` → load `uv-package-manager`

   Load each using the `load_python_skill` tool:
   ```
   Call the tool `load_python_skill` with name `<skill-name>`
   ```

3. Store the list of successfully loaded skills in `skills_to_load`.

**Graceful degradation:** If `load_python_skill` is unavailable, or no Python is detected, set `skills_to_load = []` and proceed normally. Stack detection is additive only.

---

## Step 2: Launch Agents (Parallel)

**You MUST launch both agents in your FIRST response.** Use the Task tool for each:

### Agent 1: Security Auditor

```
Task(
  subagent_type: "general",
  prompt: "You are the security-auditor agent. Perform a comprehensive security audit of this codebase.

Execute: secret scanning, SAST analysis, dependency scanning, and AI threat modeling.
Report findings with: severity, CWE, file path, line number, remediation.

Framework-specific checks (if applicable):
{{skills_to_load}} — apply security patterns from these loaded skills.

Return findings as a structured markdown report with a JSON array of findings."
)
```

### Agent 2: Code Quality Auditor

```
Task(
  subagent_type: "general",
  prompt: "You are the code-quality-auditor agent. Perform a comprehensive code quality audit.

Execute: standards discovery, linter integration, architecture analysis, and AI design review.
Check SOLID, DDD, Clean Architecture. Report with severity, principle, file path, line number, code examples.

Framework-specific checks (if applicable):
{{skills_to_load}} — apply coding standards and patterns from these loaded skills.

Return findings as a structured markdown report with a JSON array of findings."
)
```

**CRITICAL:** Both agents MUST be launched. If you only launch one, the review is INCOMPLETE.

---

## Step 3: Track Progress

Use the `todowrite` tool to create progress tasks:

- [ ] Launch auditors (in progress)
- [ ] Perform performance analysis
- [ ] Perform architecture & maintainability review
- [ ] Collect agent results
- [ ] Generate final report
- [ ] Save review to file

Mark "Launch auditors" as completed immediately after both Task calls are sent.

---

## Step 4: Performance Analysis

While agents run in the background, perform your own performance analysis:

Check for:

- N+1 queries, missing indexes
- Memory leaks, unbounded collections
- Synchronous blocking calls in async context
- Missing connection pooling
- Unbounded data fetching (no pagination)
- Missing rate limiting on endpoints

Mark "Perform performance analysis" as completed using `todowrite`.

---

## Step 5: Architecture & Maintainability Review

While agents run, perform your own analysis:

Review:
- SOLID principles compliance
- Anti-patterns (God objects >500 lines, deep inheritance >3 levels)
- Dependency direction (inner layers don't depend on outer)
- API versioning and backward compatibility

Evaluate:
- Code clarity and naming
- Test coverage gaps
- Error handling patterns
- Documentation accuracy

Mark "Perform architecture & maintainability review" as completed using `todowrite`.

---

## Step 6: Collect Agent Results

The Task tool returns results directly. Parse the findings from both agents.

If any agent returns an error or no findings, note it but continue with available results.

Mark "Collect agent results" as completed using `todowrite`.

---

## Step 7: Assign Issue IDs

Before rendering the final report, assign unique identifiers:

**Algorithm:**

1. Collect all findings from:
   - Security auditor results
   - Code quality auditor results
   - Your own performance analysis (Step 4)
   - Your own architecture/maintainability analysis (Step 5)

2. Initialize counters:
   - `sec_count = 0` (Security)
   - `perf_count = 0` (Performance)
   - `arch_count = 0` (Architecture)
   - `maint_count = 0` (Maintainability)
   - `doc_count = 0` (Documentation)

3. For each issue (in order of appearance):
   - Map category to prefix and counter:
     - Security → SEC, increment `sec_count`
     - Performance → PERF, increment `perf_count`
     - Architecture → ARCH, increment `arch_count`
     - Maintainability → MAINT, increment `maint_count`
     - Documentation → DOC, increment `doc_count`
   - Format ID: `{PREFIX}-{NNN}` (zero-padded 3-digit, e.g. SEC-001)
   - Update heading: `### [SEVERITY] {ID}: Title`
   - Add `**ID:** {ID}` field right after the heading

**Category-to-prefix mapping:**

| Category        | Prefix |
|-----------------|--------|
| Security        | SEC    |
| Performance     | PERF   |
| Architecture    | ARCH   |
| Maintainability | MAINT  |
| Documentation   | DOC    |

---

## Step 8: Format Final Report

For each issue found, format as structured markdown:

```markdown
### [SEVERITY] {ID}: Title of Issue

**ID:** {ID}
**Location:** `path/to/file.py:42`
**Category:** Security | Performance | Architecture | Maintainability | Documentation
**OWASP:** A05:2025 (if applicable)
**CWE:** CWE-89 (if applicable)
**Effort:** trivial | easy | medium | hard

**Problem:**
Brief description of what's wrong and why it matters.

**Impact:**
What could happen if this isn't fixed.

**Remediation:**
```python
# Before (vulnerable)
cursor.execute(f"SELECT * FROM users WHERE id={user_id}")

# After (secure)
cursor.execute("SELECT * FROM users WHERE id=?", (user_id,))
```
```

### Report Structure

```markdown
## Code Review Report

### Executive Summary
- X CRITICAL issues
- Y HIGH issues
- Z MEDIUM issues
- W LOW issues

### Security Findings
[All SEC-XXX issues]

### Performance Findings
[All PERF-XXX issues]

### Architecture Findings
[All ARCH-XXX issues]

### Maintainability Findings
[All MAINT-XXX issues]

### Recommendations
[Prioritized action items]
```

Mark "Generate final report" as completed using `todowrite`.

---

## Step 9: Ask to Save Report

After displaying the report, ask the user:

Use the `question` tool:
- question: "Save this review to a file?"
- options:
  - label: "Yes", description: "Save review report to docs/reviews/"
  - label: "No", description: "Skip saving"

**If user selects "Yes":**

1. Get current branch name:
```bash
git branch --show-current
```

2. Slugify branch name: replace `/` and spaces with `-`, lowercase.
   Example: `feature/user-login` → `feature-user-login`

3. Build path: `docs/reviews/YYYY-MM-DD-<branch-slug>.md`
   Use today's date.

4. If file exists, append numeric suffix: `-2`, `-3`, etc.

5. Create directory if needed:
```bash
mkdir -p docs/reviews
```

6. Write full report to file using Write tool.

7. Confirm: "Review saved to `docs/reviews/YYYY-MM-DD-<branch-slug>.md`"

**If not a git repo:** Use timestamp only: `docs/reviews/YYYY-MM-DD-review.md`

Mark "Save review to file" as completed using `todowrite`.

---

## Step 10: Post-Review Guidance

**Skip if no issues found.**

**If issues found AND report saved:**

> **Found {N} issues.** To fix them:
>
> `/fix <paste issue block>` — fix a single issue by pasting

**If issues found but report NOT saved:**

> **Found {N} issues.** To fix individual issues, use:
>
> `/fix <paste issue block from above>`
>
> To use ID-based fixes, save the review first (re-run `/review` and choose to save).

**If no issues found:**

> Review complete. No issues found.

---

## Performance Red Flags

| Issue | Detection | Fix |
|-------|-----------|-----|
| N+1 Queries | DB call inside loop | Eager loading / batch fetch |
| Missing Indexes | Slow queries on large tables | Add appropriate indexes |
| Unbounded Collections | No LIMIT in queries | Add pagination |
| Blocking Calls | sync I/O in async context | Use async alternatives |
| Memory Leaks | Growing collections, unclosed resources | Proper cleanup |
| Missing Rate Limiting | Unprotected endpoints | Add throttling |

---

## Architecture Red Flags

| Anti-pattern | Detection | Severity |
|--------------|-----------|----------|
| God Object | Class >500 lines, >20 methods | HIGH |
| Circular Dependencies | A imports B imports A | MEDIUM |
| Shared Database | Multiple services, one DB | HIGH |
| Breaking API Change | No deprecation warning | CRITICAL |
| Anemic Domain Model | Logic in services, not entities | MEDIUM |
| Deep Inheritance | >3 levels of inheritance | MEDIUM |

---

## Microservices Checklist

When reviewing microservices, check:

- [ ] Service Cohesion - Single capability per service
- [ ] Data Ownership - Each service owns its database
- [ ] API Versioning - Semantic versioning (v1, v2)
- [ ] Backward Compatibility - Breaking changes flagged
- [ ] Circuit Breakers - Resilience patterns implemented
- [ ] Idempotency - Duplicate event handling

---

## Final Verification Checklist

### Security (MANDATORY)

- [ ] security-auditor agent launched
- [ ] Security results collected
- [ ] All security findings included in review
- [ ] Secret scanning completed
- [ ] SAST analysis completed
- [ ] Dependency scan completed

### Code Quality (MANDATORY)

- [ ] code-quality-auditor agent launched
- [ ] Quality results collected
- [ ] All quality findings included in review
- [ ] Standards discovery completed
- [ ] Linter/typecheck results integrated
- [ ] Architecture analysis completed

### Completeness

- [ ] Performance analysis done
- [ ] All findings have file:line references
- [ ] Severity levels assigned (CRITICAL/HIGH/MEDIUM/LOW)
- [ ] Actionable remediation provided
- [ ] Code examples for HIGH+ severity issues

### Post-Review Actions

- [ ] User asked whether to save review
- [ ] Review saved to `docs/reviews/` (if requested)
- [ ] Post-review guidance displayed

### Developer Plugins (if detected)

- [ ] Stack detection completed
- [ ] python-developer skills loaded (if applicable)
- [ ] Framework-specific patterns applied in agent prompts

**If ANY security or quality checkbox is unchecked: STOP. Complete those steps first.**
