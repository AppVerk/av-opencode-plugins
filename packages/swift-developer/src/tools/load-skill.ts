import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillLoader } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const loadSwiftSkill = createSkillLoader({
  namespace: "swift-developer",
  availableSkills: [
    "swift-coding-standards",
    "swift-tdd-workflow",
    "swiftui-patterns",
    "swift-concurrency-patterns",
    "swift-data-persistence",
    "swift-networking-patterns",
    "swift-package-manager",
  ],
  moduleDirectory,
})
