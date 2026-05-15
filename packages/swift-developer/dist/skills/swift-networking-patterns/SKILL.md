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
