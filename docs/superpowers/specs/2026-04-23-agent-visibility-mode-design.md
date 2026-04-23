# Design: Agent Visibility (`mode`) for AppVerk OpenCode Plugins

**Date:** 2026-04-23
**Status:** Approved
**Approach:** Minimal (Approach A)

## Context

The AppVerk OpenCode plugin bundle registers 13 agents across two plugins (`python-developer` and `code-review`). Currently, none of them set the `mode` field in their `AgentConfig`, which means they all appear in the TUI tab-completion list. This creates noise for users who primarily interact with agents through slash commands (`/review`, `/fix`, `/develop`) rather than direct `@agent` invocation.

## Problem Statement

After installing the AppVerk plugin bundle, pressing `tab` in the OpenCode TUI cycles through a very large number of agents. Most of these agents are internal sub-agents invoked by slash commands and are rarely (if ever) called directly by the user. We want to hide these agents from the primary tab-completion list while keeping them fully functional when invoked explicitly with `@agent-name`.

## Solution

Set `mode: "subagent"` on all agents that are only ever invoked indirectly (via slash commands), and `mode: "primary"` on agents that the user may want to select manually via `tab`.

### Agent Visibility Mapping

#### Python Developer Plugin

| Agent | `mode` | Reasoning |
|---|---|---|
| `python-developer` | `"primary"` | The user explicitly mentioned selecting this agent manually via `tab`. |

#### Code Review Plugin

| Agent | `mode` | Reasoning |
|---|---|---|
| `security-auditor` | `"subagent"` | Invoked only via `/review`. |
| `code-quality-auditor` | `"subagent"` | Invoked only via `/review`. |
| `documentation-auditor` | `"subagent"` | Invoked only via `/review`. |
| `cross-verifier` | `"subagent"` | Invoked only via `/review`. |
| `challenger` | `"subagent"` | Invoked only via `/review`. |
| `fix-auto` | `"subagent"` | Invoked only via `/fix`. |
| `feedback-analyzer` | `"subagent"` | Invoked only via `/analyze-feedback`. |
| `skill-secret-scanner` | `"subagent"` | Internal skill-agent. |
| `skill-sast-analyzer` | `"subagent"` | Internal skill-agent. |
| `skill-dependency-scanner` | `"subagent"` | Internal skill-agent. |
| `skill-architecture-analyzer` | `"subagent"` | Internal skill-agent. |
| `skill-linter-integrator` | `"subagent"` | Internal skill-agent. |

### Commit Plugin

No agents are registered by the commit plugin, so no changes are required.

## User Impact

- **Before:** 13 AppVerk agents appear in the `tab` completion list.
- **After:** 1 AppVerk agent (`python-developer`) appears in the `tab` completion list.
- All 13 agents remain fully functional and accessible via `@agent-name`.

## Technical Details

### OpenCode `AgentConfig.mode`

The `@opencode-ai/sdk` defines `AgentConfig` as:

```typescript
type AgentConfig = {
  model?: string;
  temperature?: number;
  top_p?: number;
  prompt?: string;
  tools?: { [key: string]: boolean };
  disable?: boolean;
  description?: string;
  mode?: "subagent" | "primary" | "all";
  // ... other fields
};
```

- `"primary"` — Visible in the main agent selection list (accessed via `tab`).
- `"subagent"` — Hidden from the main list; accessible only via `@agent-name`.
- `"all"` — Visible everywhere (default behavior if omitted).

### Plugin Changes

#### `packages/python-developer/src/index.ts`

Add `mode: "primary"` to the `python-developer` agent registration:

```typescript
config.agent["python-developer"] = {
  description: AGENT_DESCRIPTION,
  prompt: AGENT_PROMPT,
  mode: "primary",
}
```

#### `packages/code-review/src/index.ts`

Add `mode: "subagent"` to each agent registration in the `AGENTS` array loop:

```typescript
for (const a of AGENTS) {
  config.agent[a.name] = {
    description: a.description,
    prompt: loadMarkdownFile(a.path),
    mode: "subagent",
  }
}
```

## Testing

Update existing plugin tests to assert the presence of `mode`:

- `packages/python-developer/tests/plugin.test.ts` — assert `config.agent["python-developer"].mode === "primary"`.
- `packages/code-review/tests/plugin.test.ts` — assert `config.agent[<name>].mode === "subagent"` for each expected agent.

## Future Work

If a need arises to invoke a specific code-review agent directly (e.g., `@security-auditor`), promoting it from `"subagent"` to `"primary"` is a one-line change. No architectural decisions in this design preclude that.
