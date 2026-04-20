---
description: Create a git commit with the AppVerk commit workflow
---

Current git status:
!`git status`

Current git diff:
!`git diff HEAD`

Current branch:
!`git branch --show-current`

Recent commits:
!`git log --oneline -10`

Task ID: $1

Write a concise Conventional Commit message that matches the current changes.

Rules:
- Never run `git push`.
- Never run `git commit` through `bash`.
- Never include `Co-Authored-By` or other AI attribution footers.
- Use the `av_commit` tool to create the commit.
- If `Task ID` is empty, omit `taskId` from the tool call.
- If `Task ID` is present, pass it through as `taskId`.
