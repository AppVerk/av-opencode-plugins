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

  it("dist/commands/fix.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/fix.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/commands/fix-report.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/fix-report.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/fix-auto.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/fix-auto.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/commands/analyze-feedback.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "commands/analyze-feedback.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/feedback-analyzer.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/feedback-analyzer.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-secret-scanner.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-secret-scanner.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-sast-analyzer.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-sast-analyzer.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-dependency-scanner.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-dependency-scanner.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-architecture-analyzer.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-architecture-analyzer.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })

  it("dist/agents/skill-linter-integrator.md exists and is non-empty", () => {
    const p = path.resolve(distDir, "agents/skill-linter-integrator.md")
    expect(existsSync(p)).toBe(true)
    expect(readFileSync(p, "utf8").length).toBeGreaterThan(100)
  })
})
