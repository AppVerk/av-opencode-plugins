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

  it("config registers the review command", async () => {
    const config: any = { command: {} }
    await pluginResult.config?.(config as never)
    expect(config.command.review).toBeDefined()
    expect(config.command.review.description).toBeDefined()
    expect(typeof config.command.review.template).toBe("string")
    expect(config.command.review.template.length).toBeGreaterThan(0)
  })

  it("config registers security-auditor agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["security-auditor"]).toBeDefined()
    expect(config.agent["security-auditor"].description).toBeDefined()
    expect(typeof config.agent["security-auditor"].prompt).toBe("string")
    expect(config.agent["security-auditor"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers code-quality-auditor agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["code-quality-auditor"]).toBeDefined()
    expect(config.agent["code-quality-auditor"].description).toBeDefined()
    expect(typeof config.agent["code-quality-auditor"].prompt).toBe("string")
    expect(config.agent["code-quality-auditor"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers documentation-auditor agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["documentation-auditor"]).toBeDefined()
    expect(config.agent["documentation-auditor"].description).toBeDefined()
    expect(typeof config.agent["documentation-auditor"].prompt).toBe("string")
    expect(config.agent["documentation-auditor"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers cross-verifier agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["cross-verifier"]).toBeDefined()
    expect(config.agent["cross-verifier"].description).toBeDefined()
    expect(typeof config.agent["cross-verifier"].prompt).toBe("string")
    expect(config.agent["cross-verifier"].prompt.length).toBeGreaterThan(0)
  })

  it("config registers challenger agent", async () => {
    const config: any = { agent: {} }
    await pluginResult.config?.(config as never)
    expect(config.agent["challenger"]).toBeDefined()
    expect(config.agent["challenger"].description).toBeDefined()
    expect(typeof config.agent["challenger"].prompt).toBe("string")
    expect(config.agent["challenger"].prompt.length).toBeGreaterThan(0)
  })

  it("does not register any custom tools", async () => {
    const config: any = { command: {}, agent: {} }
    await pluginResult.config?.(config as never)
    expect(pluginResult.tool).toBeUndefined()
  })
})
