import { describe, it, expect } from "vitest"

describe("@appverk/opencode-code-review package smoke", () => {
  it("can be imported", async () => {
    const pkg = await import("@appverk/opencode-code-review")
    expect(pkg).toBeDefined()
    expect(typeof pkg.AppVerkCodeReviewPlugin).toBe("function")
  })
})
