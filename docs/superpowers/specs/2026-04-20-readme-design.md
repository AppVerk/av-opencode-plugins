# README Design

## Goal

Create a top-level `README.md` for `av-opencode-plugins` that works as a strong repository entry point for two audiences:

- OpenCode users who want to install and use the available plugin package.
- Contributors who want to understand the monorepo structure and run the project locally.

## Context

The reference repository `av-marketplace` uses a concise, product-first README with a quick install command, a package overview, and links to deeper documentation. `av-opencode-plugins` currently has a minimal README and one documented package: `@appverk/opencode-commit`.

The repository is a small npm workspace with:

- root scripts: `build`, `test`, `typecheck`, `check`
- one package: `packages/commit`
- one package guide: `docs/plugins/commit.md`

The commit plugin:

- registers `/commit` automatically in OpenCode
- blocks direct `git commit` and `git push` through the bash tool
- enforces AppVerk commit policy and uses a controlled commit runtime

## Proposed README Structure

### 1. Title and short description

Explain that this repository contains AppVerk plugins for OpenCode, with the current focus on controlled commit workflows.

### 2. Installation

Show end-user installation first using OpenCode config with `@appverk/opencode-commit`, followed by a short note to restart OpenCode.

### 3. Usage

Show the primary `/commit` flows:

- `/commit`
- `/commit AV-42`

Also explain the expected effect at a high level: command registration, commit message generation, and enforcement of the bash policy.

### 4. Available packages

Add a compact table listing the current package, its version, and its purpose.

### 5. Repository structure

Document the main paths contributors need:

- `packages/commit`
- `docs/plugins/commit.md`
- root workspace scripts in `package.json`

### 6. Local development

Document how contributors install dependencies and run validation:

- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run check`

### 7. Documentation

Link to `docs/plugins/commit.md` for package-specific behavior.

### 8. License

Point to the MIT license.

## Content Principles

- Keep the README product-first, not monorepo-first.
- Prefer short actionable examples over deep internal implementation detail.
- Reflect only what exists in the repository today.
- Reuse the tone of `av-marketplace`: concise, practical, and documentation-oriented.

## Out of Scope

- Adding new packages or new docs pages.
- Expanding package-level docs beyond what belongs in the top-level README.
- Documenting unpublished or planned plugins.
