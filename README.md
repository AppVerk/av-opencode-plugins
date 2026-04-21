# AppVerk OpenCode Plugins

[![Package](https://img.shields.io/badge/package-2-blue.svg)](#available-packages)

OpenCode plugin packages for AppVerk. The root plugin loads the AppVerk plugin bundle from this repository, which currently provides a controlled commit workflow that registers `/commit` and enforces AppVerk git policies inside OpenCode.

## Installation

Add the root plugin package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["av-opencode-plugins@git+https://github.com/AppVerk/av-opencode-plugins.git"]
}
```

Restart OpenCode after updating the config. The root plugin installs the AppVerk plugin bundle and registers `/commit` automatically.

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
| [`@appverk/opencode-python-developer`](docs/plugins/python-developer.md) | `0.1.0` | Python development workflow with TDD, coding standards, and stack-specific patterns (FastAPI, Django, Celery). |

## Repository Structure

- `packages/commit` - plugin source, tests, command template, and build scripts for the commit workflow.
- `docs/plugins/commit.md` - package-level behavior and usage guide.
- `packages/python-developer` - plugin source, tests, skill files, and build scripts for the Python development workflow.
- `docs/plugins/python-developer.md` - package-level behavior and usage guide.
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
- [Python Developer Plugin Guide](docs/plugins/python-developer.md)

## License

This repository currently does not include a top-level `LICENSE` file. Add one before publishing or distributing the packages beyond internal use.
