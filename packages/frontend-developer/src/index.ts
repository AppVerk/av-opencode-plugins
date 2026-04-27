import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkFrontendDeveloperPlugin = createSkillPlugin({
  namespace: "frontend",
  agentName: "frontend-developer",
  commandName: "frontend",
  agentDescription:
    "Expert TypeScript + React developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.",
  commandDescription:
    "TypeScript + React development workflow enforcing coding standards, TDD, and stack-specific patterns.",
  loadSkill: null,
  availableSkills: [],
  moduleDirectory,
})

export default AppVerkFrontendDeveloperPlugin
