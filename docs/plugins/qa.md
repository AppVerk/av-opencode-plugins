# QA Plugin Guide

The QA plugin provides end-to-end testing and quality assurance workflows for projects using the AppVerk OpenCode plugin bundle. It supports both frontend (Playwright browser automation) and backend (API endpoint + database) testing, with structured test plans and reports.

## Installation

The root plugin bundle includes this package automatically. No separate installation is required.

## Usage

### Create a QA test plan

Generate a structured test plan from a PR description, ticket, or feature specification:

```text
/create-qa-plan [PR description or ticket text]
```

Examples:

```text
/create-qa-plan Add two-factor authentication to the login flow
```

```text
/create-qa-plan Fix pagination on the user list page
```

The command creates a `docs/testing/plans/YYYY-MM-DD-<topic>-test-plan.md` file with test cases, preconditions, and expected results.

### Run a QA session

Execute a saved test plan or run a quick ad-hoc QA check:

```text
/run-qa [plan-file-or-path]
```

Examples:

```text
/run-qa docs/testing/plans/2026-04-29-feature-auth-test-plan.md
```

```text
/run-qa src/auth/components/LoginForm.tsx
```

The `/run-qa` command:

1. Loads the test plan file or finds the most recent plan in `docs/testing/plans/`
2. Detects whether the scope is frontend, backend, or both
3. Launches the appropriate testing agent (`@qa-fe-tester` or `@qa-be-tester`)
4. Executes tests using Playwright (FE) or curl + DB CLI (BE)
5. Collects results into a markdown report with pass/fail status
6. Generates `docs/testing/reports/YYYY-MM-DD-<topic>-report.md`

## Direct Agent Use

You can also invoke testing agents directly for ad-hoc checks:

```bash
opencode agent qa-fe-tester "Run accessibility checks on the checkout page"
```

```bash
opencode agent qa-be-tester "Test the GET /api/v1/orders endpoint with pagination"
```

## Architecture

| Element | Type | Description |
|---------|------|-------------|
| `/create-qa-plan` | Command | Generates structured test plans from PR descriptions or tickets |
| `/run-qa` | Command | Executes test plans or ad-hoc QA checks, delegates to agents |
| `@qa-fe-tester` | Agent | Subagent for frontend testing via native Playwright tools (bash CLI fallback) |
| `@qa-be-tester` | Agent | Subagent for backend testing via HTTP requests (`curl`, `httpie`, `wget`) and DB assertions (`psql`, `mysql`, `sqlite3`, `mongosh`, `redis-cli`) |
| `test-plan-format` | Skill | Rules for writing test plans with Given/When/Then, IDs, metadata |
| `report-format` | Skill | QA report structure with QA-XXX IDs, canonical code-review-compatible fields (ID, Location, Category, Problem, Impact, Remediation), /fix and /fix-report integration |
| `fe-testing` | Skill | Frontend testing patterns: Playwright CLI, selectors, assertions |
| `be-testing` | Skill | Backend testing patterns: HTTP requests, DB validation, curl |

### Skill Frontmatter Format

Each skill is a markdown file with YAML frontmatter:

```yaml
---
name: skill-name
description: What the skill does
activation: When to load the skill
---
```

- **`name`** — Unique identifier used with `load_appverk_skill("skill-name")`
- **`description`** — Brief explanation of the skill's purpose
- **`activation`** — Rule for when the skill should be loaded (e.g., "Load when creating QA test plans")

## Limitations

- FE and BE agents launch in parallel when both exist in a test plan.
- **Playwright tools:** The FE tester prioritizes OpenCode's native `playwright_browser_*` tools. Falls back to the `playwright` bash CLI if native tools are unavailable.
- **Database CLI tools:** The BE tester attempts to use the project's native DB tool (`psql`, `mysql`, `sqlite3`, `mongosh`, `redis-cli`, etc.). If DB connection details are not in the test plan, it auto-detects them from `.env`, `.env.local`, `docker-compose.yml`, framework config files, and environment variables. It does not spin up test databases automatically.
- **Cross-plugin integration:** QA reports use QA-XXX IDs and are compatible with `/fix` and `/fix-report` commands from the code-review plugin.
- **No CI integration:** Reports are local markdown files only. CI pipeline integration is planned.

## Project Structure

```
packages/qa/
├── src/
│   ├── index.ts                        # Plugin factory (registers commands + agents)
│   ├── commands/
│   │   ├── create-qa-plan.md           # /create-qa-plan command template
│   │   └── run-qa.md                   # /run-qa command template
│   ├── agents/
│   │   ├── fe-tester.md                # Frontend testing subagent prompt
│   │   └── be-tester.md                # Backend testing subagent prompt
│   └── skills/
│       ├── test-plan-format/
│       │   └── SKILL.md                # Test plan writing rules
│       ├── report-format/
│       │   └── SKILL.md                # Report writing rules
│       ├── fe-testing/
│       │   └── SKILL.md                # Frontend testing patterns (Playwright)
│       └── be-testing/
│           └── SKILL.md                # Backend testing patterns (HTTP + DB)
├── tests/
│   └── qa-plugin.test.ts             # Smoke tests for command + agent registration
├── package.json                        # Workspace manifest
├── tsconfig.json
├── vitest.config.ts
└── scripts/
    └── copy-assets.mjs                 # Copies .md templates into dist/ after build
```
