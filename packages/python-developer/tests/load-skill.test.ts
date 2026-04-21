import { describe, expect, it } from "vitest"
import { loadPythonSkill } from "../src/tools/load-skill.js"

describe("loadPythonSkill", () => {
  it("returns coding-standards skill markdown", () => {
    const content = loadPythonSkill("coding-standards")
    expect(content).toContain("HARD-RULES")
    expect(content).toContain("Python Coding Rules")
  })

  it("returns tdd-workflow skill markdown", () => {
    const content = loadPythonSkill("tdd-workflow")
    expect(content).toContain("TDD")
    expect(content).toContain("Red-Green-Refactor")
  })

  it("returns fastapi-patterns skill markdown", () => {
    const content = loadPythonSkill("fastapi-patterns")
    expect(content).toContain("FastAPI")
  })

  it("returns all 10 skills without error", () => {
    const skills = [
      "coding-standards",
      "tdd-workflow",
      "fastapi-patterns",
      "sqlalchemy-patterns",
      "pydantic-patterns",
      "async-python-patterns",
      "uv-package-manager",
      "django-web-patterns",
      "django-orm-patterns",
      "celery-patterns",
    ]
    for (const name of skills) {
      expect(() => loadPythonSkill(name)).not.toThrow()
      const content = loadPythonSkill(name)
      expect(content.length).toBeGreaterThan(100)
    }
  })

  it("throws for unknown skill name", () => {
    expect(() => loadPythonSkill("nonexistent")).toThrow(/python-developer.*skill.*not.*found/i)
  })
})
