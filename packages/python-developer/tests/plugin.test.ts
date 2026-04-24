import { describe, expect, it } from "vitest"
import type { Config } from "@opencode-ai/plugin"
import { AppVerkPythonDeveloperPlugin } from "../src/index.js"
import { loadPythonSkill } from "../src/tools/load-skill.js"

describe("AppVerkPythonDeveloperPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkPythonDeveloperPlugin).toBe("function")
  })

  it("registers agent python-developer in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { agent: {} } as Config

    await plugin.config?.(config)

    expect(config.agent?.["python-developer"]).toBeDefined()
    expect(config.agent!["python-developer"]!.description).toContain("Python")
    expect(config.agent!["python-developer"]!.prompt).toContain("Python Developer Agent")
    expect(config.agent!["python-developer"]!.mode).toBe("primary")
  })

  it("registers command /python in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { command: {} } as Config

    await plugin.config?.(config)

    expect(config.command?.python).toBeDefined()
    expect(config.command!.python!.description).toContain("Python")
    expect(config.command!.python!.template).toContain("Python Development Workflow")
    expect(config.command!.python!.agent).toBe("python-developer")
  })

  it("registers load_python_skill tool", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    expect(plugin.tool?.load_python_skill).toBeDefined()
  })
})

describe("loadPythonSkill", () => {
  it("loads a valid skill successfully", () => {
    const content = loadPythonSkill("coding-standards")
    expect(content).toContain("Python")
    expect(content.length).toBeGreaterThan(0)
  })

  it("rejects unknown skill names", () => {
    expect(() => loadPythonSkill("unknown-skill")).toThrow("not found")
  })

  it("caches loaded skills", () => {
    const first = loadPythonSkill("coding-standards")
    const second = loadPythonSkill("coding-standards")
    expect(first).toBe(second)
  })

  it("does not leak file paths in error messages for unknown skills", () => {
    expect(() => loadPythonSkill("unknown-skill")).toThrow("not found")
    expect(() => loadPythonSkill("unknown-skill")).not.toThrow("src/skills")
    expect(() => loadPythonSkill("unknown-skill")).not.toThrow("../")
  })
})
