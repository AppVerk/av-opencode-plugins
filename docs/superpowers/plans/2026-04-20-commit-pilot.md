# Commit Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first OpenCode-native AppVerk plugin package, `@appverk/opencode-commit`, with a controlled `/commit` workflow, runtime policy enforcement, examples, and documentation.

**Architecture:** The repository stays as one npm-workspace monorepo with a single pilot package under `packages/commit/`. The package keeps deterministic logic in small TypeScript modules: commit-message normalization, bash policy classification, controlled git execution, and a thin OpenCode plugin entrypoint that wires those pieces into a custom `av_commit` tool and a `tool.execute.before` hook.

**Tech Stack:** npm workspaces, TypeScript, `@opencode-ai/plugin`, Vitest, Node `child_process`, OpenCode command markdown examples.

---

## Planned File Map

### Repository root

- Create: `package.json`
  - npm workspace root for `packages/*`
  - shared scripts for build, test, and full verification
- Create: `.gitignore`
  - ignore `node_modules`, `dist`, coverage output, and temp files
- Create: `tsconfig.base.json`
  - shared TypeScript compiler settings for all packages
- Modify: `README.md`
  - explain repository purpose and point to the commit plugin docs and examples

### Commit package

- Create: `packages/commit/package.json`
  - package metadata and per-package scripts for build, test, and typecheck
- Create: `packages/commit/tsconfig.json`
  - package-local TS config extending the root base config
- Create: `packages/commit/vitest.config.ts`
  - package-local test discovery config
- Create: `packages/commit/src/index.ts`
  - OpenCode plugin entrypoint that registers the custom tool and bash hook
- Create: `packages/commit/src/message-policy.ts`
  - Conventional Commit validation and `Refs` footer normalization
- Create: `packages/commit/src/bash-policy.ts`
  - classify bash commands into allow, block-direct-commit, or block-push
- Create: `packages/commit/src/controlled-commit.ts`
  - deterministic git execution for add, commit, status, and error handling

### Commit package tests

- Create: `packages/commit/tests/package-smoke.test.ts`
  - smoke test for the exported plugin factory
- Create: `packages/commit/tests/message-policy.test.ts`
  - unit tests for commit message validation and footer behavior
- Create: `packages/commit/tests/bash-policy.test.ts`
  - unit tests for command classification
- Create: `packages/commit/tests/controlled-commit.integration.test.ts`
  - temp-repo integration tests for successful commits, no-change failures, and hook failures
- Create: `packages/commit/tests/plugin.test.ts`
  - plugin wiring tests for custom tool registration and `bash` blocking

### User-facing examples and docs

- Create: `examples/commit/opencode.json`
  - example OpenCode config with plugin installation
- Create: `examples/commit/.opencode/commands/commit.md`
  - ready-to-copy `/commit` command prompt using `av_commit`
- Create: `docs/plugins/commit.md`
  - install, configure, use, and understand the plugin

### Out of scope for this plan

- No second plugin package
- No publish automation yet
- No shared abstraction with `av-marketplace`

### Task 1: Scaffold The Monorepo And Commit Package

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `tsconfig.base.json`
- Create: `packages/commit/package.json`
- Create: `packages/commit/tsconfig.json`
- Create: `packages/commit/vitest.config.ts`
- Create: `packages/commit/tests/package-smoke.test.ts`
- Create: `packages/commit/src/index.ts`

- [ ] **Step 1: Create the workspace and package scaffolding**

```json
// package.json
{
  "name": "av-opencode-plugins",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspace @appverk/opencode-commit",
    "test": "npm run test --workspace @appverk/opencode-commit",
    "typecheck": "npm run typecheck --workspace @appverk/opencode-commit",
    "check": "npm run typecheck && npm run test && npm run build"
  },
  "devDependencies": {
    "@types/node": "^22.15.3",
    "tsup": "^8.5.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

```gitignore
# .gitignore
node_modules/
dist/
coverage/
.DS_Store
*.tsbuildinfo
```

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "types": ["node", "vitest/globals"]
  }
}
```

```json
// packages/commit/package.json
{
  "name": "@appverk/opencode-commit",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "test": "vitest run --config vitest.config.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.14.19"
  }
}
```

```json
// packages/commit/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "."
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts",
    "vitest.config.ts"
  ]
}
```

```ts
// packages/commit/vitest.config.ts
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: npm creates `package-lock.json`, installs workspace dependencies, and exits with code `0`.

- [ ] **Step 3: Write the failing package smoke test**

```ts
// packages/commit/tests/package-smoke.test.ts
import { describe, expect, it } from "vitest"
import { AppVerkCommitPlugin } from "../src/index.js"

describe("AppVerkCommitPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkCommitPlugin).toBe("function")
  })
})
```

- [ ] **Step 4: Run the smoke test to verify it fails**

Run: `npm run test --workspace @appverk/opencode-commit -- package-smoke`

Expected: FAIL with a module resolution error for `../src/index.js`.

- [ ] **Step 5: Create the minimal plugin entrypoint**

```ts
// packages/commit/src/index.ts
import type { Plugin } from "@opencode-ai/plugin"

export const AppVerkCommitPlugin: Plugin = async () => {
  return {}
}

export default AppVerkCommitPlugin
```

- [ ] **Step 6: Run the smoke test again**

Run: `npm run test --workspace @appverk/opencode-commit -- package-smoke`

Expected: PASS with `1 passed`.

- [ ] **Step 7: Commit the scaffold**

```bash
git add .gitignore package.json package-lock.json tsconfig.base.json packages/commit/package.json packages/commit/tsconfig.json packages/commit/vitest.config.ts packages/commit/src/index.ts packages/commit/tests/package-smoke.test.ts
git commit -m "chore(repo): scaffold commit plugin workspace"
```

### Task 2: Add Commit Message Validation And Footer Normalization

**Files:**
- Create: `packages/commit/src/message-policy.ts`
- Create: `packages/commit/tests/message-policy.test.ts`

- [ ] **Step 1: Write the failing message-policy tests**

```ts
// packages/commit/tests/message-policy.test.ts
import { describe, expect, it } from "vitest"
import { normalizeCommitMessage } from "../src/message-policy.js"

describe("normalizeCommitMessage", () => {
  it("accepts a valid Conventional Commit subject", () => {
    expect(normalizeCommitMessage("feat: add commit plugin")).toBe(
      "feat: add commit plugin",
    )
  })

  it("appends a Refs footer once", () => {
    expect(normalizeCommitMessage("fix: block direct commit", "AV-42")).toBe(
      "fix: block direct commit\n\nRefs: AV-42",
    )
  })

  it("rejects disallowed co-authorship footers", () => {
    expect(() =>
      normalizeCommitMessage(
        "feat: add plugin\n\nCo-Authored-By: Bot <bot@example.com>",
      ),
    ).toThrow(/Co-Authored-By/i)
  })

  it("rejects messages that do not follow Conventional Commits", () => {
    expect(() => normalizeCommitMessage("add plugin")).toThrow(
      /Conventional Commits/i,
    )
  })
})
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npm run test --workspace @appverk/opencode-commit -- message-policy`

Expected: FAIL with a module resolution error for `../src/message-policy.js`.

- [ ] **Step 3: Implement the minimal message-policy module**

```ts
// packages/commit/src/message-policy.ts
const COMMIT_HEADER =
  /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|release|security|i18n|config)(\([a-z0-9-]+\))?!?: .+$/i

const DISALLOWED_FOOTERS = [/^co-authored-by:/i]

export function normalizeCommitMessage(message: string, taskId?: string): string {
  const normalized = message.trim()

  if (!normalized) {
    throw new Error("Commit message cannot be empty.")
  }

  const lines = normalized.split(/\r?\n/)
  const header = lines[0] ?? ""

  if (!COMMIT_HEADER.test(header)) {
    throw new Error("Commit message must follow Conventional Commits.")
  }

  if (
    lines.some((line) =>
      DISALLOWED_FOOTERS.some((pattern) => pattern.test(line.trim())),
    )
  ) {
    throw new Error("Co-Authored-By footers are not allowed.")
  }

  if (!taskId) {
    return normalized
  }

  const refsFooter = `Refs: ${taskId}`

  if (lines.some((line) => line.trim() === refsFooter)) {
    return normalized
  }

  return `${normalized}\n\n${refsFooter}`
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace @appverk/opencode-commit -- message-policy`

Expected: PASS with `4 passed`.

- [ ] **Step 5: Commit the message policy module**

```bash
git add packages/commit/src/message-policy.ts packages/commit/tests/message-policy.test.ts
git commit -m "feat(commit): add commit message policy"
```

### Task 3: Add Bash Command Classification For Policy Enforcement

**Files:**
- Create: `packages/commit/src/bash-policy.ts`
- Create: `packages/commit/tests/bash-policy.test.ts`

- [ ] **Step 1: Write the failing bash-policy tests**

```ts
// packages/commit/tests/bash-policy.test.ts
import { describe, expect, it } from "vitest"
import { classifyBashCommand } from "../src/bash-policy.js"

describe("classifyBashCommand", () => {
  it("blocks direct git commit commands", () => {
    expect(classifyBashCommand('git commit -m "feat: bad"')).toBe(
      "block-direct-commit",
    )
  })

  it("blocks git push commands", () => {
    expect(classifyBashCommand("git push --force-with-lease")).toBe(
      "block-push",
    )
  })

  it("allows safe git inspection commands", () => {
    expect(classifyBashCommand("git status --short")).toBe("allow")
  })
})
```

- [ ] **Step 2: Run the test file to verify it fails**

Run: `npm run test --workspace @appverk/opencode-commit -- bash-policy`

Expected: FAIL with a module resolution error for `../src/bash-policy.js`.

- [ ] **Step 3: Implement the minimal bash-policy module**

```ts
// packages/commit/src/bash-policy.ts
export type BashPolicyDecision =
  | "allow"
  | "block-direct-commit"
  | "block-push"

export function classifyBashCommand(command: string): BashPolicyDecision {
  const normalized = command.trim()

  if (/\bgit\s+push(\s|$)/i.test(normalized)) {
    return "block-push"
  }

  if (/\bgit\s+commit(\s|$)/i.test(normalized)) {
    return "block-direct-commit"
  }

  return "allow"
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace @appverk/opencode-commit -- bash-policy`

Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit the bash policy module**

```bash
git add packages/commit/src/bash-policy.ts packages/commit/tests/bash-policy.test.ts
git commit -m "feat(commit): classify blocked git commands"
```

### Task 4: Implement Deterministic Git Commit Execution

**Files:**
- Create: `packages/commit/src/controlled-commit.ts`
- Create: `packages/commit/tests/controlled-commit.integration.test.ts`

- [ ] **Step 1: Write the failing integration test suite**

```ts
// packages/commit/tests/controlled-commit.integration.test.ts
import { execFile } from "node:child_process"
import { chmod, mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { createControlledCommit } from "../src/controlled-commit.js"

const execFileAsync = promisify(execFile)

async function createRepo(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "av-opencode-commit-"))

  await execFileAsync("git", ["init"], { cwd: directory })
  await execFileAsync("git", ["config", "user.email", "dev@example.com"], {
    cwd: directory,
  })
  await execFileAsync("git", ["config", "user.name", "Dev User"], {
    cwd: directory,
  })

  return directory
}

describe("createControlledCommit", () => {
  it("creates a commit for staged changes", async () => {
    const directory = await createRepo()

    await writeFile(path.join(directory, "note.txt"), "hello\n")

    const result = await createControlledCommit({
      cwd: directory,
      files: ["note.txt"],
      message: "feat: add note",
    })

    const log = await execFileAsync("git", ["log", "-1", "--format=%B"], {
      cwd: directory,
    })

    expect(log.stdout.trim()).toBe("feat: add note")
    expect(result.commitMessage).toBe("feat: add note")
  })

  it("fails when there are no changes to commit", async () => {
    const directory = await createRepo()

    await expect(
      createControlledCommit({
        cwd: directory,
        message: "chore: empty commit",
      }),
    ).rejects.toThrow(/No changes to commit/i)
  })

  it("surfaces repository hook failures", async () => {
    const directory = await createRepo()

    await writeFile(path.join(directory, "note.txt"), "blocked\n")
    await mkdir(path.join(directory, ".git", "hooks"), { recursive: true })
    await writeFile(
      path.join(directory, ".git", "hooks", "pre-commit"),
      "#!/bin/sh\nprintf 'blocked by hook' >&2\nexit 1\n",
    )
    await chmod(path.join(directory, ".git", "hooks", "pre-commit"), 0o755)

    await expect(
      createControlledCommit({
        cwd: directory,
        files: ["note.txt"],
        message: "fix: surface hook error",
      }),
    ).rejects.toThrow(/blocked by hook/i)
  })
})
```

- [ ] **Step 2: Run the integration suite to verify it fails**

Run: `npm run test --workspace @appverk/opencode-commit -- controlled-commit`

Expected: FAIL with a module resolution error for `../src/controlled-commit.js`.

- [ ] **Step 3: Implement the controlled git executor**

```ts
// packages/commit/src/controlled-commit.ts
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { normalizeCommitMessage } from "./message-policy.js"

const execFileAsync = promisify(execFile)

export interface ControlledCommitInput {
  cwd: string
  message: string
  files?: string[]
  taskId?: string
}

interface GitResult {
  stdout: string
  stderr: string
  exitCode: number
}

async function runGit(cwd: string, args: string[]): Promise<GitResult> {
  try {
    const result = await execFileAsync("git", args, { cwd })

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
    }
  } catch (error) {
    const failure = error as Error & {
      stdout?: string
      stderr?: string
      code?: number
    }

    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      exitCode: Number(failure.code ?? 1),
    }
  }
}

export async function createControlledCommit(input: ControlledCommitInput) {
  const repoCheck = await runGit(input.cwd, ["rev-parse", "--is-inside-work-tree"])

  if (repoCheck.exitCode !== 0) {
    throw new Error("Current directory is not a git repository.")
  }

  const addArgs = input.files && input.files.length > 0
    ? ["add", "--", ...input.files]
    : ["add", "-A"]

  const addResult = await runGit(input.cwd, addArgs)

  if (addResult.exitCode !== 0) {
    throw new Error(addResult.stderr.trim() || addResult.stdout.trim() || "git add failed.")
  }

  const stagedChanges = await runGit(input.cwd, ["diff", "--cached", "--quiet"])

  if (stagedChanges.exitCode === 0) {
    throw new Error("No changes to commit.")
  }

  const commitMessage = normalizeCommitMessage(input.message, input.taskId)
  const commitResult = await runGit(input.cwd, ["commit", "-m", commitMessage])

  if (commitResult.exitCode !== 0) {
    throw new Error(
      commitResult.stderr.trim() || commitResult.stdout.trim() || "git commit failed.",
    )
  }

  const statusResult = await runGit(input.cwd, ["status", "--short"])

  return {
    commitMessage,
    status: statusResult.stdout.trim(),
  }
}
```

- [ ] **Step 4: Run the integration suite again**

Run: `npm run test --workspace @appverk/opencode-commit -- controlled-commit`

Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit the deterministic executor**

```bash
git add packages/commit/src/controlled-commit.ts packages/commit/tests/controlled-commit.integration.test.ts
git commit -m "feat(commit): add controlled git executor"
```

### Task 5: Wire The OpenCode Plugin Runtime

**Files:**
- Modify: `packages/commit/src/index.ts`
- Create: `packages/commit/tests/plugin.test.ts`

- [ ] **Step 1: Write the failing plugin wiring tests**

```ts
// packages/commit/tests/plugin.test.ts
import { describe, expect, it } from "vitest"
import { AppVerkCommitPlugin } from "../src/index.js"

describe("AppVerkCommitPlugin runtime", () => {
  it("registers the av_commit tool", async () => {
    const plugin = await AppVerkCommitPlugin({} as never)

    expect(plugin.tool?.av_commit).toBeDefined()
  })

  it("blocks direct git commit bash commands", async () => {
    const plugin = await AppVerkCommitPlugin({} as never)

    await expect(
      plugin["tool.execute.before"]?.(
        { tool: "bash", args: { command: 'git commit -m "feat: bypass"' } } as never,
        { args: { command: 'git commit -m "feat: bypass"' } } as never,
      ),
    ).rejects.toThrow(/use \/commit/i)
  })

  it("blocks git push bash commands", async () => {
    const plugin = await AppVerkCommitPlugin({} as never)

    await expect(
      plugin["tool.execute.before"]?.(
        { tool: "bash", args: { command: "git push origin main" } } as never,
        { args: { command: "git push origin main" } } as never,
      ),
    ).rejects.toThrow(/git push is blocked/i)
  })
})
```

- [ ] **Step 2: Run the plugin test file to verify it fails**

Run: `npm run test --workspace @appverk/opencode-commit -- plugin`

Expected: FAIL because `plugin.tool?.av_commit` is `undefined` and the hook does not block anything yet.

- [ ] **Step 3: Replace the stub plugin entrypoint with the real runtime**

```ts
// packages/commit/src/index.ts
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { classifyBashCommand } from "./bash-policy.js"
import { createControlledCommit } from "./controlled-commit.js"

export const AppVerkCommitPlugin: Plugin = async () => {
  return {
    tool: {
      av_commit: tool({
        description: "Create a commit through the AppVerk commit workflow",
        args: {
          message: tool.schema
            .string()
            .describe("The Conventional Commit message to create"),
          files: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Optional file paths to stage before committing"),
          taskId: tool.schema
            .string()
            .optional()
            .describe("Optional task ID appended as a Refs footer"),
        },
        async execute(args, context) {
          const result = await createControlledCommit({
            cwd: context.worktree ?? context.directory,
            message: args.message,
            files: args.files ?? [],
            taskId: args.taskId,
          })

          return JSON.stringify(result, null, 2)
        },
      }),
    },
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") {
        return
      }

      const command = String(output.args.command ?? "")
      const decision = classifyBashCommand(command)

      if (decision === "block-direct-commit") {
        throw new Error("Direct git commit is blocked. Use /commit instead.")
      }

      if (decision === "block-push") {
        throw new Error("git push is blocked by @appverk/opencode-commit.")
      }
    },
  }
}

export default AppVerkCommitPlugin
```

- [ ] **Step 4: Run the package test suite to verify the runtime works end-to-end**

Run: `npm run test --workspace @appverk/opencode-commit`

Expected: PASS with all smoke, unit, integration, and plugin tests green.

- [ ] **Step 5: Run the package typecheck and build**

Run: `npm run typecheck --workspace @appverk/opencode-commit && npm run build --workspace @appverk/opencode-commit`

Expected: both commands exit with code `0` and produce `packages/commit/dist/index.js` plus type declarations.

- [ ] **Step 6: Commit the OpenCode runtime wiring**

```bash
git add packages/commit/src/index.ts packages/commit/tests/plugin.test.ts packages/commit/src/bash-policy.ts packages/commit/src/controlled-commit.ts packages/commit/src/message-policy.ts packages/commit/tests/package-smoke.test.ts packages/commit/tests/message-policy.test.ts packages/commit/tests/bash-policy.test.ts packages/commit/tests/controlled-commit.integration.test.ts
git commit -m "feat(commit): wire OpenCode commit runtime"
```

### Task 6: Add User-Facing Examples, Documentation, And Final Verification

**Files:**
- Create: `examples/commit/opencode.json`
- Create: `examples/commit/.opencode/commands/commit.md`
- Create: `docs/plugins/commit.md`
- Modify: `README.md`

- [ ] **Step 1: Create the example OpenCode config**

```json
// examples/commit/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@appverk/opencode-commit"]
}
```

- [ ] **Step 2: Create the example `/commit` command**

````md
<!-- examples/commit/.opencode/commands/commit.md -->
---
description: Create a git commit with the AppVerk commit workflow
---

Current git status:
!`git status`

Current git diff:
!`git diff HEAD`

Current branch:
!`git branch --show-current`

Recent commits:
!`git log --oneline -10`

Task ID: $1

Write a concise Conventional Commit message that matches the current changes.

Rules:
- Never run `git push`.
- Never run `git commit` through `bash`.
- Never include `Co-Authored-By` or other AI attribution footers.
- Use the `av_commit` tool to create the commit.
- If `Task ID` is empty, omit `taskId` from the tool call.
- If `Task ID` is present, pass it through as `taskId`.
````

- [ ] **Step 3: Write the plugin documentation page**

````md
<!-- docs/plugins/commit.md -->
# Commit Plugin

`@appverk/opencode-commit` adds an OpenCode-native commit workflow with policy enforcement.

## Install

1. Add the plugin package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@appverk/opencode-commit"]
}
```

2. Copy the example command from `examples/commit/.opencode/commands/commit.md` into your project.

## Usage

- Run `/commit` to create a commit for the current repository changes.
- Run `/commit AV-42` to append `Refs: AV-42` to the final message.

## Behavior

- Blocks direct `git commit` through the `bash` tool.
- Blocks `git push` through the `bash` tool.
- Rejects `Co-Authored-By` footers.
- Stages the selected files passed to `av_commit`, or all changes when no file list is provided.

## Limitations

- The package does not install the `/commit` command automatically.
- The user must add the command configuration explicitly.
- Repository hooks still run and can reject the commit.
````

- [ ] **Step 4: Update the repository README**

````md
<!-- README.md -->
# av-opencode-plugins

OpenCode plugin repository for AppVerk.

## Packages

- `@appverk/opencode-commit` - controlled commit workflow for OpenCode with Conventional Commit generation and bash policy enforcement.

## Getting Started

- Install the plugin package through your OpenCode config.
- Copy the example files from `examples/commit/` into your OpenCode project config.
- Read `docs/plugins/commit.md` for usage details.

## Planning Artifacts

- Design spec: `docs/superpowers/specs/2026-04-20-av-opencode-plugins-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-20-commit-pilot.md`
````

- [ ] **Step 5: Run the full repository verification suite**

Run: `npm run check`

Expected: typecheck, test, and build all exit with code `0`.

- [ ] **Step 6: Run the required manual OpenCode validation**

Run these manual checks in a real OpenCode project using the example config:

```text
1. Add `plugin: ["@appverk/opencode-commit"]` to the project `opencode.json`.
2. Copy `examples/commit/.opencode/commands/commit.md` into the project.
3. Start OpenCode and run `/commit` in a git repository with local changes.
4. Confirm the session uses `av_commit` instead of raw `git commit`.
5. Confirm a direct `bash` call to `git commit -m "feat: bypass"` is blocked.
6. Confirm a direct `bash` call to `git push` is blocked.
```

Expected: the plugin creates a valid commit via `/commit`, and both blocked bash paths return policy errors.

- [ ] **Step 7: Commit the docs and examples**

```bash
git add README.md docs/plugins/commit.md examples/commit/opencode.json examples/commit/.opencode/commands/commit.md
git commit -m "docs(commit): add install guide and command examples"
```

## Self-Review Checklist

- Spec coverage:
  - repository strategy -> Task 1 and README update in Task 6
  - `@appverk/opencode-commit` pilot package -> Tasks 1 through 5
  - custom `av_commit` tool -> Task 5
  - blocked direct `git commit` and `git push` -> Tasks 3 and 5
  - `Refs: <task-id>` and Conventional Commits -> Task 2 and Task 4
  - examples and docs -> Task 6
  - manual OpenCode validation -> Task 6
- Placeholder scan: no `TODO`, `TBD`, or open-ended implementation notes remain.
- Type consistency: exported names stay consistent across the plan: `AppVerkCommitPlugin`, `normalizeCommitMessage`, `classifyBashCommand`, and `createControlledCommit`.
