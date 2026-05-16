---
name: swift-data-persistence
description: Data persistence patterns for Swift apps using SwiftData, CoreData, UserDefaults, and Keychain.
activation: Load when implementing data storage or persistence in Swift
---

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
