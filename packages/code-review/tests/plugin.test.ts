import { describe, it, expect, beforeAll } from "vitest"
import { AppVerkCodeReviewPlugin } from "../src/index.js"

describe("AppVerkCodeReviewPlugin", () => {
  let pluginResult: Awaited<ReturnType<typeof AppVerkCodeReviewPlugin>>

  beforeAll(async () => {
    pluginResult = await AppVerkCodeReviewPlugin({
      directory: "/tmp",
      worktree: "/tmp",
    } as any)
  })

  it("exports a plugin factory function", () => {
    expect(typeof AppVerkCodeReviewPlugin).toBe("function")
  })

  it("returns an object with a config function", () => {
    expect(pluginResult.config).toBeDefined()
    expect(typeof pluginResult.config).toBe("function")
  })

  const EXPECTED_AGENTS = [
    "security-auditor",
    "code-quality-auditor",
    "documentation-auditor",
    "cross-verifier",
    "challenger",
    "feedback-analyzer",
    "fix-auto",
    "skill-secret-scanner",
    "skill-sast-analyzer",
    "skill-dependency-scanner",
    "skill-architecture-analyzer",
    "skill-linter-integrator",
  ]

  const EXPECTED_COMMANDS = ["review", "fix", "fix-report", "analyze-feedback"]

  it.each(EXPECTED_AGENTS)("config registers %s agent", async (name) => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent[name]).toBeDefined()
    expect(config.agent[name].description).toBeDefined()
    expect(typeof config.agent[name].prompt).toBe("string")
    expect(config.agent[name].prompt.length).toBeGreaterThan(0)
    expect(config.agent[name].mode).toBe("subagent")
  })

  it.each(EXPECTED_COMMANDS)("config registers %s command", async (name) => {
    const config: any = { command: {} }
    await pluginResult.config?.(config as never)
    expect(config.command[name]).toBeDefined()
    expect(config.command[name].description).toBeDefined()
    expect(typeof config.command[name].template).toBe("string")
    expect(config.command[name].template.length).toBeGreaterThan(0)
  })

  it("does not register any custom tools", async () => {
    const config: any = { command: {}, agent: {} }
    await pluginResult.config?.(config as never)
    expect(pluginResult.tool).toBeUndefined()
  })
})
