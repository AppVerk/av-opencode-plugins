import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillLoader } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const loadFrontendSkill = createSkillLoader({
  namespace: "frontend-developer",
  availableSkills: [
    "frontend-coding-standards",
    "frontend-tdd-workflow",
    "tailwind-patterns",
    "zustand-patterns",
    "tanstack-query-patterns",
    "form-patterns",
    "tanstack-router-patterns",
    "pnpm-package-manager",
  ],
  moduleDirectory,
})
