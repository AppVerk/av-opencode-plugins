import { copyFileSync, mkdirSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const packageDirectory = path.resolve(scriptDirectory, "..")
const sourcePath = path.join(packageDirectory, "src", "commands", "commit.md")
const outputDirectory = path.join(packageDirectory, "dist", "commands")
const outputPath = path.join(outputDirectory, "commit.md")

mkdirSync(outputDirectory, { recursive: true })
copyFileSync(sourcePath, outputPath)
