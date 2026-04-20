import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { classifyBashCommand } from "./bash-policy.js"
import { createControlledCommit } from "./controlled-commit.js"

export const AppVerkCommitPlugin: Plugin = async () => {
  return {
    tool: {
      av_commit: tool({
        description: "Create a commit through the AppVerk commit workflow",
        args: {
          message: tool.schema
            .string()
            .describe("The Conventional Commit message to create"),
          files: tool.schema
            .array(tool.schema.string())
            .optional()
            .describe("Optional file paths to stage before committing"),
          taskId: tool.schema
            .string()
            .optional()
            .describe("Optional task ID appended as a Refs footer"),
        },
        async execute(args, context) {
          const result = await createControlledCommit({
            cwd: context.worktree ?? context.directory,
            message: args.message,
            files: args.files ?? [],
            taskId: args.taskId,
          })

          return JSON.stringify(result, null, 2)
        },
      }),
    },
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") {
        return
      }

      const command = String(output.args.command ?? "")
      const decision = classifyBashCommand(command)

      if (decision === "block-direct-commit") {
        throw new Error("Direct git commit is blocked. Use /commit instead.")
      }

      if (decision === "block-push") {
        throw new Error("git push is blocked by @appverk/opencode-commit.")
      }
    },
  }
}

export default AppVerkCommitPlugin
