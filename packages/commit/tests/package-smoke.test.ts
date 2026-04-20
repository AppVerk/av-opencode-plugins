import { describe, expect, it } from "vitest"
import { AppVerkCommitPlugin } from "../src/index.js"

describe("AppVerkCommitPlugin", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkCommitPlugin).toBe("function")
  })
})
