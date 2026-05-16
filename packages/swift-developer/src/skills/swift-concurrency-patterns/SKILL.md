---
name: swift-concurrency-patterns
description: Structured concurrency and thread safety patterns in modern Swift.
activation: Load when writing async/await code, actors, or concurrent Swift code
---

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
