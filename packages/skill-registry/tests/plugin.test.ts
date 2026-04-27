import { describe, expect, it } from "vitest"
import { AppVerkSkillRegistryPlugin } from "../src/index.js"

describe("AppVerkSkillRegistryPlugin", () => {
  it("exports a plugin factory function", () => {
    expect(typeof AppVerkSkillRegistryPlugin).toBe("function")
  })

  it("returns a plugin with tool, config, and transform hook", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)

    expect(plugin.tool).toBeDefined()
    expect(plugin.tool?.load_appverk_skill).toBeDefined()
    expect(plugin["experimental.chat.system.transform"]).toBeDefined()
    expect(plugin.config).toBeDefined()
  })

  it("config hook is defined", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    expect(plugin.config).toBeDefined()
  })

  it("system transform hook appends activation rules", async () => {
    const plugin = await AppVerkSkillRegistryPlugin({} as never)
    const output = { system: [] as string[] }

    await plugin["experimental.chat.system.transform"]?.(
      { model: {} as never } as never,
      output as never,
    )

    expect(output.system.length).toBeGreaterThan(0)
    expect(output.system[0]).toContain("AppVerk Skills")
    expect(output.system[0]).toContain("load_appverk_skill")
  })
})
