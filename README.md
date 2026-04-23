# AppVerk OpenCode Plugins

[![Package](https://img.shields.io/badge/package-3-blue.svg)](#available-packages)

OpenCode plugin packages for AppVerk. The root plugin loads the AppVerk plugin bundle from this repository, which currently provides:

- A **controlled commit workflow** (`/commit`) that enforces AppVerk git policies.
- A **Python development workflow** (`/develop`) with TDD, coding standards, and stack-specific patterns (FastAPI, Django, Celery, SQLAlchemy, Pydantic).
- A **code review workflow** (`/review`) with parallel security and quality audits, verification agents, fix commands, feedback analysis, and skill-agent integration.

## Installation

Add the root plugin package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["av-opencode-plugins@git+https://github.com/AppVerk/av-opencode-plugins.git#v0.2.1"]
}
```

Restart OpenCode after updating the config. The root plugin installs the AppVerk plugin bundle and registers `/commit` and `/develop` automatically.

## Usage

### Commit workflow

Create a commit for the current repository changes:

```text
/commit
```

Create a commit and append a work item reference:

```text
/commit AV-42
```

The command uses the packaged AppVerk workflow, generates a Conventional Commit style message, and routes the final commit through the controlled runtime instead of allowing raw `git commit` from the bash tool.

### Python development workflow

Run the Python development workflow with TDD and stack-specific patterns:

```text
/develop Add user authentication endpoint with JWT
```

The `/develop` command:

1. Detects your project stack (FastAPI, Django, Celery, etc.)
2. Loads relevant Python development skills
3. Follows TDD: writes tests first, then implementation
4. Runs quality gates (typecheck, tests, lint)

You can also invoke the agent directly:

```bash
opencode agent python-developer "Refactor user service to use repository pattern"
```

### Code review workflow

Run a comprehensive code review with parallel security and quality audits:

```text
/review Review the authentication module for security issues and code quality
```

The `/review` command:

1. Detects your project stack and loads relevant skills (Python, Frontend, PHP)
2. Launches `security-auditor`, `code-quality-auditor`, and optionally `documentation-auditor` agents in parallel
3. Runs verification agents (`cross-verifier`, `challenger`) to validate findings
4. Aggregates findings with unique issue IDs (SEC-001, ARCH-001, etc.)
5. Generates a structured markdown report
6. Optionally saves to `docs/reviews/YYYY-MM-DD-<branch>.md`

### Fix commands

Fix a single issue by ID from a saved report:

```text
/fix SEC-001
```

Or paste the full issue block directly:

```text
/fix [paste issue block from /review]
```

Batch-fix issues from a saved report:

```text
/fix-report docs/reviews/2026-04-22-feature-auth.md
```

### Feedback analysis

Analyze PR comments and generate response drafts:

```text
/analyze-feedback 123
```

Classifies each comment as "Address" or "Reject" and optionally publishes responses via GitHub CLI.

## Available Commands & Agents

| Command / Agent | Description | Docs |
|-----------------|-------------|------|
| `/commit` | Controlled commit workflow — Conventional Commit messages, bash-level blocking for direct `git commit`/`git push`. | [Guide](docs/plugins/commit.md) |
| `/develop` | Python development workflow — TDD, coding standards, and stack-specific patterns (FastAPI, Django, Celery, SQLAlchemy). | [Guide](docs/plugins/python-developer.md) |
| `/review` | Code review workflow — parallel security, quality, and documentation audits with verification and structured reports. | [Guide](docs/plugins/code-review.md) |
| `/fix` | Fix a single issue by ID or pasted issue block from a saved review report. | [Guide](docs/plugins/code-review.md) |
| `/fix-report` | Batch-fix issues from a saved review report with interactive selection. | [Guide](docs/plugins/code-review.md) |
| `/analyze-feedback` | Analyze PR feedback comments, classify validity, and generate response drafts. | [Guide](docs/plugins/code-review.md) |
| `@python-developer` | Direct agent invocation for Python tasks outside of `/develop`. | [Guide](docs/plugins/python-developer.md) |
| `@security-auditor` | Direct agent invocation for security audits with skill-agent delegation. | [Guide](docs/plugins/code-review.md) |
| `@code-quality-auditor` | Direct agent invocation for code quality audits with skill-agent delegation. | [Guide](docs/plugins/code-review.md) |
| `@documentation-auditor` | Documentation audit agent — verifies code changes are reflected in docs. | [Guide](docs/plugins/code-review.md) |
| `@cross-verifier` | Cross-domain correlation agent — finds intersections between findings. | [Guide](docs/plugins/code-review.md) |
| `@challenger` | Adversarial review agent — challenges findings for false positives. | [Guide](docs/plugins/code-review.md) |
| `@feedback-analyzer` | Per-comment classification agent for PR feedback analysis. | [Guide](docs/plugins/code-review.md) |
| `@fix-auto` | Auto-fix subagent — performs fixes without user confirmation. | [Guide](docs/plugins/code-review.md) |

## Repository Structure

- `packages/commit` - plugin source, tests, command template, and build scripts for the commit workflow.
- `docs/plugins/commit.md` - package-level behavior and usage guide.
- `packages/python-developer` - plugin source, tests, skill files, and build scripts for the Python development workflow.
- `docs/plugins/python-developer.md` - package-level behavior and usage guide.
- `packages/code-review` - plugin source, tests, agent prompts, command template, and build scripts for the code review workflow.
- `docs/plugins/code-review.md` - package-level behavior and usage guide.
- `package.json` - workspace definition and shared validation commands.

## Local Development

Install workspace dependencies:

```bash
npm install
```

Run the main validation commands:

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

## Documentation

- [Commit Plugin Guide](docs/plugins/commit.md)
- [Python Developer Plugin Guide](docs/plugins/python-developer.md)
- [Code Review Plugin Guide](docs/plugins/code-review.md)

## License

This repository currently does not include a top-level `LICENSE` file. Add one before publishing or distributing the packages beyond internal use.
