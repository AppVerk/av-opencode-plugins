import { describe, expect, it } from "vitest"
import { generateActivationRules } from "../src/prompt-injector.js"
import { buildSkillCatalog } from "../src/skill-catalog.js"

describe("generateActivationRules", () => {
  const catalog = buildSkillCatalog([
    "../python-developer/dist/skills",
    "../frontend-developer/dist/skills",
  ])

  const rules = generateActivationRules(catalog)

  it("includes header and tool reference", () => {
    expect(rules).toContain("AppVerk Skills")
    expect(rules).toContain("load_appverk_skill")
  })

  it("includes all skill names in catalog table", () => {
    expect(rules).toContain("python-coding-standards")
    expect(rules).toContain("frontend-coding-standards")
    expect(rules).toContain("fastapi-patterns")
    expect(rules).toContain("tailwind-patterns")
  })

  it("includes activation descriptions", () => {
    expect(rules).toContain("Python")
    expect(rules).toContain("TypeScript")
  })

  it("includes HARD-RULES section", () => {
    expect(rules).toContain("BEFORE any coding")
    expect(rules).toContain("load ALL applicable skills")
  })
})
