import { describe, expect, it } from "vitest"
import { AppVerkCommitPlugin } from "../src/index.js"

describe("AppVerkCommitPlugin runtime", () => {
  it("registers the av_commit tool", async () => {
    const plugin = await AppVerkCommitPlugin({} as never)

    expect(plugin.tool?.av_commit).toBeDefined()
  })

  it("blocks direct git commit bash commands", async () => {
    const plugin = await AppVerkCommitPlugin({} as never)

    await expect(
      plugin["tool.execute.before"]?.(
        { tool: "bash", args: { command: 'git commit -m "feat: bypass"' } } as never,
        { args: { command: 'git commit -m "feat: bypass"' } } as never,
      ),
    ).rejects.toThrow(/use \/commit/i)
  })

  it("blocks git push bash commands", async () => {
    const plugin = await AppVerkCommitPlugin({} as never)

    await expect(
      plugin["tool.execute.before"]?.(
        { tool: "bash", args: { command: "git push origin main" } } as never,
        { args: { command: "git push origin main" } } as never,
      ),
    ).rejects.toThrow(/git push is blocked/i)
  })
})
