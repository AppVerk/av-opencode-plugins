import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillLoader } from "@appverk/opencode-skill-utils"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const loadPythonSkill = createSkillLoader({
  namespace: "python-developer",
  availableSkills: [
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
  ],
  moduleDirectory,
})
