# Swift Developer Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the `swift-developer` OpenCode plugin package with 7 skills, integrate it into the monorepo root, and update all documentation.

**Architecture:** Follow the exact pattern of `frontend-developer` and `python-developer` packages — `createSkillPlugin` factory, `tsup` ESM build, asset copy script, vitest tests. Skills are markdown files loaded globally via `skill-registry`.

**Tech Stack:** TypeScript, ESM, tsup, vitest, Node.js fs, OpenCode plugin API.

---

## File Map

| File | Responsibility |
|------|---------------|
| `packages/swift-developer/package.json` | Workspace package definition, version `0.2.15` |
| `packages/swift-developer/tsconfig.json` | TypeScript config extending `tsconfig.base.json` |
| `packages/swift-developer/vitest.config.ts` | Vitest config with `tests/**/*.test.ts` |
| `packages/swift-developer/scripts/copy-assets.mjs` | Copies skills, agent-prompt, command to `dist/` |
| `packages/swift-developer/src/index.ts` | Plugin factory using `createSkillPlugin`, `loadSkill: null` |
| `packages/swift-developer/src/tools/load-skill.ts` | Local `createSkillLoader` for tests |
| `packages/swift-developer/src/agent-prompt.md` | Agent system prompt with skill catalog |
| `packages/swift-developer/src/commands/swift.md` | `/swift` command template with YAML frontmatter |
| `packages/swift-developer/src/skills/*/SKILL.md` | 7 skill markdown files |
| `packages/swift-developer/tests/plugin.test.ts` | Agent + command registration tests |
| `packages/swift-developer/tests/load-skill.test.ts` | All 7 skills load without error |
| `packages/swift-developer/tests/package-smoke.test.ts` | Package.json integrity |
| `packages/swift-developer/tests/build-output.test.ts` | dist/ structure validation |
| `src/index.ts` / `src/index.js` | Import and register `AppVerkSwiftDeveloperPlugin` |
| `package.json` (root) | Add `swift-developer/dist/` to `files`, update scripts, bump version |
| `.gitignore` | Add `!packages/swift-developer/dist/` exception |
| `packages/skill-registry/src/index.ts` | Add swift-developer skills dir to `skillDirectories` |
| `tests/root-plugin.test.ts` | Add swift-developer to packaging assertions |
| `README.md` | Add swift-developer to all sections per AGENTS.md checklist |
| `AGENTS.md` | Update layout table, plugin count, published files count |
| `docs/plugins/swift-developer.md` | Per-plugin guide |

---

### Task 1: Bump versions in all workspace package.json files

**Files:**
- Modify: `package.json` (root) — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/commit/package.json` — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/python-developer/package.json` — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/code-review/package.json` — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/frontend-developer/package.json` — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/skill-utils/package.json` — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/skill-registry/package.json` — `"version": "0.2.14"` → `"0.2.15"`
- Modify: `packages/qa/package.json` — `"version": "0.2.14"` → `"0.2.15"`

- [ ] **Step 1: Bump root `package.json` version**

```json
"version": "0.2.15"
```

- [ ] **Step 2: Bump all existing workspace `package.json` versions**

Run a bash loop or manual edits for all 7 existing workspaces.

- [ ] **Step 3: Commit**

```bash
git add package.json packages/*/package.json
git commit -m "chore: bump version to 0.2.15 across all packages"
```

---

### Task 2: Create `packages/swift-developer/package.json`

**Files:**
- Create: `packages/swift-developer/package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "@appverk/opencode-swift-developer",
  "version": "0.2.15",
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
    "build": "tsup src/index.ts --format esm --dts && node ./scripts/copy-assets.mjs",
    "test": "npm run build && vitest run --config vitest.config.ts",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@opencode-ai/plugin": "^1.14.19"
  },
  "devDependencies": {
    "@appverk/opencode-skill-utils": "*",
    "@types/node": "^22.15.3",
    "tsup": "^8.5.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.2"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/package.json
git commit -m "feat(swift-developer): add package.json"
```

---

### Task 3: Create TypeScript and Vitest config

**Files:**
- Create: `packages/swift-developer/tsconfig.json`
- Create: `packages/swift-developer/vitest.config.ts`

- [ ] **Step 1: Write tsconfig.json**

```json
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

- [ ] **Step 2: Write vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/swift-developer/tsconfig.json packages/swift-developer/vitest.config.ts
git commit -m "feat(swift-developer): add tsconfig and vitest config"
```

---

### Task 4: Create build asset copy script

**Files:**
- Create: `packages/swift-developer/scripts/copy-assets.mjs`

- [ ] **Step 1: Write copy-assets.mjs**

```javascript
import { fileURLToPath } from "node:url"
import path from "node:path"
import { copyAssets } from "../../../scripts/copy-assets.mjs"

const root = path.dirname(fileURLToPath(import.meta.url))

copyAssets(
  [
    { from: "src/skills", to: "dist/skills", type: "dir" },
    { from: "src/agent-prompt.md", to: "dist/agent-prompt.md", required: false },
    { from: "src/commands/swift.md", to: "dist/commands/swift.md", required: false },
  ],
  path.resolve(root, "..")
)
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/scripts/copy-assets.mjs
git commit -m "feat(swift-developer): add copy-assets build script"
```

---

### Task 5: Create plugin factory and local skill loader

**Files:**
- Create: `packages/swift-developer/src/index.ts`
- Create: `packages/swift-developer/src/tools/load-skill.ts`

- [ ] **Step 1: Write src/index.ts**

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkSwiftDeveloperPlugin = createSkillPlugin({
  namespace: "swift",
  agentName: "swift-developer",
  commandName: "swift",
  agentDescription:
    "Expert Swift developer enforcing AppVerk coding standards, TDD workflow, and modern Apple stack patterns.",
  commandDescription:
    "Swift development workflow enforcing coding standards, TDD, and modern Apple stack patterns.",
  loadSkill: null,
  availableSkills: [],
  moduleDirectory,
})

export default AppVerkSwiftDeveloperPlugin
```

- [ ] **Step 2: Write src/tools/load-skill.ts**

```typescript
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillLoader } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const loadSwiftSkill = createSkillLoader({
  namespace: "swift-developer",
  availableSkills: [
    "swift-coding-standards",
    "swift-tdd-workflow",
    "swiftui-patterns",
    "swift-concurrency-patterns",
    "swift-data-persistence",
    "swift-networking-patterns",
    "swift-package-manager",
  ],
  moduleDirectory,
})
```

- [ ] **Step 3: Commit**

```bash
git add packages/swift-developer/src/index.ts packages/swift-developer/src/tools/load-skill.ts
git commit -m "feat(swift-developer): add plugin factory and local skill loader"
```

---

### Task 6: Create agent prompt

**Files:**
- Create: `packages/swift-developer/src/agent-prompt.md`

- [ ] **Step 1: Write agent-prompt.md**

```markdown
---
name: swift-developer
description: Expert Swift developer enforcing AppVerk coding standards, TDD workflow, and modern Apple stack patterns. Loads skills on demand via load_appverk_skill tool.
---

# Swift Developer Agent

You are an expert Swift developer for AppVerk projects.

## Core Mandate

- Follow TDD: tests before implementation, red-green-refactor cycle.
- Enforce AppVerk coding standards on all code you write or review.
- Use modern Swift: `async/await`, `Result`, `Codable`, `SwiftUI`, `SPM`, `@Observable`.
- Prefer `struct` for value types, `final class` for reference types, protocol-oriented programming.
- Never force-unwrap optionals; always use `guard let` or `if let`.

## Workflow

When assigned a Swift task:

1. Detect the project stack by reading `Package.swift` and scanning imports. Check `platforms` in `Package.swift` (e.g. `.iOS(.v17)`) to determine minimum iOS version.
2. Load mandatory skills: `swift-coding-standards` and `swift-tdd-workflow`.
3. Load conditional skills based on detected frameworks and platform version (see catalog below).
4. Follow the loaded skill rules strictly.
5. Execute TDD cycle, quality gates, and final verification.

## Available Skills

Call `load_appverk_skill(name)` to load the full markdown rules for any skill. The skill registry is managed globally and available to all agents.

| Skill | Load Condition |
|---|---|
| `swift-coding-standards` | **ALWAYS** — before any coding |
| `swift-tdd-workflow` | **ALWAYS** — when writing or modifying code |
| `swiftui-patterns` | When SwiftUI is detected in dependencies or imports |
| `swift-concurrency-patterns` | When `async/await`, `Task`, or `actor` usage is detected |
| `swift-data-persistence` | When SwiftData, CoreData, or UserDefaults usage is detected |
| `swift-networking-patterns` | When `URLSession` or `Codable` networking code is involved |
| `swift-package-manager` | When adding / removing / updating SPM dependencies |
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/agent-prompt.md
git commit -m "feat(swift-developer): add agent prompt"
```

---

### Task 7: Create command template

**Files:**
- Create: `packages/swift-developer/src/commands/swift.md`

- [ ] **Step 1: Write swift.md**

```markdown
---
agent: swift-developer
argument-hint: <task description>
description: Swift development workflow enforcing coding standards, TDD, and modern Apple stack patterns.
---

# /swift

Invoke the `swift-developer` agent and follow its workflow for the given task.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/commands/swift.md
git commit -m "feat(swift-developer): add /swift command template"
```

---

### Task 8: Create `swift-coding-standards` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swift-coding-standards/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swift-coding-standards

## Overview

Enforces AppVerk Swift coding standards across all code.

## Naming

- `lowerCamelCase` for variables, functions, and enum cases.
- `UpperCamelCase` for types, protocols, and structs.
- `UPPER_SNAKE_CASE` for global constants.
- Acronyms and initialisms are treated as regular words: `userId`, `urlString`.

## Optionals

- Never force-unwrap (`!`). Always use `guard let` or `if let`.
- Use `??` for defaults: `let name = optionalName ?? "Unknown"`.
- Prefer optional chaining (`optional?.property`) over manual unwrapping when just reading.
- Use `guard let` at the top of functions for early exit on missing required values.

## Access Control

- Default to `private` or `internal`.
- Use `public` only for library API surfaces.
- Mark classes as `final` when inheritance is not intended.

## Value vs Reference Types

- Default to `struct` for data models and configuration.
- Use `class` only when identity matters or shared mutable state is required.
- Use `actor` for thread-safe mutable state (see `swift-concurrency-patterns`).

## Protocol-Oriented Programming

- Prefer protocols + extensions over deep class hierarchies.
- Use protocol composition (`some ProtocolA & ProtocolB`) for constraints.

## Generics

- Prefer `some Collection` for parameters.
- Use `any Collection` for stored properties and return types where erasure is needed.

## Comments and Style

- Use `// MARK:` for section headers in large files.
- Use `///` doc comments for public APIs.
- No commented-out code in committed files.
- Omit `self.` when implicit.
- Prefer `isEmpty` over `count == 0`.
- Prefer `first` / `last` over manual indexing.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swift-coding-standards
git commit -m "feat(swift-developer): add swift-coding-standards skill"
```

---

### Task 9: Create `swift-tdd-workflow` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swift-tdd-workflow/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swift-tdd-workflow

## Overview

Enforces test-driven development for Swift code.

## Red-Green-Refactor

1. Write a failing test that describes the desired behavior.
2. Write the minimal code to make the test pass.
3. Refactor while keeping all tests green.

## Framework Detection

- If the project imports `Testing` or has `.swift-testing` in `Package.swift` → use Swift Testing.
- Otherwise default to XCTest.
- Both can coexist; prefer Swift Testing for new tests.

## XCTest Patterns

- Subclass `XCTestCase`.
- Override `setUp()` and `tearDown()` for fresh state per test.
- Use `XCTAssertEqual`, `XCTAssertTrue`, `XCTAssertThrowsError`.
- For async tests in XCTest, mark the test method as `async` and use `await`.

## Swift Testing Patterns

- Annotate test functions with `@Test`.
- Use `#expect(actual == expected)` for assertions.
- Group related tests with `@Suite`.
- Name tests descriptively: `@Test("user service returns cached user")`.

## Test Isolation

- No shared mutable state between tests.
- Each test gets a fresh instance of the system under test.
- Reset global singletons or in-memory stores in `tearDown` / `deinit`.

## Mocking

- Create protocol stubs for dependencies.
- Never mock framework types directly (e.g. do not mock `URLSession`; wrap it in a protocol and mock that).

## Coverage

- Minimum 80% coverage.
- Flag uncovered paths and require justification for exceptions.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swift-tdd-workflow
git commit -m "feat(swift-developer): add swift-tdd-workflow skill"
```

---

### Task 10: Create `swiftui-patterns` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swiftui-patterns/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swiftui-patterns

## Overview

Patterns for SwiftUI apps using MVVM and `@Observable` (iOS 17+).

## MVVM Architecture

- **View**: declarative SwiftUI struct. Observes ViewModel.
- **ViewModel**: `@Observable` class holding business logic and derived state.
- **Model**: plain `struct` value types. Immutable where possible.

## State Management (iOS 17+)

- `@Observable` class — default for ViewModels. Properties are automatically tracked.
- `@State` — for ephemeral local View state only.
- `@Binding` — for two-way parent-child communication.
- `@Environment` / `@EnvironmentValue` — for global/shared dependencies (theme, analytics container).
- Legacy `@ObservedObject` and `@StateObject` are intentionally not covered by this skill.

## View Lifecycle

- `onAppear`: one-time setup.
- `task`: preferred over `onAppear` + manual `Task {}` for async work. Auto-cancels on disappearance.
- `onChange`: react to specific value changes. Use with care to avoid infinite loops.

## Previews

- Use `#Preview` macro. Include meaningful sample data.
- Never skip previews. They are the fastest feedback loop for UI.

## Composition

- Decompose large Views into small, reusable subviews.
- Target ~50 lines max per View body.
- Extract complex expressions into private computed properties or subviews.

## Separation of Concerns

- No business logic in View structs.
- Views should be thin declarative shells.
- Logic belongs in ViewModel or Service layers.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swiftui-patterns
git commit -m "feat(swift-developer): add swiftui-patterns skill"
```

---

### Task 11: Create `swift-concurrency-patterns` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swift-concurrency-patterns/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swift-concurrency-patterns

## Overview

Structured concurrency and thread safety patterns in modern Swift.

## async/await

- Prefer `async`/`await` over GCD (`DispatchQueue`).
- Legacy GCD only when bridging old completion-handler APIs.

## Task and TaskGroup

- Use `Task` for fire-and-forget async work.
- Use `TaskGroup` for parallel collections of work.
- Use `await` for sequential dependencies.

## Actors

- Use `actor` for mutable shared state accessed from multiple tasks.
- Mark non-actor-isolated methods with `nonisolated` only when thread-safe by design.
- Prefer `@MainActor` for UI-updating code.

## Sendable

- Ensure types crossing actor boundaries conform to `Sendable`.
- Use `@unchecked Sendable` only as a last resort with documented justification.

## Cancellation

- SwiftUI `.task` is cancellable by default when the view disappears.
- Check `Task.isCancelled` in long-running loops.
- Propagate cancellation to child tasks and network requests.

## Continuations

- Use `withCheckedContinuation` / `withCheckedThrowingContinuation` only for bridging legacy completion-handler APIs to async/await.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swift-concurrency-patterns
git commit -m "feat(swift-developer): add swift-concurrency-patterns skill"
```

---

### Task 12: Create `swift-data-persistence` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swift-data-persistence/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swift-data-persistence

## Overview

Data persistence patterns for Swift apps.

## SwiftData (iOS 17+, Default)

- Use `@Model` for entities.
- Use `@Attribute` and `@Relationship` for schema details.
- Use `ModelContext` for CRUD operations.
- Use `@Query` in SwiftUI Views for live data binding.
- Handle migrations: lightweight (automatic) vs manual (custom migration code).
- CloudKit sync is optional; mention when `cloudKitContainer` is configured.

## CoreData (Legacy)

- Mentioned for compatibility only.
- Prefer SwiftData for new code.
- Basic patterns: `NSManagedObject`, `NSFetchRequest`, `NSPersistentContainer`.

## UserDefaults

- Use only for simple settings (booleans, small strings).
- Never store sensitive data in UserDefaults.

## Keychain

- Use for sensitive data (tokens, passwords, credentials).
- Describe the pattern; do not mandate a specific third-party library.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swift-data-persistence
git commit -m "feat(swift-developer): add swift-data-persistence skill"
```

---

### Task 13: Create `swift-networking-patterns` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swift-networking-patterns/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swift-networking-patterns

## Overview

HTTP client architecture and API patterns using native Swift networking.

## URLSession + async/await

- Use `URLSession.shared.data(from:)` or custom `URLSession` instances.
- Decode JSON with `Codable`. Never use `JSONSerialization` for model mapping.

## Error Handling

- Define custom `Error` types conforming to `LocalizedError` for user-facing messages.
- Map HTTP status codes and decoding failures to domain errors.

## Architecture

- Separate network layer from ViewModels.
- ViewModel depends on an abstract protocol (e.g. `UserServiceProtocol`).
- Concrete implementation uses `URLSession`.
- HTTP client code should be a "dumb pipe" — no business logic in request building.

## Cancellation

- Pass `Task` cancellation to `URLSession` via cancellation tokens.
- Use `withTaskCancellationHandler` for custom cancellation cleanup.

## Retry and Backoff

- Describe exponential backoff pattern for transient failures.
- Do not mandate a specific retry library.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swift-networking-patterns
git commit -m "feat(swift-developer): add swift-networking-patterns skill"
```

---

### Task 14: Create `swift-package-manager` skill

**Files:**
- Create: `packages/swift-developer/src/skills/swift-package-manager/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
# Skill: swift-package-manager

## Overview

Swift Package Manager (SPM) dependency and project management.

## Package.swift Structure

- `// swift-tools-version` at the top.
- `platforms` array for minimum OS versions.
- `products` for exposed libraries and executables.
- `dependencies` for external packages.
- `targets` for source code, tests, and target-specific dependencies.

## Adding Dependencies

```swift
dependencies: [
  .package(url: "https://github.com/owner/repo.git", from: "1.0.0")
]
```

## Updating Dependencies

- Run `swift package update` to refresh to latest compatible versions.
- `Package.resolved` is the source of truth for locked versions. Commit it.

## Local Packages

- Reference local packages with `.package(path: "../LocalPackage")`.

## Target Dependencies

```swift
dependencies: [
  .product(name: "LibraryName", package: "PackageName")
]
```

## Conflict Resolution

- `Package.resolved` pins exact versions.
- For version conflicts, resolve by adjusting version requirements in `Package.swift`.
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/src/skills/swift-package-manager
git commit -m "feat(swift-developer): add swift-package-manager skill"
```

---

### Task 15: Create `plugin.test.ts`

**Files:**
- Create: `packages/swift-developer/tests/plugin.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, expect, it } from "vitest"
import type { Config } from "@opencode-ai/plugin"
import { AppVerkSwiftDeveloperPlugin } from "../src/index.js"

describe("AppVerkSwiftDeveloperPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkSwiftDeveloperPlugin).toBe("function")
  })

  it("registers agent swift-developer in config", async () => {
    const plugin = await AppVerkSwiftDeveloperPlugin({} as never)
    const config = { agent: {} } as Config

    await plugin.config?.(config)

    expect(config.agent?.["swift-developer"]).toBeDefined()
    expect(config.agent!["swift-developer"]!.description).toContain("Swift")
    expect(config.agent!["swift-developer"]!.prompt).toContain("Swift Developer Agent")
    expect(config.agent!["swift-developer"]!.mode).toBe("primary")
  })

  it("registers command /swift in config", async () => {
    const plugin = await AppVerkSwiftDeveloperPlugin({} as never)
    const config = { command: {} } as Config

    await plugin.config?.(config)

    expect(config.command?.swift).toBeDefined()
    expect(config.command!.swift!.description).toContain("Swift")
    expect(config.command!.swift!.template).toContain("/swift")
    expect(config.command!.swift!.agent).toBe("swift-developer")
  })

  it("does not register load_swift_skill tool (now global)", async () => {
    const plugin = await AppVerkSwiftDeveloperPlugin({} as never)
    expect(plugin.tool?.load_swift_skill).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test**

```bash
cd packages/swift-developer
npm run test
```

Expected: Tests pass (plugin factory, agent registration, command registration, no tool).

- [ ] **Step 3: Commit**

```bash
git add packages/swift-developer/tests/plugin.test.ts
git commit -m "test(swift-developer): add plugin registration tests"
```

---

### Task 16: Create `load-skill.test.ts`

**Files:**
- Create: `packages/swift-developer/tests/load-skill.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, expect, it } from "vitest"
import { loadSwiftSkill } from "../src/tools/load-skill.js"

describe("loadSwiftSkill", () => {
  it("loads a valid skill successfully", () => {
    const content = loadSwiftSkill("swift-coding-standards")
    expect(content).toContain("Swift")
    expect(content.length).toBeGreaterThan(0)
  })

  it("rejects unknown skill names", () => {
    expect(() => loadSwiftSkill("unknown-skill")).toThrow("not found")
  })

  it("caches loaded skills", () => {
    const first = loadSwiftSkill("swift-coding-standards")
    const second = loadSwiftSkill("swift-coding-standards")
    expect(first).toBe(second)
  })

  it("does not leak file paths in error messages for unknown skills", () => {
    expect(() => loadSwiftSkill("unknown-skill")).toThrow("not found")
    expect(() => loadSwiftSkill("unknown-skill")).not.toThrow("src/skills")
    expect(() => loadSwiftSkill("unknown-skill")).not.toThrow("../")
  })

  it("returns all 7 skills without error", () => {
    const skills = [
      "swift-coding-standards",
      "swift-tdd-workflow",
      "swiftui-patterns",
      "swift-concurrency-patterns",
      "swift-data-persistence",
      "swift-networking-patterns",
      "swift-package-manager",
    ]
    for (const name of skills) {
      expect(() => loadSwiftSkill(name)).not.toThrow()
      const content = loadSwiftSkill(name)
      expect(content.length).toBeGreaterThan(100)
    }
  })
})
```

- [ ] **Step 2: Run test**

```bash
cd packages/swift-developer
npm run test
```

Expected: All 5 test cases pass.

- [ ] **Step 3: Commit**

```bash
git add packages/swift-developer/tests/load-skill.test.ts
git commit -m "test(swift-developer): add skill loader tests"
```

---

### Task 17: Create `package-smoke.test.ts`

**Files:**
- Create: `packages/swift-developer/tests/package-smoke.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { describe, expect, it } from "vitest"
import { AppVerkSwiftDeveloperPlugin } from "../src/index.js"

describe("AppVerkSwiftDeveloperPlugin package", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkSwiftDeveloperPlugin).toBe("function")
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add packages/swift-developer/tests/package-smoke.test.ts
git commit -m "test(swift-developer): add package smoke test"
```

---

### Task 18: Create `build-output.test.ts`

**Files:**
- Create: `packages/swift-developer/tests/build-output.test.ts`

- [ ] **Step 1: Write test**

```typescript
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("build output assets", () => {
  it("includes all 7 skill files in dist/skills", async () => {
    const skills = [
      "swift-coding-standards",
      "swift-tdd-workflow",
      "swiftui-patterns",
      "swift-concurrency-patterns",
      "swift-data-persistence",
      "swift-networking-patterns",
      "swift-package-manager",
    ]

    for (const name of skills) {
      const skillPath = resolve(process.cwd(), "dist/skills", name, "SKILL.md")
      expect(existsSync(skillPath)).toBe(true)
      const content = readFileSync(skillPath, "utf8")
      expect(content.length).toBeGreaterThan(100)
    }
  })

  it("dist/commands/swift.md exists and contains agent frontmatter", async () => {
    const { AppVerkSwiftDeveloperPlugin } = await import("../dist/index.js")
    const plugin = await AppVerkSwiftDeveloperPlugin({} as never)
    const config = { command: {} } as {
      command?: Record<string, { description?: string; template: string; agent?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.command?.swift?.template).toContain("agent: swift-developer")
    expect(config.command?.swift?.template).toContain("Swift development workflow")
  })

  it("does not register load_swift_skill tool in dist build", async () => {
    const { AppVerkSwiftDeveloperPlugin } = await import("../dist/index.js")
    const plugin = await AppVerkSwiftDeveloperPlugin({} as never)
    expect(plugin.tool?.load_swift_skill).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test**

```bash
cd packages/swift-developer
npm run test
```

Expected: All 3 test cases pass.

- [ ] **Step 3: Commit**

```bash
git add packages/swift-developer/tests/build-output.test.ts
git commit -m "test(swift-developer): add build output validation tests"
```

---

### Task 19: Update root entrypoints (`src/index.ts` and `src/index.js`)

**Files:**
- Modify: `src/index.ts`
- Modify: `src/index.js`

- [ ] **Step 1: Update `src/index.ts`**

Add import after existing imports:
```typescript
import { AppVerkSwiftDeveloperPlugin } from "../packages/swift-developer/dist/index.js"
```

Append to `defaultPluginFactories` array:
```typescript
  AppVerkSwiftDeveloperPlugin,
```

- [ ] **Step 2: Update `src/index.js`**

Mirror the exact same import and array append.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts src/index.js
git commit -m "feat: register swift-developer plugin in root entrypoints"
```

---

### Task 20: Update root `package.json`

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add to `files` array**

Add `"packages/swift-developer/dist"` after the last existing `packages/*/dist` entry.

- [ ] **Step 2: Update build script**

Add `npm run build --workspace @appverk/opencode-swift-developer` to the end of the `build` script chain.

- [ ] **Step 3: Update test script**

Add `npm run test --workspace @appverk/opencode-swift-developer` to the end of the `test` script chain.

- [ ] **Step 4: Update typecheck script**

Add `npm run typecheck --workspace @appverk/opencode-swift-developer` to the end of the `typecheck` script chain.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add swift-developer to root package scripts and files"
```

---

### Task 21: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add swift-developer dist exception**

Add after existing `!packages/qa/dist/**`:
```gitignore
!packages/swift-developer/dist/
!packages/swift-developer/dist/**
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add swift-developer dist to gitignore exceptions"
```

---

### Task 22: Update `skill-registry`

**Files:**
- Modify: `packages/skill-registry/src/index.ts`

- [ ] **Step 1: Add skill directory**

Add to `skillDirectories` array after `../../qa/dist/skills`:
```typescript
  path.resolve(moduleDirectory, "../../swift-developer/dist/skills"),
```

- [ ] **Step 2: Commit**

```bash
git add packages/skill-registry/src/index.ts
git commit -m "feat(skill-registry): add swift-developer skills directory"
```

---

### Task 23: Update root packaging test

**Files:**
- Modify: `tests/root-plugin.test.ts`

- [ ] **Step 1: Add swift-developer to packaging assertions**

In the `it("packages a self-contained git-install surface")` test, add to the `expect(packedFiles).toEqual(expect.arrayContaining([...]))` array:
```typescript
        "packages/swift-developer/dist/index.js",
        "packages/swift-developer/dist/index.d.ts",
        "packages/swift-developer/dist/commands/swift.md",
```

- [ ] **Step 2: Add swift-developer agent/command assertions**

Add a new test case after the frontend-developer test:
```typescript
  it("registers the /swift command and swift-developer agent", async () => {
    const { AppVerkPlugins } = await loadRootModule()
    const plugin = await AppVerkPlugins({} as never)
    const config = {} as {
      command?: Record<string, { description?: string; template: string; agent?: string }>
      agent?: Record<string, { description?: string; prompt: string; mode?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.command?.swift?.description).toContain("Swift")
    expect(config.command?.swift?.agent).toBe("swift-developer")
    expect(config.agent?.["swift-developer"]?.description).toContain("Swift")
    expect(config.agent?.["swift-developer"]?.mode).toBe("primary")
    expect(plugin.tool?.load_appverk_skill).toBeDefined()
  })
```

- [ ] **Step 3: Commit**

```bash
git add tests/root-plugin.test.ts
git commit -m "test: add swift-developer to root packaging and registration tests"
```

---

### Task 24: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update package count badge**

Change `package-7-blue` to `package-8-blue`.

- [ ] **Step 2: Add to introduction paragraph**

Add after the QA workflow bullet:
```markdown
- A **Swift development workflow** (`/swift`) with TDD, coding standards, and modern Apple stack patterns (SwiftUI, `@Observable`, SPM, SwiftData).
```

- [ ] **Step 3: Add Usage section**

Add after the `/frontend` subsection:
```markdown
### /swift — Swift development workflow

Run the Swift development workflow with TDD and modern Apple stack patterns:

```text
/swift Add user profile screen with SwiftData persistence
```

The `/swift` command:

1. Detects your project stack (SwiftUI, SwiftData, URLSession, etc.)
2. Loads relevant Swift development skills
3. Follows TDD: writes tests first, then implementation
4. Runs quality gates (build, tests)

You can also invoke the agent directly:

```bash
opencode agent swift-developer "Refactor networking layer to use async/await"
```
```

- [ ] **Step 4: Add to Available Commands & Agents table**

Add after `/frontend` row:
```markdown
| `/swift` | Swift development workflow — TDD, coding standards, and modern Apple stack patterns (SwiftUI, `@Observable`, SPM). | — | [Guide](docs/plugins/swift-developer.md) |
```

Add after `@frontend-developer` row:
```markdown
| `@swift-developer` | Direct agent invocation for Swift tasks outside of `/swift`. | `primary` | [Guide](docs/plugins/swift-developer.md) |
```

- [ ] **Step 5: Add to Repository Structure**

Add after `packages/qa` entries:
```markdown
- `packages/swift-developer` - plugin source, tests, skill files, and build scripts for the Swift development workflow.
- `docs/plugins/swift-developer.md` - package-level behavior and usage guide.
```

- [ ] **Step 6: Add to Documentation list**

Add after QA link:
```markdown
- [Swift Developer Plugin Guide](docs/plugins/swift-developer.md)
```

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: add swift-developer to README"
```

---

### Task 25: Update `AGENTS.md`

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update monorepo layout table**

Add after `packages/qa` row:
```markdown
| `packages/swift-developer` | Swift-developer plugin source, tests, skills, build scripts. Output shipped at `packages/swift-developer/dist/`. |
```

- [ ] **Step 2: Update published files count**

Change "seven `packages/*/dist/` directories" to "eight `packages/*/dist/` directories".

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add swift-developer to AGENTS.md"
```

---

### Task 26: Create `docs/plugins/swift-developer.md`

**Files:**
- Create: `docs/plugins/swift-developer.md`

- [ ] **Step 1: Write the guide**

```markdown
# Swift Developer Plugin

## Installation

The root plugin bundle includes this package automatically.

## Usage

```text
/swift <task description>
```

Example:

```text
/swift Add user profile screen with SwiftData persistence
```

## What it does

1. Detects your project stack by reading `Package.swift` and scanning imports.
2. Loads mandatory skills (`swift-coding-standards`, `swift-tdd-workflow`).
3. Loads conditional skills based on detected frameworks (SwiftUI, concurrency, networking, persistence, SPM).
4. Follows TDD: writes tests first, then implementation, then refactors.
5. Runs quality gates (build, tests, coverage ≥ 80%).

## Direct agent use

```bash
opencode agent swift-developer "Refactor networking layer to use async/await"
```

## Architecture

| Element | Name | Purpose |
|---------|------|---------|
| Command | `/swift` | Entrypoint for Swift development workflow |
| Agent | `swift-developer` | Expert Swift developer agent |
| Tool | `load_appverk_skill` | Global skill loader (managed by `skill-registry`) |

### Available Skills

| Skill | Load Condition |
|---|---|
| `swift-coding-standards` | Always |
| `swift-tdd-workflow` | When writing or modifying code |
| `swiftui-patterns` | When SwiftUI is detected |
| `swift-concurrency-patterns` | When async/await or actors are detected |
| `swift-data-persistence` | When SwiftData/CoreData is detected |
| `swift-networking-patterns` | When URLSession networking is involved |
| `swift-package-manager` | When modifying SPM dependencies |

## Limitations

- SwiftUI only — no UIKit support.
- `@Observable` only — legacy `@ObservedObject`/`@StateObject` not covered.
- SPM only — no CocoaPods or Carthage support.
- URLSession + Codable only — no Alamofire support.
- SwiftData preferred — CoreData covered only as legacy.
- iOS-focused — watchOS/tvOS/macOS specifics not explicitly covered.

## Project Structure

```
packages/swift-developer/
├── src/
│   ├── index.ts              # Plugin factory
│   ├── tools/load-skill.ts   # Local skill loader for tests
│   ├── agent-prompt.md       # Agent system prompt
│   ├── commands/swift.md     # /swift command template
│   └── skills/
│       ├── swift-coding-standards/
│       ├── swift-tdd-workflow/
│       ├── swiftui-patterns/
│       ├── swift-concurrency-patterns/
│       ├── swift-data-persistence/
│       ├── swift-networking-patterns/
│       └── swift-package-manager/
└── tests/
    ├── plugin.test.ts
    ├── load-skill.test.ts
    ├── package-smoke.test.ts
    └── build-output.test.ts
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/plugins/swift-developer.md
git commit -m "docs: add swift-developer plugin guide"
```

---

### Task 27: Build and verify

- [ ] **Step 1: Build swift-developer package**

```bash
cd packages/swift-developer
npm run build
```

Expected: `dist/` created with `index.js`, `index.d.ts`, `agent-prompt.md`, `commands/swift.md`, and `dist/skills/*/SKILL.md`.

- [ ] **Step 2: Run swift-developer tests**

```bash
cd packages/swift-developer
npm run test
```

Expected: All tests pass.

- [ ] **Step 3: Run root typecheck**

```bash
npm run typecheck
```

Expected: No type errors across all workspaces including swift-developer.

- [ ] **Step 4: Run root tests**

```bash
npm run test
```

Expected: All root tests pass, including new swift-developer assertions in `root-plugin.test.ts`.

- [ ] **Step 5: Run full validation**

```bash
npm run check
```

Expected: `typecheck` + `test` + `build` all pass.

- [ ] **Step 6: Commit built dist/**

```bash
git add packages/swift-developer/dist
git commit -m "build: add swift-developer dist output"
```

---

## Self-Review Checklist

- [ ] **Spec coverage:** All 7 skills, agent prompt, command, plugin factory, tests, root integration, documentation are covered.
- [ ] **Placeholder scan:** No "TBD", "TODO", or vague steps in the plan.
- [ ] **Type consistency:** `loadSwiftSkill`, `AppVerkSwiftDeveloperPlugin`, `swift-developer`, `swift` names are consistent everywhere.
- [ ] **Version bump:** All `package.json` files updated to `0.2.15`.
- [ ] **Root integration:** `src/index.ts`, `src/index.js`, root `package.json`, `.gitignore`, `skill-registry`, `tests/root-plugin.test.ts` all updated.
