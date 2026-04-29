import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs"
import path from "node:path"

const srcDir = path.resolve("src")
const distDir = path.resolve("dist")

function copyRecursive(src, dest) {
  const stat = statSync(src)
  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true })
    for (const entry of readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry))
    }
  } else if (src.endsWith(".md")) {
    mkdirSync(path.dirname(dest), { recursive: true })
    copyFileSync(src, dest)
  }
}

for (const subdir of ["commands", "agents", "skills"]) {
  const srcSubdir = path.join(srcDir, subdir)
  const destSubdir = path.join(distDir, subdir)
  try {
    copyRecursive(srcSubdir, destSubdir)
    console.log(`Copied ${subdir} to dist/`)
  } catch (err) {
    if (err.code !== "ENOENT") throw err
  }
}
