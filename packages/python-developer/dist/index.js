// src/index.ts
import path3 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// ../skill-utils/dist/index.js
import { readFileSync } from "fs";
import path from "path";
import { tool } from "@opencode-ai/plugin";
function loadFile(packaged, source) {
  try {
    return readFileSync(packaged, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      try {
        return readFileSync(source, "utf8");
      } catch (innerError) {
        throw new Error(
          `Failed to load plugin template. Attempted paths: ${packaged}, ${source}. Original error: ${innerError.message}`,
          { cause: innerError }
        );
      }
    }
    throw new Error(
      `Failed to load plugin template. Attempted path: ${packaged}. Original error: ${error.message}`,
      { cause: error }
    );
  }
}
function createLazyFileLoader(packaged, source) {
  let cached;
  return () => {
    if (cached === void 0) {
      cached = loadFile(packaged, source);
    }
    return cached;
  };
}
function createSkillLoader(options) {
  const { namespace, availableSkills, moduleDirectory: moduleDirectory3 } = options;
  const skillCache = /* @__PURE__ */ new Map();
  function loadSkillContent(name) {
    const candidates = [
      path.resolve(moduleDirectory3, "skills", `${name}.md`),
      // packaged build (dist/skills/)
      path.resolve(moduleDirectory3, "../src/skills", `${name}.md`),
      // from dist/ in repo (src/skills/)
      path.resolve(moduleDirectory3, "../skills", `${name}.md`)
      // from src/tools/ in vitest (src/skills/)
    ];
    let lastError;
    for (const candidate of candidates) {
      try {
        return readFileSync(candidate, "utf8");
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`${namespace} skill file not found for: ${name}`, { cause: lastError });
  }
  return function loadSkill(name) {
    if (!availableSkills.includes(name)) {
      throw new Error(
        `${namespace} skill not found: ${name}. Available: ${availableSkills.join(", ")}`
      );
    }
    if (skillCache.has(name)) {
      return skillCache.get(name);
    }
    const content = loadSkillContent(name);
    skillCache.set(name, content);
    return content;
  };
}
function createSkillPlugin(options) {
  const {
    namespace,
    agentName,
    commandName,
    agentDescription,
    commandDescription,
    loadSkill,
    availableSkills,
    moduleDirectory: moduleDirectory3,
    mode = "primary"
  } = options;
  const packagedAgentPath = path.resolve(moduleDirectory3, "agent-prompt.md");
  const sourceAgentPath = path.resolve(moduleDirectory3, "../src/agent-prompt.md");
  const packagedCommandPath = path.resolve(
    moduleDirectory3,
    `commands/${commandName}.md`
  );
  const sourceCommandPath = path.resolve(
    moduleDirectory3,
    `../src/commands/${commandName}.md`
  );
  const getAgentPrompt = createLazyFileLoader(packagedAgentPath, sourceAgentPath);
  const getCommandTemplate = createLazyFileLoader(
    packagedCommandPath,
    sourceCommandPath
  );
  return async () => ({
    config: async (config) => {
      config.agent = config.agent ?? {};
      config.agent[agentName] = {
        description: agentDescription,
        get prompt() {
          return getAgentPrompt();
        },
        mode
      };
      config.command = config.command ?? {};
      config.command[commandName] = {
        description: commandDescription,
        get template() {
          return getCommandTemplate();
        },
        agent: agentName
      };
    },
    tool: {
      [`load_${namespace}_skill`]: tool({
        description: `Load a ${namespace} development skill by name. Returns the full markdown content of the skill's rules and patterns.`,
        args: {
          name: tool.schema.string().describe(`Skill name: ${availableSkills.join(", ")}`)
        },
        async execute(args) {
          return loadSkill(args.name);
        }
      })
    }
  });
}

// src/tools/load-skill.ts
import path2 from "path";
import { fileURLToPath } from "url";
var moduleDirectory = path2.dirname(fileURLToPath(import.meta.url));
var loadPythonSkill = createSkillLoader({
  namespace: "python-developer",
  availableSkills: [
    "coding-standards",
    "tdd-workflow",
    "fastapi-patterns",
    "sqlalchemy-patterns",
    "pydantic-patterns",
    "async-python-patterns",
    "uv-package-manager",
    "django-web-patterns",
    "django-orm-patterns",
    "celery-patterns"
  ],
  moduleDirectory
});

// src/index.ts
var moduleDirectory2 = path3.dirname(fileURLToPath2(import.meta.url));
var AppVerkPythonDeveloperPlugin = createSkillPlugin({
  namespace: "python",
  agentName: "python-developer",
  commandName: "python",
  agentDescription: "Expert Python developer enforcing AppVerk coding standards, TDD workflow, and stack-specific patterns.",
  commandDescription: "Python development workflow enforcing coding standards, TDD, and stack-specific patterns.",
  loadSkill: loadPythonSkill,
  availableSkills: [
    "coding-standards",
    "tdd-workflow",
    "fastapi-patterns",
    "sqlalchemy-patterns",
    "pydantic-patterns",
    "async-python-patterns",
    "uv-package-manager",
    "django-web-patterns",
    "django-orm-patterns",
    "celery-patterns"
  ],
  moduleDirectory: moduleDirectory2
});
var index_default = AppVerkPythonDeveloperPlugin;
export {
  AppVerkPythonDeveloperPlugin,
  index_default as default
};
