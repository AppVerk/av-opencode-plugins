import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, "../dist")

describe("build output", () => {
  it("dist/index.js exists", () => {
    expect(existsSync(path.resolve(distDir, "index.js"))).toBe(true)
  })

  it("dist/index.d.ts exists", () => {
    expect(existsSync(path.resolve(distDir, "index.d.ts"))).toBe(true)
  })

  const EXPECTED_FILES = [
    "commands/review.md",
    "agents/security-auditor.md",
    "agents/code-quality-auditor.md",
    "agents/documentation-auditor.md",
    "agents/cross-verifier.md",
    "agents/challenger.md",
    "commands/fix.md",
    "commands/fix-report.md",
    "agents/fix-auto.md",
    "commands/analyze-feedback.md",
    "agents/feedback-analyzer.md",
    "agents/skill-secret-scanner.md",
    "agents/skill-sast-analyzer.md",
    "agents/skill-dependency-scanner.md",
    "agents/skill-architecture-analyzer.md",
    "agents/skill-linter-integrator.md",
  ]

  it.each(EXPECTED_FILES)("dist/$path exists and has structural content", (p) => {
    const fullPath = path.resolve(distDir, p)
    expect(existsSync(fullPath)).toBe(true)
    const content = readFileSync(fullPath, "utf8")
    expect(content).toMatch(/^---/m)
    expect(content).toMatch(/^#/m)
  })
})
