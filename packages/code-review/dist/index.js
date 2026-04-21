// src/index.ts
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
var moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
function loadMarkdownFile(name) {
  const packagedPath = path.resolve(moduleDirectory, name);
  const sourcePath = path.resolve(moduleDirectory, "../src", name);
  const filePath = existsSync(packagedPath) ? packagedPath : sourcePath;
  return readFileSync(filePath, "utf8");
}
var SECURITY_AUDITOR_PROMPT = loadMarkdownFile("agents/security-auditor.md");
var CODE_QUALITY_AUDITOR_PROMPT = loadMarkdownFile("agents/code-quality-auditor.md");
var REVIEW_COMMAND_TEMPLATE = loadMarkdownFile("commands/review.md");
var SECURITY_AUDITOR_DESCRIPTION = "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance.";
var CODE_QUALITY_AUDITOR_DESCRIPTION = "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis.";
var REVIEW_COMMAND_DESCRIPTION = "Perform comprehensive code review for security, performance, architecture, and maintainability.";
var AppVerkCodeReviewPlugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {};
      config.agent["security-auditor"] = {
        description: SECURITY_AUDITOR_DESCRIPTION,
        prompt: SECURITY_AUDITOR_PROMPT
      };
      config.agent["code-quality-auditor"] = {
        description: CODE_QUALITY_AUDITOR_DESCRIPTION,
        prompt: CODE_QUALITY_AUDITOR_PROMPT
      };
      config.command = config.command ?? {};
      config.command.review = {
        description: REVIEW_COMMAND_DESCRIPTION,
        template: REVIEW_COMMAND_TEMPLATE
      };
    }
  };
};
var index_default = AppVerkCodeReviewPlugin;
export {
  AppVerkCodeReviewPlugin,
  index_default as default
};
