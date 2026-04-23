// src/index.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { tool } from "@opencode-ai/plugin";

// src/tools/load-skill.ts
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
var AVAILABLE_SKILLS = [
  "coding-standards",
  "tdd-workflow",
  "tailwind-patterns",
  "zustand-patterns",
  "tanstack-query-patterns",
  "form-patterns",
  "tanstack-router-patterns",
  "pnpm-package-manager"
];
var moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
function resolveSkillPath(name) {
  const candidates = [
    path.resolve(moduleDirectory, "skills", `${name}.md`),
    // packaged build (dist/skills/)
    path.resolve(moduleDirectory, "../src/skills", `${name}.md`),
    // from dist/ in repo (src/skills/)
    path.resolve(moduleDirectory, "../skills", `${name}.md`)
    // from src/tools/ in vitest (src/skills/)
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
function loadFrontendSkill(name) {
  if (!AVAILABLE_SKILLS.includes(name)) {
    throw new Error(
      `frontend-developer skill not found: ${name}. Available: ${AVAILABLE_SKILLS.join(", ")}`
    );
  }
  const skillPath = resolveSkillPath(name);
  if (!skillPath) {
    throw new Error(
      `frontend-developer skill file not found for: ${name}. Tried: skills/${name}.md and ../src/skills/${name}.md`
    );
  }
  return readFileSync(skillPath, "utf8");
}

// src/index.ts
var AGENT_DESCRIPTION = "Expert TypeScript + React developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.";
var COMMAND_DESCRIPTION = "TypeScript + React development workflow enforcing coding standards, TDD, and stack-specific patterns.";
var moduleDirectory2 = path2.dirname(fileURLToPath2(import.meta.url));
var packagedAgentPath = path2.resolve(moduleDirectory2, "agent-prompt.md");
var sourceAgentPath = path2.resolve(moduleDirectory2, "../src/agent-prompt.md");
var packagedCommandPath = path2.resolve(moduleDirectory2, "commands/frontend.md");
var sourceCommandPath = path2.resolve(moduleDirectory2, "../src/commands/frontend.md");
function loadFile(packaged, source) {
  const filePath = existsSync2(packaged) ? packaged : source;
  return readFileSync2(filePath, "utf8");
}
var AGENT_PROMPT = loadFile(packagedAgentPath, sourceAgentPath);
var COMMAND_TEMPLATE = loadFile(packagedCommandPath, sourceCommandPath);
var AppVerkFrontendDeveloperPlugin = async () => {
  return {
    config: async (config) => {
      config.agent = config.agent ?? {};
      config.agent["frontend-developer"] = {
        description: AGENT_DESCRIPTION,
        prompt: AGENT_PROMPT,
        mode: "primary"
      };
      config.command = config.command ?? {};
      config.command.frontend = {
        description: COMMAND_DESCRIPTION,
        template: COMMAND_TEMPLATE,
        agent: "frontend-developer"
      };
    },
    tool: {
      load_frontend_skill: tool({
        description: "Load a frontend development skill by name. Returns the full markdown content of the skill's rules and patterns.",
        args: {
          name: tool.schema.string().describe(
            "Skill name: coding-standards, tdd-workflow, tailwind-patterns, zustand-patterns, tanstack-query-patterns, form-patterns, tanstack-router-patterns, pnpm-package-manager"
          )
        },
        async execute(args) {
          return loadFrontendSkill(args.name);
        }
      })
    }
  };
};
var index_default = AppVerkFrontendDeveloperPlugin;
export {
  AppVerkFrontendDeveloperPlugin,
  index_default as default
};
