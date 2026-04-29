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
    name: "qa-fe-tester",
    description: "Frontend testing agent that executes FE test scenarios from a QA test plan using Playwright. Navigates pages, interacts with UI elements, verifies states, and takes screenshots on failure.",
    path: "agents/fe-tester.md"
  },
  {
    name: "qa-be-tester",
    description: "Backend testing agent that executes BE test scenarios from a QA test plan. Tests API endpoints, verifies response codes and bodies, checks database state, and handles error scenarios.",
    path: "agents/be-tester.md"
  }
];
var COMMANDS = [
  {
    name: "create-qa-plan",
    description: "Analyze code changes (PR, branch, commits) and generate a detailed QA test plan with FE and BE scenarios, edge cases, and tool detection.",
    path: "commands/create-qa-plan.md"
  },
  {
    name: "run-qa",
    description: "Execute a QA test plan \u2014 launch FE and BE testing agents, collect results, and generate a report with QA-XXX issue IDs.",
    path: "commands/run-qa.md"
  }
];
var AppVerkQAPlugin = async () => ({
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
var index_default = AppVerkQAPlugin;
export {
  AppVerkQAPlugin,
  index_default as default
};
