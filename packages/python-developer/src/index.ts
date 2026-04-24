import path from "node:path"
import { fileURLToPath } from "node:url"
import { createSkillPlugin } from "@appverk/opencode-skill-utils"
import { loadPythonSkill } from "./tools/load-skill.js"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

export const AppVerkPythonDeveloperPlugin = createSkillPlugin({
  namespace: "python",
  agentName: "python-developer",
  commandName: "python",
  agentDescription:
    "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.",
  commandDescription:
    "Python development workflow enforcing coding standards, TDD, and stack-specific patterns.",
  loadSkill: loadPythonSkill,
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

export default AppVerkPythonDeveloperPlugin
