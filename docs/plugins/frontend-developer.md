# @appverk/opencode-frontend-developer

TypeScript + React development workflow for OpenCode. Provides the `/frontend` command and `frontend-developer` agent with modular skill loading for Tailwind, Zustand, TanStack Query, React Hook Form, TanStack Router, and pnpm.

## Installation

The root plugin bundle (`av-opencode-plugins`) includes this package automatically. No separate install needed.

## Usage

Run the TypeScript + React development workflow:

```text
/frontend <task description>
```

Example:
```text
/frontend Add user profile form with validation
```

The command:
1. Detects your project stack (Tailwind, Zustand, TanStack Query, etc.)
2. Loads relevant TypeScript + React development skills
3. Follows TDD: writes tests first, then implementation
4. Runs quality gates (typecheck, tests, lint)

## Direct Agent Use

You can also invoke the agent directly:

```bash
opencode agent frontend-developer "Refactor auth store to use Zustand"
```

## Available Skills

The plugin bundles 8 skills loaded on demand via the `load_frontend_skill` tool:

- `coding-standards` — AppVerk TypeScript + React rules (strict types, no any/as/!, interfaces, naming)
- `tdd-workflow` — Red-green-refactor cycle, React Testing Library, userEvent, 80%+ coverage
- `tailwind-patterns` — Utility-first CSS, custom classes, responsive design
- `zustand-patterns` — Store structure, slices, selectors, immer integration
- `tanstack-query-patterns` — Queries, mutations, cache invalidation, error handling
- `form-patterns` — React Hook Form + Zod, controlled inputs, validation
- `tanstack-router-patterns` — Route definitions, loaders, search params
- `pnpm-package-manager` — pnpm add/run/lock workflows

## Architecture

The plugin registers three elements through its `config` hook:

| Element | OpenCode Mechanism | Purpose |
|---|---|---|
| `agent.frontend-developer` | `config.agent` | Core persona with TypeScript + React/TDD expertise. Registered with `mode: "primary"` so it appears in TUI tab-completion. System prompt lists available skills and instructs the agent when to call `load_frontend_skill`. |
| `command.frontend` | `config.command` | Prompt template with `agent: frontend-developer` frontmatter. Orchestrates stack detection → core skill loading → conditional skill loading → TDD cycle. |
| `tool.load_frontend_skill` | `tool` (custom tool) | AI-callable tool returning the markdown content of a named skill file bundled with the plugin. |

### How Skills Are Loaded

1. The `/frontend` command (or direct agent invocation) starts a session with the `frontend-developer` agent.
2. The agent detects the project stack by reading `package.json` and scanning `src/` imports.
3. The agent calls the `load_frontend_skill(name)` tool for each relevant skill.
4. The tool reads the bundled `dist/skills/{name}.md` file and returns its content.
5. OpenCode injects the skill content into the agent context.
6. The agent follows the loaded rules during the TDD cycle and quality gates.

**Core skills** (`coding-standards`, `tdd-workflow`) are loaded for every task.  
**Stack-specific skills** (Tailwind, Zustand, TanStack Query, etc.) are loaded only when the corresponding framework is detected.

## Limitations

- OpenCode does **not** auto-detect TypeScript + React files and auto-switch to the `frontend-developer` agent. You must explicitly use `/frontend` or invoke the agent manually.
- Skills are loaded on demand via tool calls; the agent must correctly identify which skills are needed.
- If the plugin fails to load, `/frontend` will not be available and the `frontend-developer` agent will not exist.

## Project Structure

- `src/index.ts` — Plugin entry point (config hook + tool registration)
- `src/agent-prompt.md` — Core system prompt for `frontend-developer` agent
- `src/commands/frontend.md` — `/frontend` command template
- `src/tools/load-skill.ts` — `load_frontend_skill` tool implementation
- `src/skills/*.md` — 8 skill markdown files
- `scripts/copy-assets.mjs` — Build step that copies skills to `dist/skills/`
