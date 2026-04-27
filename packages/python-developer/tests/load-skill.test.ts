import { describe, expect, it } from "vitest"
import { loadPythonSkill } from "../src/tools/load-skill.js"

describe("loadPythonSkill", () => {
  it("returns python-coding-standards skill markdown", () => {
    const content = loadPythonSkill("python-coding-standards")
    expect(content).toContain("HARD-RULES")
    expect(content).toContain("Python Coding Rules")
  })

  it("returns python-tdd-workflow skill markdown", () => {
    const content = loadPythonSkill("python-tdd-workflow")
    expect(content).toContain("TDD")
    expect(content).toContain("Red-Green-Refactor")
  })

  it("returns fastapi-patterns skill markdown", () => {
    const content = loadPythonSkill("fastapi-patterns")
    expect(content).toContain("FastAPI")
  })

  it("returns all 10 skills without error", () => {
    const skills = [
      "python-coding-standards",
      "python-tdd-workflow",
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
