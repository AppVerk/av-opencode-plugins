import { describe, it, expect, beforeAll } from "vitest"
import type { Config } from "@opencode-ai/plugin"
import { AppVerkQAPlugin } from "../dist/index.js"

describe("AppVerkQAPlugin", () => {
  let pluginResult: Awaited<ReturnType<typeof AppVerkQAPlugin>>

  beforeAll(async () => {
    pluginResult = await AppVerkQAPlugin({} as never)
  })

  it("exports a plugin factory", () => {
    expect(typeof AppVerkQAPlugin).toBe("function")
  })

  const EXPECTED_AGENTS = ["qa-fe-tester", "qa-be-tester"]
  const EXPECTED_COMMANDS = ["create-qa-plan", "run-qa"]

  it.each(EXPECTED_AGENTS)("registers %s agent", async (name) => {
    const config: Config = { agent: {} }
    await pluginResult.config?.(config)
    expect(config.agent![name]).toBeDefined()
    expect(config.agent![name]!.mode).toBe("subagent")
    expect(typeof config.agent![name]!.prompt).toBe("string")
  })

  it.each(EXPECTED_COMMANDS)("registers %s command", async (name) => {
    const config: Config = { command: {} }
    await pluginResult.config?.(config)
    expect(config.command![name]).toBeDefined()
    expect(typeof config.command![name]!.template).toBe("string")
  })
})
