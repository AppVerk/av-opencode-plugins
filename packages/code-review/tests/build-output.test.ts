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

  it("dist/commands/review.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/review.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/security-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/security-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/code-quality-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/code-quality-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/documentation-auditor.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/documentation-auditor.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/cross-verifier.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/cross-verifier.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/challenger.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/challenger.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
})
