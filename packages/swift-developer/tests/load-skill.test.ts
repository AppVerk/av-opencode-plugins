import { describe, expect, it } from "vitest"
import { loadSwiftSkill } from "../src/tools/load-skill.js"

describe("loadSwiftSkill", () => {
  it("loads a valid skill successfully", () => {
    const content = loadSwiftSkill("swift-coding-standards")
    expect(content).toContain("Swift")
    expect(content.length).toBeGreaterThan(0)
  })

  it("rejects unknown skill names", () => {
    expect(() => loadSwiftSkill("unknown-skill")).toThrow("not found")
  })

  it("caches loaded skills", () => {
    const first = loadSwiftSkill("swift-coding-standards")
    const second = loadSwiftSkill("swift-coding-standards")
    expect(first).toBe(second)
  })

  it("does not leak file paths in error messages for unknown skills", () => {
    expect(() => loadSwiftSkill("unknown-skill")).toThrow("not found")
    expect(() => loadSwiftSkill("unknown-skill")).not.toThrow("src/skills")
    expect(() => loadSwiftSkill("unknown-skill")).not.toThrow("../")
  })

  it("returns all 7 skills without error", () => {
    const skills = [
      "swift-coding-standards",
      "swift-tdd-workflow",
      "swiftui-patterns",
      "swift-concurrency-patterns",
      "swift-data-persistence",
      "swift-networking-patterns",
      "swift-package-manager",
    ]
    for (const name of skills) {
      expect(() => loadSwiftSkill(name)).not.toThrow()
      const content = loadSwiftSkill(name)
      expect(content.length).toBeGreaterThan(100)
    }
  })
})
