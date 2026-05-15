import { describe, expect, it } from "vitest"
import { AppVerkSwiftDeveloperPlugin } from "../src/index.js"

describe("AppVerkSwiftDeveloperPlugin package", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkSwiftDeveloperPlugin).toBe("function")
  })
})
