# @appverk/opencode-code-review

Code review workflow for OpenCode. Provides the `/review` command with parallel security and code quality audits, python-developer skill integration, and structured report generation with issue IDs.

## Installation

The root plugin bundle (`av-opencode-plugins`) includes this package automatically. No separate install needed.

## Usage

Run a comprehensive code review:

```text
/review <description>
```

Example:
```text
/review Review the authentication module for security issues and code quality
```

The command:
1. Detects your project stack (Python, JavaScript, etc.)
2. Loads relevant `python-developer` skills for framework-specific checks (if Python)
3. Launches two agents in parallel:
   - **security-auditor** — secret scanning, SAST, dependency scanning, threat modeling
   - **code-quality-auditor** — standards discovery, linter integration, architecture analysis
4. Aggregates findings, assigns issue IDs (SEC-001, ARCH-001, etc.)
5. Generates a structured markdown report
6. Optionally saves to `docs/reviews/YYYY-MM-DD-<branch>.md`

## Direct Agent Use

You can also invoke the agents directly:

```bash
opencode agent security-auditor "Audit the payment module for vulnerabilities"
opencode agent code-quality-auditor "Review the user service for SOLID violations"
```

## What Gets Reviewed

### Security Audit
- Secret scanning (API keys, passwords, tokens in source code)
- SAST analysis (injection, XSS, SSRF, misconfiguration)
- Dependency scanning (CVEs, vulnerable packages)
- AI threat modeling (business logic flaws, auth bypass, IDOR)
- Framework-specific security patterns (if python-developer skills loaded)

### Code Quality Audit
- Standards discovery (CONTRIBUTING.md, CODING_STANDARDS.md)
- Linter integration (ruff, mypy, eslint, tsc with project configs)
- Architecture analysis (SOLID, DDD, Clean Architecture)
- AI design review (cohesion, coupling, testability)
- Framework-specific quality patterns (if python-developer skills loaded)

## Report Format

Each issue is assigned a unique ID:

| Category | Prefix | Example |
|----------|--------|---------|
| Security | SEC | SEC-001 |
| Performance | PERF | PERF-002 |
| Architecture | ARCH | ARCH-003 |
| Maintainability | MAINT | MAINT-004 |
| Documentation | DOC | DOC-005 |

Every issue includes:
- Severity (CRITICAL / HIGH / MEDIUM / LOW)
- File path and line number
- OWASP category (if applicable)
- CWE identifier (if applicable)
- Problem description and impact
- Remediation with before/after code examples
- Estimated effort (trivial / easy / medium / hard)

## Architecture

The plugin registers three elements through its `config` hook:

| Element | OpenCode Mechanism | Purpose |
|---|---|---|
| `agent.security-auditor` | `config.agent` | Security-focused agent prompt with OWASP checklist, secret scanning, SAST, and dependency scanning instructions. |
| `agent.code-quality-auditor` | `config.agent` | Quality-focused agent prompt with standards discovery, linter integration, architecture analysis, and design review instructions. |
| `command.review` | `config.command` | Orchestrates stack detection, parallel agent dispatch, result aggregation, ID assignment, and report formatting. |

### How Agents Work

1. The `/review` command starts by detecting the project tech stack.
2. If Python is detected, it loads relevant `python-developer` skills via the `load_python_skill` tool.
3. It launches `security-auditor` and `code-quality-auditor` agents in parallel via the `task` tool.
4. Each agent runs its full audit workflow independently.
5. Results are collected directly from the `task` tool output.
6. The command aggregates all findings, assigns category-prefixed IDs, and formats the final report.

## Limitations

- **MVP scope:** Only `/review` is implemented. `/fix`, `/fix-report`, and `/analyze-feedback` are planned for v2.
- **No verification phase:** Cross-Verifier and Challenger agents (false-positive detection) are planned for v2.
- **No Documentation Auditor:** Documentation review is planned for v2.
- **Python-only framework integration:** Frontend-developer skill integration is planned for v2.
- Agents return findings as text; the command parses them from `task` output. Complex reports may require manual verification of ID assignment.

## Project Structure

- `src/index.ts` — Plugin entry point (config hook registration)
- `src/commands/review.md` — `/review` command template
- `src/agents/security-auditor.md` — Security auditor agent prompt
- `src/agents/code-quality-auditor.md` — Code quality auditor agent prompt
- `scripts/copy-assets.mjs` — Build step that copies markdown files to `dist/`
