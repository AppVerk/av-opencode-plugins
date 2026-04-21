import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "@opencode-ai/plugin"

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

function loadMarkdownFile(name: string): string {
  const packagedPath = path.resolve(moduleDirectory, name)
  const sourcePath = path.resolve(moduleDirectory, "../src", name)
  const filePath = existsSync(packagedPath) ? packagedPath : sourcePath
  return readFileSync(filePath, "utf8")
}

const SECURITY_AUDITOR_PROMPT = loadMarkdownFile("agents/security-auditor.md")
const CODE_QUALITY_AUDITOR_PROMPT = loadMarkdownFile("agents/code-quality-auditor.md")
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")

const SECURITY_AUDITOR_DESCRIPTION =
  "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance."

const CODE_QUALITY_AUDITOR_DESCRIPTION =
  "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis."

const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."

export const AppVerkCodeReviewPlugin: Plugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {}
      config.agent["security-auditor"] = {
        description: SECURITY_AUDITOR_DESCRIPTION,
        prompt: SECURITY_AUDITOR_PROMPT,
      }
      config.agent["code-quality-auditor"] = {
        description: CODE_QUALITY_AUDITOR_DESCRIPTION,
        prompt: CODE_QUALITY_AUDITOR_PROMPT,
      }

      config.command = config.command ?? {}
      config.command.review = {
        description: REVIEW_COMMAND_DESCRIPTION,
        template: REVIEW_COMMAND_TEMPLATE,
      }
    },
  }
}

export default AppVerkCodeReviewPlugin
