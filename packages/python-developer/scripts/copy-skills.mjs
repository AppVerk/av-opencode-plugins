import { cpSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(root, "../src/skills")
const dst = path.resolve(root, "../dist/skills")

const skills = [
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

mkdirSync(dst, { recursive: true })

for (const skill of skills) {
  const srcFile = path.join(src, `${skill}.md`)
  const dstFile = path.join(dst, `${skill}.md`)
  cpSync(srcFile, dstFile)
  console.log(`Copied ${skill}.md → dist/skills/`)
}

console.log(`Copied ${skills.length} skills to dist/skills/`)
