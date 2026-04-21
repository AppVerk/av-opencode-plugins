import { describe, expect, it } from "vitest"
import { AppVerkPythonDeveloperPlugin } from "../src/index.js"

describe("AppVerkPythonDeveloperPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkPythonDeveloperPlugin).toBe("function")
  })

  it("registers agent python-developer in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { agent: {} } as { agent?: Record<string, { description?: string; prompt?: string }> }

    await plugin.config?.(config as never)

    expect(config.agent?.["python-developer"]).toBeDefined()
    expect(config.agent?.["python-developer"].description).toContain("Python")
    expect(config.agent?.["python-developer"].prompt).toContain("Python Developer Agent")
  })

  it("registers command /develop in config", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    const config = { command: {} } as { command?: Record<string, { description?: string; template: string; agent?: string }> }

    await plugin.config?.(config as never)

    expect(config.command?.develop).toBeDefined()
    expect(config.command?.develop.description).toContain("Python")
    expect(config.command?.develop.template).toContain("Python Development Workflow")
    expect(config.command?.develop.agent).toBe("python-developer")
  })

  it("registers load_python_skill tool", async () => {
    const plugin = await AppVerkPythonDeveloperPlugin({} as never)
    expect(plugin.tool?.load_python_skill).toBeDefined()
  })
})
