import { describe, expect, it } from "vitest"
import { createSkillPlugin } from "../src/index.js"

describe("createSkillPlugin", () => {
  it("returns a plugin factory", () => {
    const plugin = createSkillPlugin({
      namespace: "test",
      agentName: "test-developer",
      commandName: "test",
      agentDescription: "Test agent",
      commandDescription: "Test command",
      loadSkill: (name) => `skill: ${name}`,
      availableSkills: ["skill-a", "skill-b"],
      moduleDirectory: "/fake/path",
    })

    expect(typeof plugin).toBe("function")
  })

  it("creates a plugin with correct config keys", async () => {
    const pluginFactory = createSkillPlugin({
      namespace: "test",
      agentName: "test-developer",
      commandName: "test",
      agentDescription: "Test agent",
      commandDescription: "Test command",
      loadSkill: (name) => `skill: ${name}`,
      availableSkills: ["skill-a", "skill-b"],
      moduleDirectory: "/fake/path",
    })

    const plugin = await pluginFactory({} as never)
    const config = { agent: {}, command: {} } as {
      agent?: Record<string, unknown>
      command?: Record<string, unknown>
    }

    await plugin.config?.(config as never)

    expect(config.agent?.["test-developer"]).toBeDefined()
    expect(config.command?.test).toBeDefined()
    expect(config.command?.test).toHaveProperty("agent", "test-developer")
  })

  it("registers the skill loading tool", async () => {
    const pluginFactory = createSkillPlugin({
      namespace: "test",
      agentName: "test-developer",
      commandName: "test",
      agentDescription: "Test agent",
      commandDescription: "Test command",
      loadSkill: (name) => `skill: ${name}`,
      availableSkills: ["skill-a", "skill-b"],
      moduleDirectory: "/fake/path",
    })

    const plugin = await pluginFactory({} as never)

    expect(plugin.tool?.load_test_skill).toBeDefined()
  })

  it("uses provided descriptions", async () => {
    const pluginFactory = createSkillPlugin({
      namespace: "test",
      agentName: "test-developer",
      commandName: "test",
      agentDescription: "Custom agent desc",
      commandDescription: "Custom command desc",
      loadSkill: (name) => `skill: ${name}`,
      availableSkills: ["skill-a"],
      moduleDirectory: "/fake/path",
    })

    const plugin = await pluginFactory({} as never)
    const config = { agent: {}, command: {} } as {
      agent?: Record<string, { description?: string }>
      command?: Record<string, { description?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.agent?.["test-developer"]?.description).toBe(
      "Custom agent desc",
    )
    expect(config.command?.test?.description).toBe("Custom command desc")
  })

  it("defaults mode to primary", async () => {
    const pluginFactory = createSkillPlugin({
      namespace: "test",
      agentName: "test-developer",
      commandName: "test",
      agentDescription: "Test agent",
      commandDescription: "Test command",
      loadSkill: (name) => `skill: ${name}`,
      availableSkills: ["skill-a"],
      moduleDirectory: "/fake/path",
    })

    const plugin = await pluginFactory({} as never)
    const config = { agent: {} } as {
      agent?: Record<string, { mode?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.agent?.["test-developer"]?.mode).toBe("primary")
  })

  it("allows overriding mode to subagent", async () => {
    const pluginFactory = createSkillPlugin({
      namespace: "test",
      agentName: "test-developer",
      commandName: "test",
      agentDescription: "Test agent",
      commandDescription: "Test command",
      loadSkill: (name) => `skill: ${name}`,
      availableSkills: ["skill-a"],
      moduleDirectory: "/fake/path",
      mode: "subagent",
    })

    const plugin = await pluginFactory({} as never)
    const config = { agent: {} } as {
      agent?: Record<string, { mode?: string }>
    }

    await plugin.config?.(config as never)

    expect(config.agent?.["test-developer"]?.mode).toBe("subagent")
  })
})
