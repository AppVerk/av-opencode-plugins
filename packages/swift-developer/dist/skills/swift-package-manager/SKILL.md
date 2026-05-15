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
