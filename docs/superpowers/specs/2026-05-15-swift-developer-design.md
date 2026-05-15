# Design: Swift Developer Plugin

**Date:** 2026-05-15
**Topic:** swift-developer
**Status:** Design approved, awaiting spec review

---

## 1. Overview

`swift-developer` is an OpenCode plugin that provides an expert Swift developer agent enforcing AppVerk coding standards, TDD workflow, and modern Apple stack patterns. It is built on the same infrastructure as `python-developer` and `frontend-developer`, using the `@appverk/opencode-skill-utils` `createSkillPlugin` factory.

### Philosophy

- **Modern Apple stack only** — SwiftUI (not UIKit), `@Observable` (not legacy `@ObservedObject`), `async/await` (not `DispatchQueue`), SPM (not CocoaPods/Carthage), URLSession + Codable (not Alamofire).
- **TDD-first** — tests before implementation, red-green-refactor cycle, coverage gate ≥ 80%.
- **Skill-based** — agent loads skills on demand via `load_swift_skill` tool, minimizing token usage and keeping context focused.

---

## 2. Architecture

### Plugin Registration

The plugin registers:

| Element | Name | Mode | Purpose |
|---------|------|------|---------|
| Agent | `swift-developer` | `primary` | User-facing agent for all Swift tasks |
| Command | `/swift` | — | Entrypoint that delegates to the agent |
| Tool | `load_swift_skill` | — | Loads a skill markdown file on demand |

### File Structure (package)

```
packages/swift-developer/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── scripts/
│   └── copy-assets.mjs          # copies skills + markdowns to dist/
├── src/
│   ├── index.ts                 # plugin factory (createSkillPlugin)
│   ├── agent-prompt.md          # agent system prompt + skill catalog
│   ├── commands/
│   │   └── swift.md             # /swift command template
│   └── skills/
│       ├── swift-coding-standards/
│       │   └── SKILL.md
│       ├── swift-tdd-workflow/
│       │   └── SKILL.md
│       ├── swiftui-patterns/
│       │   └── SKILL.md
│       ├── swift-concurrency-patterns/
│       │   └── SKILL.md
│       ├── swift-data-persistence/
│       │   └── SKILL.md
│       ├── swift-networking-patterns/
│       │   └── SKILL.md
│       └── swift-package-manager/
│           └── SKILL.md
└── tests/
    ├── plugin.test.ts           # agent + command + tool registration
    ├── package-smoke.test.ts    # package.json integrity
    └── build-output.test.ts    # dist/skills/ structure validation
```

### Root Integration

- `src/index.ts` and `src/index.js` — import `AppVerkSwiftDeveloperPlugin` and append to `defaultPluginFactories`.
- Root `package.json` — add `packages/swift-developer/dist/` to `files`, update `build`/`test`/`typecheck` scripts to include the workspace.
- `.gitignore` — add `!packages/swift-developer/dist/` and `!packages/swift-developer/dist/**`.

---

## 3. Agent Prompt

`src/agent-prompt.md` structure:

```markdown
---
name: swift-developer
description: Expert Swift developer enforcing AppVerk coding standards, TDD workflow, and modern Apple stack patterns. Loads skills on demand via load_appverk_skill tool.
---

# Swift Developer Agent

## Core Mandate

- Follow TDD: tests before implementation, red-green-refactor cycle.
- Enforce AppVerk coding standards on all code you write or review.
- Use modern Swift: `async/await`, `Result`, `Codable`, `SwiftUI`, `SPM`, `@Observable`.
- Prefer `struct` for value types, `final class` for reference types, protocol-oriented programming.
- Never force-unwrap optionals; always use `guard let` or `if let`.

## Workflow

When assigned a Swift task:

1. Detect the project stack by reading `Package.swift` and scanning imports.
2. Load mandatory skills: `swift-coding-standards` and `swift-tdd-workflow`.
3. Load conditional skills based on detected frameworks (see catalog below).
4. Follow the loaded skill rules strictly.
5. Execute TDD cycle, quality gates, and final verification.

## Available Skills

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

---

## 4. Skills

### 4.1 `swift-coding-standards`

**Load condition:** ALWAYS

**Scope:** Language-level rules independent of frameworks.

**Key areas:**

- Naming: `lowerCamelCase` for variables/functions, `UpperCamelCase` for types/protocols, `UPPER_SNAKE_CASE` for global constants.
- Optionals: `guard let` / `if let` for unwrapping; never `!` (force unwrap). Use `??` for defaults. Prefer `optional?.property` over manual `if let` when chaining.
- Access control: default to `private` or `internal`; `public` only for library APIs. Use `final class` when inheritance is not intended.
- Value vs reference: default to `struct`; use `class` only when identity/shared state is needed.
- Protocol-oriented programming: prefer protocols + extensions over deep inheritance hierarchies.
- Generics: use `some Collection` / `any Collection` appropriately; prefer `some` for parameters, `any` for stored properties.
- Comments: `// MARK:` for section headers, `///` doc comments for public APIs. No commented-out code.
- Style: no `self.` when implicit, `isEmpty` over `count == 0`, `first`/`last` over manual indexing.

---

### 4.2 `swift-tdd-workflow`

**Load condition:** ALWAYS when writing or modifying code.

**Scope:** TDD process and test patterns for both XCTest and Swift Testing.

**Key areas:**

- Red-green-refactor cycle: write failing test → minimal implementation → refactor.
- Test structure:
  - **XCTest**: subclass `XCTestCase`, `override func setUp()`, `override func tearDown()`, `XCTAssertEqual`, `XCTAssertThrowsError`.
  - **Swift Testing**: `@Test` on functions, `#expect` for assertions, `@Suite` for grouping, `@Test("description")` for naming.
- Test isolation: no shared mutable state between tests. Each test gets fresh instances.
- Async testing: use `async` test methods in Swift Testing; in XCTest use `await` inside `async` test or `wait(for:)` for expectations.
- Mocking: create protocol stubs, never mock framework types (e.g. never mock `URLSession` directly; wrap it in your own protocol).
- Coverage gate: minimum 80% coverage; flag uncovered paths.

**Framework detection:**
- If project imports `Testing` (Swift Testing) or has `.swift-testing` in `Package.swift` → use Swift Testing patterns.
- Otherwise default to XCTest patterns.
- Both can coexist in transition projects; prefer Swift Testing for new tests.

---

### 4.3 `swiftui-patterns`

**Load condition:** When SwiftUI is detected.

**Scope:** UI architecture and state management in SwiftUI.

**Key areas:**

- **MVVM**: View observes ViewModel. ViewModel is an `@Observable` class (iOS 17+) holding business logic and state. Model is value type (`struct`).
- **State management**:
  - `@Observable` class — default for ViewModels (iOS 17+).
  - `@State` — for local View state only (ephemeral UI state).
  - `@Binding` — for two-way parent-child communication.
  - `@Environment` / `@EnvironmentValue` — for global/shared dependencies (e.g. theme, analytics).
- **View lifecycle**: `onAppear`, `task`, `onChange`. Prefer `task` over `onAppear` + manual `Task {}` for async work.
- **Previews**: use `#Preview` macro (iOS 17+). Include meaningful preview data. Never skip previews.
- **Composition**: decompose large Views into small, reusable subviews. Max ~50 lines per View body; extract into private methods or subviews.
- **No business logic in View**: Views should be declarative shells. Logic belongs in ViewModel or Service.

---

### 4.4 `swift-concurrency-patterns`

**Load condition:** When `async/await`, `Task`, or `actor` usage detected.

**Scope:** Structured concurrency and thread safety.

**Key areas:**

- Prefer `async/await` over GCD (`DispatchQueue`) — legacy GCD only when interfacing with old APIs.
- `Task` / `TaskGroup` for concurrent work. `await` for sequential async operations.
- `actor` for mutable shared state. Use `nonisolated` only when truly safe.
- `@MainActor` for UI-updating code. ViewModels should be `@MainActor` by default if they mutate UI-bound state.
- `Sendable` conformance: ensure types crossing actor boundaries conform to `Sendable`. Use `@unchecked Sendable` only as last resort with documented justification.
- Cancellation: SwiftUI `.task` is cancellable by default on view disappearance. Explicitly handle `Task.isCancelled` in long-running loops.
- Continuations: use `withCheckedContinuation` / `withCheckedThrowingContinuation` only for bridging legacy completion-handler APIs.

---

### 4.5 `swift-data-persistence`

**Load condition:** When SwiftData, CoreData, or UserDefaults usage detected.

**Scope:** Data persistence patterns.

**Key areas:**

- **SwiftData (iOS 17+, default)**:
  - `@Model` for entities, `@Attribute`, `@Relationship`.
  - `ModelContext` for CRUD, `@Query` for SwiftUI integration.
  - Migrations: lightweight (schema versioning) vs manual (custom migration code).
  - CloudKit sync: optional, mention when `cloudKitContainer` is configured.
- **CoreData** (legacy only): mention as supported but prefer SwiftData. Include basic `NSManagedObject`, `NSFetchRequest` patterns if detected.
- **UserDefaults**: only for simple settings/flags (booleans, small strings). Never store sensitive data.
- **Keychain**: for sensitive data (tokens, passwords). Describe pattern; do not mandate a specific library.

---

### 4.6 `swift-networking-patterns`

**Load condition:** When `URLSession` or `Codable` networking code involved.

**Scope:** HTTP client architecture and API patterns.

**Key areas:**

- `URLSession` with `async/await` (`data(from:)`).
- `Codable` for JSON serialization. Never use `JSONSerialization` for model mapping.
- Custom `Error` types conforming to `LocalizedError` for user-facing messages.
- Repository / Service pattern: network layer separated from ViewModels. ViewModel depends on abstract protocol, implementation uses `URLSession`.
- No business logic in request code. HTTP client should be dumb pipe + decoding.
- Cancellation: pass `Task` cancellation through to `URLSession` via `URLRequest` or use `withTaskCancellationHandler`.
- Retry / backoff: mention pattern (exponential backoff) but do not mandate a specific library.

---

### 4.7 `swift-package-manager`

**Load condition:** When adding / removing / updating SPM dependencies.

**Scope:** SPM configuration and dependency management.

**Key areas:**

- `Package.swift` structure: `// swift-tools-version`, `platforms`, `products`, `dependencies`, `targets`.
- Adding dependencies: `dependencies: [.package(url: ..., from: "1.0.0")]`.
- Updating: `swift package update`.
- Local packages: `.package(path: "../LocalPackage")`.
- Target dependencies: `dependencies: [.product(name: "...", package: "...")]`.
- Resolving conflicts: `Package.resolved` is source of truth for locked versions.

---

## 5. Skill Interactions

| Skill Pair | Interaction |
|---|---|
| `swiftui-patterns` + `swift-concurrency-patterns` | Commonly loaded together; concurrency is essential for SwiftUI (`task`, `@MainActor`) |
| `swiftui-patterns` + `swift-data-persistence` | SwiftData uses `@Query` in SwiftUI; these skills complement each other |
| `swift-networking-patterns` + `swift-concurrency-patterns` | Async network calls require structured concurrency patterns |
| `swift-data-persistence` + `swift-tdd-workflow` | Testing SwiftData requires in-memory `ModelContainer` setup |

**No mutual exclusions** — unlike Django vs FastAPI in `python-developer`, Swift skills can all load together if the project uses all those areas.

---

## 6. Testing Strategy

### 6.1 Package Tests

| Test File | What It Verifies |
|---|---|
| `plugin.test.ts` | Agent `swift-developer` is registered with correct description and mode. Command `swift` is registered with correct template and agent. Tool `load_swift_skill` is registered and loads each of the 7 skills without error. |
| `package-smoke.test.ts` | `package.json` has valid `main`, `types`, `exports`. `dist/index.js` and `dist/index.d.ts` exist after build. |
| `build-output.test.ts` | `dist/skills/` contains exactly 7 folders (`swift-coding-standards` … `swift-package-manager`). Each folder has `SKILL.md`. `dist/agent-prompt.md` and `dist/commands/swift.md` exist. |

### 6.2 Build Pipeline

```bash
cd packages/swift-developer
npm run build    # tsup ESM + DTS + copy assets
npm run test     # build + vitest run
npm run typecheck  # tsc --noEmit
```

Build script: `tsup src/index.ts --format esm --dts && node ./scripts/copy-assets.mjs`

---

## 7. Root Entrypoint Changes

### `src/index.ts` (typed source)

Add:
```typescript
import { AppVerkSwiftDeveloperPlugin } from "../packages/swift-developer/dist/index.js"
```

Append `AppVerkSwiftDeveloperPlugin` to `defaultPluginFactories` array.

### `src/index.js` (runtime entrypoint)

Mirror the exact same import and array append.

### Root `package.json`

- Add `packages/swift-developer/dist/` to `files` array.
- Update `build`, `test`, `typecheck` scripts to include `swift-developer` workspace.

### `.gitignore`

Add:
```gitignore
!packages/swift-developer/dist/
!packages/swift-developer/dist/**
```

---

## 8. Documentation

### `README.md` (root) updates

1. Package count badge: increment to 8.
2. Introduction paragraph: add one-line description of `swift-developer`.
3. Usage section: add `/swift` subsection with example.
4. Available Commands & Agents table: add `swift-developer` (mode: `primary`) and `/swift` command.
5. Repository Structure: add `packages/swift-developer` and `docs/plugins/swift-developer.md`.
6. Documentation list: add link to `docs/plugins/swift-developer.md`.

### `docs/plugins/swift-developer.md` (per-plugin guide)

Follow the template from AGENTS.md:
1. Installation (included in root bundle)
2. Usage (`/swift <task>`)
3. What it does (step-by-step workflow)
4. Direct agent use (`opencode agent swift-developer "..."`)
5. Architecture table (commands, agents, tools, skills)
6. Limitations (MVP: no UIKit, no TCA, no Alamofire)
7. Project Structure (key source files)

### `AGENTS.md` updates

- Increment plugin count in layout table.
- Add `packages/swift-developer` row.
- Update published files count.
- Add root entrypoint registration note for swift-developer.

---

## 9. Limitations & Future Work

**MVP limitations (known upfront):**
- No UIKit support (SwiftUI only).
- No TCA (The Composable Architecture) skill.
- No Alamofire / CocoaPods / Carthage support (SPM + URLSession only).
- No CoreData as first-class skill (SwiftData preferred; CoreData mentioned as legacy).
- No watchOS / tvOS / macOS specificity (focus on iOS, but patterns are mostly cross-platform).

**Future skills (post-MVP):**
- `tca-patterns` — The Composable Architecture (Redux-like, popular in professional Swift projects).
- `uikit-patterns` — legacy UIKit for maintenance projects.
- `alamofire-patterns` — when projects already use Alamofire.
- `swift-testing-patterns` — if Swift Testing becomes dominant enough to split from `swift-tdd-workflow`.

---

## 10. Design Decisions Log

| Decision | Rationale |
|---|---|
| Modern Apple stack only (SwiftUI, `@Observable`, SPM) | Aligns with current Apple direction; keeps skill count manageable; UIKit/legacy can be added later |
| `@Observable` only (no `@ObservedObject`/`@StateObject`) | Simplifies skill scope; `@Observable` is the future (iOS 17+); legacy support deferred to future `uikit-patterns` or expanded `swiftui-patterns` |
| Both XCTest and Swift Testing in one `swift-tdd-workflow` skill | Avoids premature splitting; agent detects framework at runtime; can be split later if needed |
| 7 granular skills vs fewer monolithic skills | Consistent with `python-developer` and `frontend-developer`; allows targeted loading; easier maintenance |
| No Alamofire / CocoaPods / Carthage | Nativeness philosophy; SPM is now standard; Alamofire adds dependency without clear win over `URLSession` + `Codable` |
