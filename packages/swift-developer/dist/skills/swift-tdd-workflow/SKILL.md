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
