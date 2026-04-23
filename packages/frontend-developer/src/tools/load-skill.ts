import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const AVAILABLE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "tailwind-patterns",
  "zustand-patterns",
  "tanstack-query-patterns",
  "form-patterns",
  "tanstack-router-patterns",
  "pnpm-package-manager",
]

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

function resolveSkillPath(name: string): string | null {
  const candidates = [
    path.resolve(moduleDirectory, "skills", `${name}.md`), // packaged build (dist/skills/)
    path.resolve(moduleDirectory, "../src/skills", `${name}.md`), // from dist/ in repo (src/skills/)
    path.resolve(moduleDirectory, "../skills", `${name}.md`), // from src/tools/ in vitest (src/skills/)
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

export function loadFrontendSkill(name: string): string {
  if (!AVAILABLE_SKILLS.includes(name)) {
    throw new Error(
      `frontend-developer skill not found: ${name}. Available: ${AVAILABLE_SKILLS.join(", ")}`,
    )
  }

  const skillPath = resolveSkillPath(name)

  if (!skillPath) {
    throw new Error(
      `frontend-developer skill file not found for: ${name}. Tried: skills/${name}.md and ../src/skills/${name}.md`,
    )
  }

  return readFileSync(skillPath, "utf8")
}
