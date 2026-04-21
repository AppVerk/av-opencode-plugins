import { cpSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, "..")
const distDir = path.resolve(projectRoot, "dist")

function copyDir(src, dest) {
  if (!src.includes("src")) return
  mkdirSync(dest, { recursive: true })
  cpSync(src, dest, { recursive: true })
}

// Copy commands and agents markdown files to dist/
copyDir(path.resolve(projectRoot, "src/commands"), path.resolve(distDir, "commands"))
copyDir(path.resolve(projectRoot, "src/agents"), path.resolve(distDir, "agents"))

console.log("Assets copied to dist/")
