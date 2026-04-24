import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { loadFrontendSkill } from "./tools/load-skill.js"

const AGENT_DESCRIPTION =
  "Expert TypeScript + React developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns."

const COMMAND_DESCRIPTION =
  "TypeScript + React development workflow enforcing coding standards, TDD, and stack-specific patterns."

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const packagedAgentPath = path.resolve(moduleDirectory, "agent-prompt.md")
const sourceAgentPath = path.resolve(moduleDirectory, "../src/agent-prompt.md")
const packagedCommandPath = path.resolve(moduleDirectory, "commands/frontend.md")
const sourceCommandPath = path.resolve(moduleDirectory, "../src/commands/frontend.md")

function loadFile(packaged: string, source: string): string {
  try {
    return readFileSync(packaged, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      try {
        return readFileSync(source, "utf8")
      } catch {
        throw new Error("Failed to load plugin template")
      }
    }
    throw new Error("Failed to load plugin template")
  }
}

const AGENT_PROMPT = loadFile(packagedAgentPath, sourceAgentPath)
const COMMAND_TEMPLATE = loadFile(packagedCommandPath, sourceCommandPath)

export const AppVerkFrontendDeveloperPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {}
      config.agent["frontend-developer"] = {
        description: AGENT_DESCRIPTION,
        prompt: AGENT_PROMPT,
        mode: "primary",
      }

      config.command = config.command ?? {}
      config.command.frontend = {
        description: COMMAND_DESCRIPTION,
        template: COMMAND_TEMPLATE,
        agent: "frontend-developer",
      }
    },
    tool: {
      load_frontend_skill: tool({
        description:
          "Load a frontend development skill by name. Returns the full markdown content of the skill's rules and patterns.",
        args: {
          name: tool.schema
            .string()
            .describe(
              "Skill name: coding-standards, tdd-workflow, tailwind-patterns, zustand-patterns, tanstack-query-patterns, form-patterns, tanstack-router-patterns, pnpm-package-manager",
            ),
        },
        async execute(args) {
          return loadFrontendSkill(args.name)
        },
      }),
    },
  }
}

export default AppVerkFrontendDeveloperPlugin
