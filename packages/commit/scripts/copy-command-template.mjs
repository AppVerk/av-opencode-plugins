import { fileURLToPath } from "node:url"
import path from "node:path"
import { copyAssets } from "../../../scripts/copy-assets.mjs"

const root = path.dirname(fileURLToPath(import.meta.url))

copyAssets(
  [
    { from: "src/commands/commit.md", to: "dist/commands/commit.md" },
  ],
  path.resolve(root, "..")
)
