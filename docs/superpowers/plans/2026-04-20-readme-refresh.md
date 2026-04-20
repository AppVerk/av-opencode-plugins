# README Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal top-level `README.md` with a product-first repository guide that explains installation, usage, package scope, and contributor workflow for `av-opencode-plugins`.

**Architecture:** Keep the change limited to `README.md`, using existing repository facts and existing package documentation as source material. Preserve a concise marketplace-like tone while making the README standalone for both end users and contributors.

**Tech Stack:** Markdown, npm workspaces, OpenCode plugin package `@appverk/opencode-commit`

---

### Task 1: Capture current repository facts

**Files:**
- Reference: `package.json`
- Reference: `packages/commit/package.json`
- Reference: `docs/plugins/commit.md`
- Reference: `README.md`

- [ ] **Step 1: Read the current top-level README and source docs**

```md
Current README topics to preserve or replace:
- Repository identity
- Package list
- Getting started guidance
- Planning artifact links

Source facts to extract:
- Package name: `@appverk/opencode-commit`
- Package version: `0.1.0`
- Root scripts: `build`, `test`, `typecheck`, `check`
- Main command examples: `/commit`, `/commit AV-42`
```

- [ ] **Step 2: Verify repository facts from the source files**

Run: `npm pkg get scripts && npm pkg get workspaces && npm pkg get name --workspace @appverk/opencode-commit && npm pkg get version --workspace @appverk/opencode-commit`
Expected: JSON output showing the root scripts, the `packages/*` workspace pattern, package name `@appverk/opencode-commit`, and version `0.1.0`

- [ ] **Step 3: Confirm the package guide covers installation and behavior details**

```md
Required facts from `docs/plugins/commit.md`:
- OpenCode config uses `"plugin": ["@appverk/opencode-commit"]`
- OpenCode restart is required for `/commit`
- The plugin blocks direct `git commit` and `git push`
- The package guide remains the deeper reference document
```

- [ ] **Step 4: Confirm there are no file changes from the discovery task**

Run: `git diff -- package.json packages/commit/package.json docs/plugins/commit.md README.md`
Expected: no diff output before starting the actual README rewrite

### Task 2: Rewrite the top-level README

**Files:**
- Modify: `README.md`
- Reference: `docs/plugins/commit.md`

- [ ] **Step 1: Write the failing content expectation as a checklist**

```md
The new README must include all of the following sections:
- Title and one-sentence repository description
- Installation with OpenCode config JSON snippet
- Usage examples for `/commit` and `/commit AV-42`
- Available packages table with the current package version and purpose
- Repository structure section for contributors
- Local development commands: `npm install`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run check`
- Documentation links
- License section
```

- [ ] **Step 2: Replace `README.md` with the new structure and content**

```md
# AppVerk OpenCode Plugins

[![Package](https://img.shields.io/badge/package-1-blue.svg)](#available-packages)

OpenCode plugin packages for AppVerk. The repository currently provides a controlled commit workflow that registers `/commit` and enforces AppVerk git policies inside OpenCode.

## Installation

Add the plugin package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@appverk/opencode-commit"]
}
```

Restart OpenCode after updating the config. The plugin registers `/commit` automatically.

## Usage

Create a commit for the current repository changes:

```text
/commit
```

Create a commit and append a work item reference:

```text
/commit AV-42
```

The command uses the packaged AppVerk workflow, generates a Conventional Commit style message, and routes the final commit through the controlled runtime instead of allowing raw `git commit` from the bash tool.

## Available Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@appverk/opencode-commit`](docs/plugins/commit.md) | `0.1.0` | Controlled OpenCode commit workflow with automatic `/commit` registration, commit message policy enforcement, and bash-level blocking for direct `git commit` and `git push`. |

## Repository Structure

- `packages/commit` - plugin source, tests, command template, and build scripts for the commit workflow.
- `docs/plugins/commit.md` - package-level installation, behavior, and usage guide.
- `package.json` - workspace definition and shared validation commands.
- `docs/superpowers/` - design and planning artifacts for repository changes.

## Local Development

Install workspace dependencies:

```bash
npm install
```

Run the main validation commands:

```bash
npm run typecheck
npm run test
npm run build
npm run check
```

## Documentation

- [Commit Plugin Guide](docs/plugins/commit.md)

## License

This repository currently does not include a top-level `LICENSE` file. Add one before publishing or distributing the packages beyond internal use.
```

- [ ] **Step 3: Run a quick content check against the agreed structure**

Run: `rg -n "^## " README.md`
Expected: section headings for `Installation`, `Usage`, `Available Packages`, `Repository Structure`, `Local Development`, `Documentation`, and `License`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite top-level repository README"
```

### Task 3: Verify the final README content

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Review the rendered content in plain text form**

```md
Verification points:
- Installation snippet is valid JSON
- Usage examples match the documented command behavior
- Package version matches `packages/commit/package.json`
- Contributor commands match the root workspace scripts
- No references remain to outdated planning artifacts in the main README body
```

- [ ] **Step 2: Run the repository validation command**

Run: `npm run check`
Expected: typecheck, tests, and build complete successfully for `@appverk/opencode-commit`

- [ ] **Step 3: Run git diff to confirm the README-only change set**

Run: `git diff -- README.md`
Expected: diff shows replacement of the old minimal README with the new product-first structure

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: verify README refresh"
```
