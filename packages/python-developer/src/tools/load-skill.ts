import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const AVAILABLE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "fastapi-patterns",
  "sqlalchemy-patterns",
  "pydantic-patterns",
  "async-python-patterns",
  "uv-package-manager",
  "django-web-patterns",
  "django-orm-patterns",
  "celery-patterns",
]

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

function resolveSkillPath(name: string): string | null {
  const candidates = [
    path.resolve(moduleDirectory, "../../skills", `${name}.md`),
    path.resolve(moduleDirectory, "../../src/skills", `${name}.md`),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

export function loadPythonSkill(name: string): string {
  if (!AVAILABLE_SKILLS.includes(name)) {
    throw new Error(
      `python-developer skill not found: ${name}. Available: ${AVAILABLE_SKILLS.join(", ")}`,
    )
  }

  const skillPath = resolveSkillPath(name)

  if (!skillPath) {
    throw new Error(
      `python-developer skill file not found for: ${name}. Tried: ../../skills/${name}.md and ../../src/skills/${name}.md`,
    )
  }

  return readFileSync(skillPath, "utf8")
}
