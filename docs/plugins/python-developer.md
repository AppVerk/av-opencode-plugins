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

## Project Structure

- `src/index.ts` — Plugin entry point (config hook + tool registration)
- `src/agent-prompt.md` — Core system prompt for `python-developer` agent
- `src/commands/develop.md` — `/develop` command template
- `src/tools/load-skill.ts` — `load_python_skill` tool implementation
- `src/skills/*.md` — 10 skill markdown files
