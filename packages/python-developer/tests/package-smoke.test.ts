import { describe, expect, it } from "vitest"
import { AppVerkPythonDeveloperPlugin } from "../src/index.js"

describe("AppVerkPythonDeveloperPlugin package", () => {
  it("exports a plugin factory", () => {
    expect(typeof AppVerkPythonDeveloperPlugin).toBe("function")
  })
})
