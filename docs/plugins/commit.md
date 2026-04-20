# Commit Plugin

`@appverk/opencode-commit` adds an OpenCode-native commit workflow with policy enforcement.

## Install

1. Add the plugin package to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@appverk/opencode-commit"]
}
```

2. Copy the example command from `examples/commit/.opencode/commands/commit.md` into your project.

## Usage

- Run `/commit` to create a commit for the current repository changes.
- Run `/commit AV-42` to append `Refs: AV-42` to the final message.

## Behavior

- Blocks direct `git commit` through the `bash` tool.
- Blocks `git push` through the `bash` tool.
- Rejects `Co-Authored-By` footers.
- Stages the selected files passed to `av_commit`, or all changes when no file list is provided.

## Limitations

- The package does not install the `/commit` command automatically.
- The user must add the command configuration explicitly.
- Repository hooks still run and can reject the commit.
