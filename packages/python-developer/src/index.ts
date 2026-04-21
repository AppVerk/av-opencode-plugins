import { existsSync, readFileSync } from "node:fs"
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
const packagedCommandPath = path.resolve(moduleDirectory, "commands/develop.md")
const sourceCommandPath = path.resolve(moduleDirectory, "../src/commands/develop.md")

function loadFile(packaged: string, source: string): string {
  const filePath = existsSync(packaged) ? packaged : source
  return readFileSync(filePath, "utf8")
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
      }

      config.command = config.command ?? {}
      config.command.develop = {
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
        execute(args) {
          return loadPythonSkill(args.name)
        },
      }),
    },
  }
}

export default AppVerkPythonDeveloperPlugin
