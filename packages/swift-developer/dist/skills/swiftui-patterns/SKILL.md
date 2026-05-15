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
