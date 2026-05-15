import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkSwiftDeveloperPlugin = createSkillPlugin({
  namespace: "swift",
  agentName: "swift-developer",
  commandName: "swift",
  agentDescription:
    "Expert Swift developer enforcing AppVerk coding standards, TDD workflow, and modern Apple stack patterns.",
  commandDescription:
    "Swift development workflow enforcing coding standards, TDD, and modern Apple stack patterns.",
  loadSkill: null,
  availableSkills: [],
  moduleDirectory,
})

export default AppVerkSwiftDeveloperPlugin
