# @appverk/opencode-python-developer

Python development workflow for OpenCode. Provides the `/develop` command and `python-developer` agent with modular skill loading for FastAPI, Django, Celery, SQLAlchemy, Pydantic, and async patterns.

## Installation

The root plugin bundle (`av-opencode-plugins`) includes this package automatically. No separate install needed.

## Usage

Run the Python development workflow:

```text
/develop <task description>
```

Example:
```text
/develop Add user authentication endpoint with JWT
```

The command:
1. Detects your project stack (FastAPI, Django, Celery, etc.)
2. Loads relevant Python development skills
3. Follows TDD: writes tests first, then implementation
4. Runs quality gates (typecheck, tests, lint)

## Direct Agent Use

You can also invoke the agent directly:

```bash
opencode agent python-developer "Refactor user service to use repository pattern"
```

## Available Skills

The plugin bundles 10 skills loaded on demand via the `load_python_skill` tool:

- `coding-standards` — AppVerk Python rules (types, imports, naming)
- `tdd-workflow` — Red-green-refactor cycle, fakes over mocks
- `fastapi-patterns` — DDD/Clean Architecture with FastAPI
- `sqlalchemy-patterns` — Async repository pattern, UoW
- `pydantic-patterns` — Model validation, settings
- `async-python-patterns` — asyncio, uvicorn, non-blocking I/O
- `uv-package-manager` — uv add/run/lock workflows
- `django-web-patterns` — Views, ViewSets, DRF serializers
- `django-orm-patterns` — Models, queries, migrations, N+1 prevention
- `celery-patterns` — Idempotent tasks, retry, pass IDs not objects

## Architecture

The plugin registers three elements through its `config` hook:

| Element | OpenCode Mechanism | Purpose |
|---|---|---|
| `agent.python-developer` | `config.agent` | Core persona with Python/TDD expertise. System prompt lists available skills and instructs the agent when to call `load_python_skill`. |
| `command.develop` | `config.command` | Prompt template with `agent: python-developer` frontmatter. Orchestrates stack detection → core skill loading → conditional skill loading → TDD cycle. |
| `tool.load_python_skill` | `tool` (custom tool) | AI-callable tool returning the markdown content of a named skill file bundled with the plugin. |

### How Skills Are Loaded

1. The `/develop` command (or direct agent invocation) starts a session with the `python-developer` agent.
2. The agent detects the project stack by reading `pyproject.toml` and scanning `src/` or `app/` imports.
3. The agent calls the `load_python_skill(name)` tool for each relevant skill.
4. The tool reads the bundled `dist/skills/{name}.md` file and returns its content.
5. OpenCode injects the skill content into the agent context.
6. The agent follows the loaded rules during the TDD cycle and quality gates.

**Core skills** (`coding-standards`, `tdd-workflow`) are loaded for every task.  
**Stack-specific skills** (FastAPI, Django, Celery, etc.) are loaded only when the corresponding framework is detected.

## Limitations

- OpenCode does **not** auto-detect Python files and auto-switch to the `python-developer` agent. You must explicitly use `/develop` or invoke the agent manually.
- Skills are loaded on demand via tool calls; the agent must correctly identify which skills are needed.
- If the plugin fails to load, `/develop` will not be available and the `python-developer` agent will not exist.

## Project Structure

- `src/index.ts` — Plugin entry point (config hook + tool registration)
- `src/agent-prompt.md` — Core system prompt for `python-developer` agent
- `src/commands/develop.md` — `/develop` command template
- `src/tools/load-skill.ts` — `load_python_skill` tool implementation
- `src/skills/*.md` — 10 skill markdown files
- `scripts/copy-skills.mjs` — Build step that copies skills to `dist/skills/`
