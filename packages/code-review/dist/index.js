// src/index.ts
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
var moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
function loadMarkdownFile(name) {
  const filePath = path.resolve(moduleDirectory, name);
  const baseDir = path.resolve(moduleDirectory, "..");
  if (!filePath.startsWith(baseDir)) {
    throw new Error("Invalid path: traversal detected");
  }
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    throw new Error(
      `Markdown asset not found: ${name} (looked in ${filePath}). Ensure the package is built so that copy-assets.mjs copies assets into dist/.`
    );
  }
}
function createLazyMarkdownLoader(name) {
  let cached;
  return () => {
    if (cached === void 0) {
      cached = loadMarkdownFile(name);
    }
    return cached;
  };
}
var AGENTS = [
  {
    name: "security-auditor",
    description: "Expert security auditor for comprehensive code security analysis including secret scanning, SAST, dependency scanning, and OWASP compliance.",
    path: "agents/security-auditor.md"
  },
  {
    name: "code-quality-auditor",
    description: "Expert code quality auditor for architecture, design patterns, SOLID/DDD compliance, and maintainability analysis.",
    path: "agents/code-quality-auditor.md"
  },
  {
    name: "documentation-auditor",
    description: "Documentation auditor that verifies code changes are reflected in project documentation.",
    path: "agents/documentation-auditor.md"
  },
  {
    name: "cross-verifier",
    description: "Cross-domain correlation agent that finds intersections between security, quality, and documentation findings.",
    path: "agents/cross-verifier.md"
  },
  {
    name: "challenger",
    description: "Adversarial review agent that challenges findings for false positives and validates severity levels.",
    path: "agents/challenger.md"
  },
  {
    name: "fix-auto",
    description: "Auto-fix subagent for code review issues. Performs analysis, implementation, verification, and reporting without user confirmation.",
    path: "agents/fix-auto.md"
  },
  {
    name: "feedback-analyzer",
    description: "Analyze single PR comment for validity and generate response if needed.",
    path: "agents/feedback-analyzer.md"
  },
  {
    name: "skill-secret-scanner",
    description: "Detects and handles sensitive information in code. Use when reviewing code for secret leaks and hard-coded credentials.",
    path: "agents/skill-secret-scanner.md"
  },
  {
    name: "skill-sast-analyzer",
    description: "Static Application Security Testing (SAST) for multi-language codebases. Uses Semgrep and language-specific tools.",
    path: "agents/skill-sast-analyzer.md"
  },
  {
    name: "skill-dependency-scanner",
    description: "Scans project dependencies for known vulnerabilities (CVEs). Supports Python, JavaScript, Go, Java, and more.",
    path: "agents/skill-dependency-scanner.md"
  },
  {
    name: "skill-architecture-analyzer",
    description: "Analyzes codebase for SOLID principles violations, DDD patterns compliance, Clean Architecture layer dependencies, and anti-patterns.",
    path: "agents/skill-architecture-analyzer.md"
  },
  {
    name: "skill-linter-integrator",
    description: "Auto-detects and runs project-specific linters, formatters, and typecheckers. Supports Python and TypeScript.",
    path: "agents/skill-linter-integrator.md"
  }
];
var COMMANDS = [
  {
    name: "review",
    description: "Perform comprehensive code review for security, performance, architecture, and maintainability.",
    path: "commands/review.md"
  },
  {
    name: "fix",
    description: "Apply fix for a single code review issue with verification and reporting.",
    path: "commands/fix.md"
  },
  {
    name: "fix-report",
    description: "Parse a saved review report, present issues as a checklist, fix selected issues, and mark them resolved.",
    path: "commands/fix-report.md"
  },
  {
    name: "analyze-feedback",
    description: "Analyze PR feedback comments, classify them, and generate response drafts.",
    path: "commands/analyze-feedback.md"
  }
];
var AppVerkCodeReviewPlugin = async () => ({
  config: async (config) => {
    config.agent ??= {};
    for (const a of AGENTS) {
      const getPrompt = createLazyMarkdownLoader(a.path);
      config.agent[a.name] = {
        description: a.description,
        get prompt() {
          return getPrompt();
        },
        mode: "subagent"
      };
    }
    config.command ??= {};
    for (const c of COMMANDS) {
      const getTemplate = createLazyMarkdownLoader(c.path);
      config.command[c.name] = {
        description: c.description,
        get template() {
          return getTemplate();
        }
      };
    }
  }
});
var index_default = AppVerkCodeReviewPlugin;
export {
  AppVerkCodeReviewPlugin,
  index_default as default
};
