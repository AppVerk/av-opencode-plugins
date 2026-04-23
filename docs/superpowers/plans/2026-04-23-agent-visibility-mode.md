# Agent Visibility (`mode`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set `mode: "primary"` on `python-developer` and `mode: "subagent"` on all code-review agents to reduce TUI tab-completion noise.

**Architecture:** Add a single `mode` property to agent registrations in two plugin source files, then update corresponding tests to assert the property. Build and test both packages.

**Tech Stack:** TypeScript, Vitest, tsup

---

## File Mapping

| File | Action | Responsibility |
|---|---|---|
| `packages/python-developer/src/index.ts` | Modify | Add `mode: "primary"` to `python-developer` agent config |
| `packages/python-developer/tests/plugin.test.ts` | Modify | Assert `mode === "primary"` on `python-developer` agent |
| `packages/code-review/src/index.ts` | Modify | Add `mode: "subagent"` to every agent in the `AGENTS` loop |
| `packages/code-review/tests/plugin.test.ts` | Modify | Assert `mode === "subagent"` for every expected agent |

---

### Task 1: Set `python-developer` agent to `mode: "primary"`

**Files:**
- Modify: `packages/python-developer/src/index.ts`

- [ ] **Step 1: Add `mode` to agent registration**

  Find the `config.agent["python-developer"]` assignment and add `mode: "primary"`:

  ```typescript
  config.agent["python-developer"] = {
    description: AGENT_DESCRIPTION,
    prompt: AGENT_PROMPT,
    mode: "primary",
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add packages/python-developer/src/index.ts
  /commit
  ```

---

### Task 2: Update `python-developer` test to assert `mode`

**Files:**
- Modify: `packages/python-developer/tests/plugin.test.ts`

- [ ] **Step 1: Update the agent registration test**

  Change the type annotation in the test and add the mode assertion:

  ```typescript
  it("registers agent python-developer in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { agent: {} } as {
      agent?: Record<string, { description?: string; prompt?: string; mode?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.agent?.["python-developer"]).toBeDefined()
    expect(config.agent!["python-developer"]!.description).toContain("Python")
    expect(config.agent!["python-developer"]!.prompt).toContain("Python Developer Agent")
    expect(config.agent!["python-developer"]!.mode).toBe("primary")
  })
  ```

- [ ] **Step 2: Run the test to verify it passes**

  ```bash
  npm run build --workspace @appverk/opencode-python-developer
  npm run test --workspace @appverk/opencode-python-developer
  ```

  Expected: All 4 tests pass.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/python-developer/tests/plugin.test.ts
  /commit
  ```

---

### Task 3: Set all code-review agents to `mode: "subagent"`

**Files:**
- Modify: `packages/code-review/src/index.ts`

- [ ] **Step 1: Add `mode` inside the agent registration loop**

  Find the `for (const a of AGENTS)` loop and add `mode: "subagent"` to the config object:

  ```typescript
  for (const a of AGENTS) {
    config.agent[a.name] = {
      description: a.description,
      prompt: loadMarkdownFile(a.path),
      mode: "subagent",
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add packages/code-review/src/index.ts
  /commit
  ```

---

### Task 4: Update `code-review` tests to assert `mode: "subagent"`

**Files:**
- Modify: `packages/code-review/tests/plugin.test.ts`

- [ ] **Step 1: Add mode assertion to the agent registration test**

  Add a single assertion inside the existing `it.each(EXPECTED_AGENTS)` block:

  ```typescript
  it.each(EXPECTED_AGENTS)("config registers %s agent", async (name) => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent[name]).toBeDefined()
    expect(config.agent[name].description).toBeDefined()
    expect(typeof config.agent[name].prompt).toBe("string")
    expect(config.agent[name].prompt.length).toBeGreaterThan(0)
    expect(config.agent[name].mode).toBe("subagent")
  })
  ```

- [ ] **Step 2: Run the test to verify it passes**

  ```bash
  npm run build --workspace @appverk/opencode-code-review
  npm run test --workspace @appverk/opencode-code-review
  ```

  Expected: All tests pass (including 12 agent assertions).

- [ ] **Step 3: Commit**

  ```bash
  git add packages/code-review/tests/plugin.test.ts
  /commit
  ```

---

### Task 5: Full validation

**Files:**
- None (validation step)

- [ ] **Step 1: Run root-level typecheck**

  ```bash
  npm run typecheck
  ```

  Expected: No errors in `packages/python-developer` or `packages/code-review`.

- [ ] **Step 2: Run root-level tests**

  ```bash
  npm run test
  ```

  Expected: All workspace tests pass.

- [ ] **Step 3: Build both packages**

  ```bash
  npm run build
  ```

  Expected: Both `packages/python-developer/dist/` and `packages/code-review/dist/` are regenerated.

- [ ] **Step 4: Verify built output contains `mode`**

  ```bash
  grep -n 'mode.*primary' packages/python-developer/dist/index.js
  grep -n 'mode.*subagent' packages/code-review/dist/index.js
  ```

  Expected: Both commands return at least one match.

- [ ] **Step 5: Commit built dist files**

  ```bash
  git add packages/python-developer/dist/ packages/code-review/dist/
  /commit
  ```

---

## Self-Review Checklist

1. **Spec coverage:**
   - `python-developer` gets `mode: "primary"` → Task 1
   - All 12 code-review agents get `mode: "subagent"` → Task 3
   - Tests assert the new property → Tasks 2 & 4
   - Build output verified → Task 5

2. **Placeholder scan:** None found. Every step contains exact file paths, exact code, and exact commands.

3. **Type consistency:** The `mode` property is consistently a string literal (`"primary"` or `"subagent"`) and is added to the same config object shape in both plugins.
