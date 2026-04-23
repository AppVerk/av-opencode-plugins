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
const DOCUMENTATION_AUDITOR_PROMPT = loadMarkdownFile("agents/documentation-auditor.md")
const CROSS_VERIFIER_PROMPT = loadMarkdownFile("agents/cross-verifier.md")
const CHALLENGER_PROMPT = loadMarkdownFile("agents/challenger.md")
const REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md")
const FIX_COMMAND_TEMPLATE = loadMarkdownFile("commands/fix.md")
const FIX_REPORT_COMMAND_TEMPLATE = loadMarkdownFile("commands/fix-report.md")
const FIX_AUTO_PROMPT = loadMarkdownFile("agents/fix-auto.md")
const ANALYZE_FEEDBACK_COMMAND_TEMPLATE = loadMarkdownFile("commands/analyze-feedback.md")
const FEEDBACK_ANALYZER_PROMPT = loadMarkdownFile("agents/feedback-analyzer.md")

const SECURITY_AUDITOR_DESCRIPTION =
  "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance."

const CODE_QUALITY_AUDITOR_DESCRIPTION =
  "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis."

const DOCUMENTATION_AUDITOR_DESCRIPTION =
  "Documentation auditor that verifies code changes are reflected in project documentation."

const CROSS_VERIFIER_DESCRIPTION =
  "Cross-domain correlation agent that finds intersections between security, quality, and documentation findings."

const CHALLENGER_DESCRIPTION =
  "Adversarial review agent that challenges findings for false positives and validates severity levels."

const REVIEW_COMMAND_DESCRIPTION =
  "Perform comprehensive code review for security, performance, architecture, and maintainability."

const FIX_COMMAND_DESCRIPTION =
  "Apply fix for a single code review issue with verification and reporting."

const FIX_REPORT_COMMAND_DESCRIPTION =
  "Parse a saved review report, present issues as a checklist, fix selected issues, and mark them resolved."

const FIX_AUTO_DESCRIPTION =
  "Auto-fix subagent for code review issues. Performs analysis, implementation, verification, and reporting without user confirmation."

const ANALYZE_FEEDBACK_COMMAND_DESCRIPTION =
  "Analyze PR feedback comments, classify them, and generate response drafts."

const FEEDBACK_ANALYZER_DESCRIPTION =
  "Analyze single PR comment for validity and generate response if needed."

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
      config.agent["documentation-auditor"] = {
        description: DOCUMENTATION_AUDITOR_DESCRIPTION,
        prompt: DOCUMENTATION_AUDITOR_PROMPT,
      }
      config.agent["cross-verifier"] = {
        description: CROSS_VERIFIER_DESCRIPTION,
        prompt: CROSS_VERIFIER_PROMPT,
      }
      config.agent["challenger"] = {
        description: CHALLENGER_DESCRIPTION,
        prompt: CHALLENGER_PROMPT,
      }

      config.command = config.command ?? {}
      config.command.review = {
        description: REVIEW_COMMAND_DESCRIPTION,
        template: REVIEW_COMMAND_TEMPLATE,
      }
      config.command.fix = {
        description: FIX_COMMAND_DESCRIPTION,
        template: FIX_COMMAND_TEMPLATE,
      }
      config.command["fix-report"] = {
        description: FIX_REPORT_COMMAND_DESCRIPTION,
        template: FIX_REPORT_COMMAND_TEMPLATE,
      }

      config.agent["fix-auto"] = {
        description: FIX_AUTO_DESCRIPTION,
        prompt: FIX_AUTO_PROMPT,
      }
      config.agent["feedback-analyzer"] = {
        description: FEEDBACK_ANALYZER_DESCRIPTION,
        prompt: FEEDBACK_ANALYZER_PROMPT,
      }

      config.command["analyze-feedback"] = {
        description: ANALYZE_FEEDBACK_COMMAND_DESCRIPTION,
        template: ANALYZE_FEEDBACK_COMMAND_TEMPLATE,
      }
    },
  }
}

export default AppVerkCodeReviewPlugin
