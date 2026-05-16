---
name: swift-coding-standards
description: Enforces AppVerk Swift coding standards across all code.
activation: Load when writing or reviewing Swift code
---

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
