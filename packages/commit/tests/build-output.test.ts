import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("build output assets", () => {
  it("includes the packaged commit markdown prompt and loads it from dist", async () => {
    const promptPath = resolve(process.cwd(), "dist/commands/commit.md")
    const { AppVerkCommitPlugin } = await import("../dist/index.js")
    const plugin = await AppVerkCommitPlugin({} as never)
    const config = {} as {
      command?: Record<string, { description?: string; template: string }>
    }

    expect(existsSync(promptPath)).toBe(true)
    expect(readFileSync(promptPath, "utf8")).toContain("## Context")
    expect(readFileSync(promptPath, "utf8")).toContain(
      "Use the `av_commit` tool to create the commit.",
    )

    await plugin.config?.(config as never)

    expect(config.command?.commit?.template).toContain("## Context")
    expect(config.command?.commit?.template).toContain(
      "Use the `av_commit` tool to create the commit.",
    )
  })
})
