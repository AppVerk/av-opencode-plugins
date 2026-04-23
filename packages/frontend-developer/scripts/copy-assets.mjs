import { cpSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(root, "../src/skills")
const dst = path.resolve(root, "../dist/skills")

const skills = [
  "coding-standards",
  "tdd-workflow",
  "tailwind-patterns",
  "zustand-patterns",
  "tanstack-query-patterns",
  "form-patterns",
  "tanstack-router-patterns",
  "pnpm-package-manager",
]

mkdirSync(dst, { recursive: true })

for (const skill of skills) {
  const srcFile = path.join(src, `${skill}.md`)
  const dstFile = path.join(dst, `${skill}.md`)
  cpSync(srcFile, dstFile)
  console.log(`Copied ${skill}.md → dist/skills/`)
}

console.log(`Copied ${skills.length} skills to dist/skills/`)

const srcAgent = path.resolve(root, "../src/agent-prompt.md")
const dstAgent = path.resolve(root, "../dist/agent-prompt.md")
cpSync(srcAgent, dstAgent)
console.log(`Copied agent-prompt.md → dist/`)

const srcCommand = path.resolve(root, "../src/commands/frontend.md")
const dstCommandDir = path.resolve(root, "../dist/commands")
const dstCommand = path.join(dstCommandDir, "frontend.md")
mkdirSync(dstCommandDir, { recursive: true })
cpSync(srcCommand, dstCommand)
console.log(`Copied commands/frontend.md → dist/commands/`)
