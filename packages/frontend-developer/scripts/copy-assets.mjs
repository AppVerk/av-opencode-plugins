import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(root, "../src/skills")
const dst = path.resolve(root, "../dist/skills")

const skillFiles = readdirSync(src).filter((f) => f.endsWith(".md"))

mkdirSync(dst, { recursive: true })

for (const file of skillFiles) {
  const srcFile = path.join(src, file)
  const dstFile = path.join(dst, file)
  cpSync(srcFile, dstFile)
  console.log(`Copied ${file} → dist/skills/`)
}

console.log(`Copied ${skillFiles.length} skills to dist/skills/`)

const srcAgent = path.resolve(root, "../src/agent-prompt.md")
const dstAgent = path.resolve(root, "../dist/agent-prompt.md")
if (existsSync(srcAgent)) {
  cpSync(srcAgent, dstAgent)
  console.log(`Copied agent-prompt.md → dist/`)
} else {
  console.warn(`Warning: agent-prompt.md not found at ${srcAgent}`)
}

const srcCommand = path.resolve(root, "../src/commands/frontend.md")
const dstCommandDir = path.resolve(root, "../dist/commands")
const dstCommand = path.join(dstCommandDir, "frontend.md")
mkdirSync(dstCommandDir, { recursive: true })
if (existsSync(srcCommand)) {
  cpSync(srcCommand, dstCommand)
  console.log(`Copied commands/frontend.md → dist/commands/`)
} else {
  console.warn(`Warning: commands/frontend.md not found at ${srcCommand}`)
}
