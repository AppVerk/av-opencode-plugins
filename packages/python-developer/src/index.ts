import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { loadPythonSkill } from "./tools/load-skill.js"

const AGENT_DESCRIPTION =
  "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns."

const COMMAND_DESCRIPTION =
  "Python development workflow enforcing coding standards, TDD, and stack-specific patterns."

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const packagedAgentPath = path.resolve(moduleDirectory, "agent-prompt.md")
const sourceAgentPath = path.resolve(moduleDirectory, "../src/agent-prompt.md")
const packagedCommandPath = path.resolve(moduleDirectory, "commands/python.md")
const sourceCommandPath = path.resolve(moduleDirectory, "../src/commands/python.md")

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

export const AppVerkPythonDeveloperPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {}
      config.agent["python-developer"] = {
        description: AGENT_DESCRIPTION,
        prompt: AGENT_PROMPT,
        mode: "primary",
      }

      config.command = config.command ?? {}
      config.command.python = {
        description: COMMAND_DESCRIPTION,
        template: COMMAND_TEMPLATE,
        agent: "python-developer",
      }
    },
    tool: {
      load_python_skill: tool({
        description:
          "Load a Python development skill by name. Returns the full markdown content of the skill's rules and patterns.",
        args: {
          name: tool.schema
            .string()
            .describe(
              "Skill name: coding-standards, tdd-workflow, fastapi-patterns, sqlalchemy-patterns, pydantic-patterns, async-python-patterns, uv-package-manager, django-web-patterns, django-orm-patterns, celery-patterns",
            ),
        },
        async execute(args) {
          return loadPythonSkill(args.name)
        },
      }),
    },
  }
}

export default AppVerkPythonDeveloperPlugin
