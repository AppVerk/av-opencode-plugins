# av-opencode-plugins Design

## Status

Approved for planning.

## Context

The current `av-marketplace` repository is built around Claude Code concepts and file formats, including `.claude-plugin/marketplace.json`, plugin-local `.claude-plugin/` manifests, command markdown files with Claude-specific frontmatter, and tool semantics such as `TaskCreate`, `AskUserQuestion`, and `Skill`.

OpenCode uses a different extension model:

- plugins are JavaScript or TypeScript modules
- plugins are loaded from `.opencode/plugins/` or from npm packages declared in `opencode.json`
- commands are configured through `opencode.json` or `.opencode/commands/*.md`
- plugin runtime behavior is implemented through hooks and custom tools, not Claude-style plugin manifests

Because of this mismatch, OpenCode support will be developed in a separate repository instead of being added to `av-marketplace`.

## Goals

- Create a dedicated OpenCode repository named `av-opencode-plugins`
- Keep a single repository for all AppVerk OpenCode plugins
- Publish plugins as separate npm packages from that repository
- Start with one pilot plugin: `commit`
- Preserve Claude plugin semantics where they matter, while expressing them in OpenCode-native mechanisms

## Non-Goals

- Do not reuse Claude plugin runtime files directly
- Do not build a shared cross-runtime generator in the first iteration
- Do not create a public migration directory in the OpenCode repository
- Do not port multiple plugins in the first implementation cycle
- Do not auto-register OpenCode commands through unsupported plugin behavior

## Repository Strategy

`av-opencode-plugins` will be one repository with multiple npm packages.

The unit of maintenance is the repository.
The unit of installation for OpenCode users is the npm package.

The first published package will be:

- `@appverk/opencode-commit`

This structure allows AppVerk to keep one documentation set, one release workflow, and one place for future OpenCode plugins while still giving users package-level installation.

## Repository Structure

The initial repository structure will be:

```text
av-opencode-plugins/
├── docs/
├── examples/
│   └── commit/
└── packages/
    └── commit/
        └── src/
```

### `packages/commit/`

Contains the source for the npm package `@appverk/opencode-commit`.

### `packages/commit/src/`

Contains the OpenCode plugin runtime code.

Its responsibilities are:

- inspect tool calls before execution when policy enforcement is needed
- provide a custom tool for the controlled commit workflow
- centralize commit-policy validation and execution
- return clear operational errors when git operations fail

### `examples/commit/`

Contains user-facing installation examples for the pilot plugin.

It will include:

- an `opencode.json` example showing `plugin: ["@appverk/opencode-commit"]`
- a `.opencode/commands/commit.md` example defining `/commit`

This is intentionally separate from the runtime package so the repository stays user-oriented and the examples remain easy to browse in GitHub.

### `docs/`

Contains installation, usage, limitations, and package-specific documentation for OpenCode users.

## Pilot Plugin: `commit`

The first OpenCode package will port the existing Claude `commit` plugin concept.

The OpenCode version will preserve the following semantics:

- generate a Conventional Commit message from repository changes
- optionally include `Refs: <task-id>` when the user provides a task identifier
- block `git push`
- block disallowed co-authorship footers
- guide the user toward the intended `/commit` workflow instead of ad hoc direct commit execution

The OpenCode version will not try to reproduce Claude-specific manifest structure or hook escape hatches.

## OpenCode Workflow Design

The commit workflow will use both OpenCode commands and plugin runtime code.

### User Entry Point

The user runs:

- `/commit`
- `/commit <task-id>`

The `/commit` command is defined in `.opencode/commands/commit.md` and distributed as an example in `examples/commit/`.

### Command Responsibilities

The command prompt injects the git context needed to draft a message:

- `git status`
- `git diff HEAD`
- `git branch --show-current`
- `git log --oneline -10`

The model then:

- analyzes staged, unstaged, and untracked changes
- drafts a Conventional Commit message
- passes the validated intent to the plugin custom tool instead of calling raw `git commit` directly

### Plugin Runtime Responsibilities

The runtime plugin will expose a custom tool named `av_commit`.

That tool is responsible for:

- staging selected files
- validating the final commit message
- appending `Refs: <task-id>` when applicable
- rejecting disallowed footers such as `Co-Authored-By`
- executing the actual `git commit`
- returning the resulting status to the session

The runtime plugin will also use `tool.execute.before` to intercept direct `bash` invocations of `git commit` outside the approved workflow and to block `git push`.

When a direct commit attempt happens, it will block the action and tell the user to use `/commit`.
When a push attempt happens, it will block the action with a direct policy error.

This creates a clean split:

- the command handles prompting and context gathering
- the plugin runtime handles policy enforcement and execution

## Error Handling and Safety

The pilot design uses explicit error categories.

### Configuration Errors

Examples:

- plugin installed but command file not added
- command file added but plugin package missing from `opencode.json`

Response:

- documentation must provide a deterministic installation path
- runtime errors must clearly identify missing configuration rather than failing silently

### Repository State Errors

Examples:

- not a git repository
- no changes to commit
- index or working tree state prevents commit
- filesystem permissions prevent write operations

Response:

- report the exact operational problem
- do not guess or auto-repair repository state

### Policy Errors

Examples:

- direct `git commit` outside the approved flow
- `git push`
- disallowed commit footer
- unsupported attempt to bypass the policy tool

Response:

- block the action
- point the user back to `/commit` when appropriate

### Execution Errors

Examples:

- repository hooks reject the commit
- git returns a non-zero exit code

Response:

- return stderr and post-failure repository status
- do not mutate the repository further in an attempt to self-heal

## Testing Strategy

The testing strategy is intentionally thin and focused on executable runtime logic.

### Unit Tests

Cover deterministic logic only:

- commit message validation
- footer rejection rules
- `Refs` footer behavior
- detection of disallowed direct commit paths

### Integration Tests

Run against temporary git repositories:

- successful controlled commit
- no-change commit attempt
- blocked direct `git commit`
- repository-hook rejection surfaced correctly

### Manual Validation

Required before calling the pilot done:

- install `@appverk/opencode-commit` in a real OpenCode environment
- add the `/commit` command from the example config
- execute `/commit` in a real git repository
- verify that direct `git commit` is blocked outside the approved workflow

## Acceptance Criteria for the Pilot

The `commit` pilot is considered successful when all of the following are true:

- a user can install the plugin from documented instructions
- a user can add the provided `/commit` command configuration without extra undocumented steps
- `/commit` produces a valid Conventional Commit in a real repository
- the package blocks unsafe direct commit behavior outside the intended flow
- the implementation remains OpenCode-native and does not depend on Claude-specific runtime structures

## Deferred Work

The following items are intentionally deferred until after the `commit` pilot proves the model:

- porting additional plugins such as `code-review`, `frontend-developer`, or `qa`
- designing a common abstraction layer across Claude and OpenCode repositories
- establishing a shared release process across both ecosystems
- deciding whether some future OpenCode deliverables should be command bundles, plugin packages, or both

## Decision Summary

- Create a new repository named `av-opencode-plugins` as a sibling of `av-marketplace`
- Keep all OpenCode plugins in one repository
- Publish installable functionality as separate npm packages
- Start with `@appverk/opencode-commit`
- Use OpenCode-native commands plus plugin runtime hooks and a custom tool
- Keep testing focused on deterministic runtime behavior and one real OpenCode validation path
