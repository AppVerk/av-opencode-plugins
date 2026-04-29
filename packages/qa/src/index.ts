import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

function loadMarkdownFile(name: string): string {
  const filePath = path.resolve(moduleDirectory, name)
  const baseDir = path.resolve(moduleDirectory, "..")
  if (!filePath.startsWith(baseDir)) {
    throw new Error("Invalid path: traversal detected")
  }
  try {
    return readFileSync(filePath, "utf8")
  } catch {
    throw new Error(
      `Markdown asset not found: ${name} (looked in ${filePath}). ` +
        `Ensure the package is built so that copy-assets.mjs copies assets into dist/.`
    )
  }
}

function createLazyMarkdownLoader(name: string): () => string {
  let cached: string | undefined
  return () => {
    if (cached === undefined) {
      cached = loadMarkdownFile(name)
    }
    return cached
  }
}

const AGENTS = [
  {
    name: "qa-fe-tester",
    description:
      "Frontend testing agent that executes FE test scenarios from a QA test plan using Playwright. Navigates pages, interacts with UI elements, verifies states, and takes screenshots on failure.",
    path: "agents/fe-tester.md",
  },
  {
    name: "qa-be-tester",
    description:
      "Backend testing agent that executes BE test scenarios from a QA test plan. Tests API endpoints, verifies response codes and bodies, checks database state, and handles error scenarios.",
    path: "agents/be-tester.md",
  },
]

const COMMANDS = [
  {
    name: "create-qa-plan",
    description:
      "Analyze code changes (PR, branch, commits) and generate a detailed QA test plan with FE and BE scenarios, edge cases, and tool detection.",
    path: "commands/create-qa-plan.md",
  },
  {
    name: "run-qa",
    description:
      "Execute a QA test plan — launch FE and BE testing agents, collect results, and generate a report with QA-XXX issue IDs.",
    path: "commands/run-qa.md",
  },
]

export const AppVerkQAPlugin: Plugin = async () => ({
  config: async (config) => {
    config.agent ??= {}
    for (const a of AGENTS) {
      const getPrompt = createLazyMarkdownLoader(a.path)
      config.agent[a.name] = {
        description: a.description,
        get prompt() {
          return getPrompt()
        },
        mode: "subagent",
      }
    }

    config.command ??= {}
    for (const c of COMMANDS) {
      const getTemplate = createLazyMarkdownLoader(c.path)
      config.command[c.name] = {
        description: c.description,
        get template() {
          return getTemplate()
        },
      }
    }
  },
})

export default AppVerkQAPlugin
