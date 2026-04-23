---
allowed-tools: Read, Grep, Glob, Bash(tsc:*), Bash(vitest:*), Bash(playwright:*), Bash(eslint:*), Bash(biome:*), Bash(pnpm:*), Bash(git:*), Bash(node:*)
description: TypeScript + React development workflow enforcing coding standards, TDD, and stack-specific patterns.
agent: frontend-developer
argument-hint: <task description>
---

# TypeScript + React Development Workflow

You are executing a structured TypeScript + React development workflow. Follow every step in order. Do not skip steps.

## Task

**$ARGUMENTS**

---

## Step 1: Load Coding Standards (MANDATORY)

Before doing anything else, load the base coding standards skill:

```
Use the load_frontend_skill tool with:
  name: "coding-standards"
```

**You MUST load this skill first. All code you write must follow its HARD-RULES.**

---

## Step 2: Analyze the Project

### 2a. Discover project commands

**Read these files first (in order of priority) to find the actual project commands:**

1. **AGENTS.md** (root or subdirectories)
2. **CLAUDE.md** (root or `.claude/`)
3. **README.md** — look for "Development", "Contributing", "Getting Started"
4. **package.json** `scripts`
5. **Makefile**

**Record the discovered commands.** If none found, fall back to:
- Test: `pnpm test`
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint`

### 2b. Detect the project stack

1. **package.json** — look for dependencies:
   - `tailwindcss` → Tailwind CSS
   - `zustand` → Zustand
   - `@tanstack/react-query` → TanStack Query
   - `react-hook-form` → React Hook Form
   - `@tanstack/react-router` → TanStack Router
2. **pnpm-lock.yaml** — confirm pnpm is the package manager
3. **tsconfig.json** — verify `strict: true`
4. **src/** — scan directory structure

### 2c. Verify TypeScript strict mode

Read `tsconfig.json` and confirm:
- `strict: true`
- `noUncheckedIndexedAccess: true` (warn if missing)

---

## Step 3: Load Context-Specific Skills

Based on Step 2 findings, load the relevant skills using `load_frontend_skill`. **Only load skills that are actually needed.**

### Always load TDD workflow:

```
Use the load_frontend_skill tool with:
  name: "tdd-workflow"
```

### If `tailwindcss` in dependencies:
```
Use the load_frontend_skill tool with:
  name: "tailwind-patterns"
```

### If `zustand` in dependencies:
```
Use the load_frontend_skill tool with:
  name: "zustand-patterns"
```

### If `@tanstack/react-query` in dependencies:
```
Use the load_frontend_skill tool with:
  name: "tanstack-query-patterns"
```

### If `react-hook-form` in dependencies:
```
Use the load_frontend_skill tool with:
  name: "form-patterns"
```

### If `@tanstack/react-router` in dependencies:
```
Use the load_frontend_skill tool with:
  name: "tanstack-router-patterns"
```

### If `pnpm-lock.yaml` exists AND task involves dependency changes:
```
Use the load_frontend_skill tool with:
  name: "pnpm-package-manager"
```

---

## Step 4: Execute TDD Cycle

Follow the TDD workflow loaded in Step 3:

1. **Red** — write a failing test for the desired behavior.
2. **Green** — write the minimal code to make the test pass.
3. **Refactor** — clean up while keeping tests green.

Repeat for each unit of work.

---

## Step 5: Quality Gates

Run the discovered commands (or fallbacks):

1. **Tests:** `pnpm test` (or discovered test command)
2. **Typecheck:** `pnpm typecheck` (or `pnpm tsc --noEmit`)
3. **Lint:** `pnpm lint`

If any gate fails, fix the issues and re-run.

---

## Step 6: Final Verification

- Confirm all loaded skill rules were followed.
- Confirm test coverage is 80%+.
- Report the outcome.
