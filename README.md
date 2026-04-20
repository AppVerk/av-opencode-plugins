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
