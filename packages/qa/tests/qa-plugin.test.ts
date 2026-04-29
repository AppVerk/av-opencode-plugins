import { AppVerkQAPlugin } from "../dist/index.js"

test("exports a plugin factory", () => {
  expect(typeof AppVerkQAPlugin).toBe("function")
})

test("registers all agents and commands", async () => {
  const hooks = await AppVerkQAPlugin({
    client: {} as any,
    project: {} as any,
    directory: "/tmp",
    worktree: "/tmp",
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const config: any = { agent: {}, command: {} }
  await hooks.config!(config)

  expect(config.agent).toHaveProperty("qa-fe-tester")
  expect(config.agent).toHaveProperty("qa-be-tester")
  expect(config.command).toHaveProperty("create-qa-plan")
  expect(config.command).toHaveProperty("run-qa")
})

test("agent prompts load without error", async () => {
  const hooks = await AppVerkQAPlugin({
    client: {} as any,
    project: {} as any,
    directory: "/tmp",
    worktree: "/tmp",
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const config: any = { agent: {}, command: {} }
  await hooks.config!(config)

  for (const name of ["qa-fe-tester", "qa-be-tester"]) {
    const agent = config.agent[name]
    expect(agent).toBeDefined()
    const prompt = agent.prompt
    expect(typeof prompt).toBe("string")
    expect(prompt.length).toBeGreaterThan(100)
  }
})

test("command templates load without error", async () => {
  const hooks = await AppVerkQAPlugin({
    client: {} as any,
    project: {} as any,
    directory: "/tmp",
    worktree: "/tmp",
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://localhost"),
    $: {} as any,
  })

  const config: any = { agent: {}, command: {} }
  await hooks.config!(config)

  for (const name of ["create-qa-plan", "run-qa"]) {
    const cmd = config.command[name]
    expect(cmd).toBeDefined()
    const template = cmd.template
    expect(typeof template).toBe("string")
    expect(template.length).toBeGreaterThan(100)
  }
})
