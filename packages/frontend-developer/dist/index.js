// src/index.ts
import { readFileSync as readFileSync2 } from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { tool } from "@opencode-ai/plugin";

// src/tools/load-skill.ts
import { readFileSync } from "fs";
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
var skillCache = /* @__PURE__ */ new Map();
function loadSkillContent(name) {
  const candidates = [
    path.resolve(moduleDirectory, "skills", `${name}.md`),
    // packaged build (dist/skills/)
    path.resolve(moduleDirectory, "../src/skills", `${name}.md`),
    // from dist/ in repo (src/skills/)
    path.resolve(moduleDirectory, "../skills", `${name}.md`)
    // from src/tools/ in vitest (src/skills/)
  ];
  for (const candidate of candidates) {
    try {
      return readFileSync(candidate, "utf8");
    } catch {
    }
  }
  throw new Error(`frontend-developer skill file not found for: ${name}`);
}
function loadFrontendSkill(name) {
  if (!AVAILABLE_SKILLS.includes(name)) {
    throw new Error(
      `frontend-developer skill not found: ${name}. Available: ${AVAILABLE_SKILLS.join(", ")}`
    );
  }
  if (skillCache.has(name)) {
    return skillCache.get(name);
  }
  const content = loadSkillContent(name);
  skillCache.set(name, content);
  return content;
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
  try {
    return readFileSync2(packaged, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        return readFileSync2(source, "utf8");
      } catch {
        throw new Error("Failed to load plugin template");
      }
    }
    throw new Error("Failed to load plugin template");
  }
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
