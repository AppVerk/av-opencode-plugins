// src/index.ts
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { tool } from "@opencode-ai/plugin";

// src/bash-policy.ts
var GIT_GLOBAL_OPTIONS_WITH_VALUES = /* @__PURE__ */ new Set([
  "-C",
  "-c",
  "--config-env",
  "--exec-path",
  "--git-dir",
  "--namespace",
  "--super-prefix",
  "--work-tree"
]);
function tokenizeShellCommand(command) {
  const matches = command.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|&&|\|\||[;|()]|[^\s;|()]+/g);
  return matches ?? [];
}
function normalizeToken(token) {
  if (!token) {
    return "";
  }
  if (token.startsWith('"') && token.endsWith('"') || token.startsWith("'") && token.endsWith("'")) {
    token = token.slice(1, -1);
  }
  return token.replace(/\\(.)/g, "$1");
}
function classifyGitSubcommand(command) {
  const tokens = tokenizeShellCommand(command);
  for (let index = 0; index < tokens.length; index += 1) {
    if (normalizeToken(tokens[index]) !== "git") {
      continue;
    }
    let subcommandIndex = index + 1;
    while (subcommandIndex < tokens.length) {
      const token = tokens[subcommandIndex];
      if (!token) {
        break;
      }
      if (!token.startsWith("-")) {
        break;
      }
      subcommandIndex += 1;
      if (GIT_GLOBAL_OPTIONS_WITH_VALUES.has(token) && !token.includes("=") && subcommandIndex < tokens.length) {
        subcommandIndex += 1;
      }
    }
    const subcommand = normalizeToken(tokens[subcommandIndex]);
    if (subcommand === "push") {
      return "block-push";
    }
    if (subcommand === "commit") {
      return "block-direct-commit";
    }
  }
  return "allow";
}
function classifyBashCommand(command) {
  return classifyGitSubcommand(command.trim());
}

// src/controlled-commit.ts
import { execFile } from "child_process";
import { promisify } from "util";

// src/message-policy.ts
var COMMIT_HEADER = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|release|security|i18n|config)(\([a-z0-9-]+\))?!?: .+$/i;
var DISALLOWED_FOOTERS = [/^co-authored-by:/i];
function normalizeCommitMessage(message, taskId) {
  const normalized = message.trim();
  if (!normalized) {
    throw new Error("Commit message cannot be empty.");
  }
  const lines = normalized.split(/\r?\n/);
  const header = lines[0] ?? "";
  if (!COMMIT_HEADER.test(header)) {
    throw new Error("Commit message must follow Conventional Commits.");
  }
  if (lines.some(
    (line) => DISALLOWED_FOOTERS.some((pattern) => pattern.test(line.trim()))
  )) {
    throw new Error("Co-Authored-By footers are not allowed.");
  }
  if (!taskId) {
    return normalized;
  }
  const refsFooter = `Refs: ${taskId}`;
  if (lines.some((line) => line.trim() === refsFooter)) {
    return normalized;
  }
  return `${normalized}

${refsFooter}`;
}

// src/controlled-commit.ts
var execFileAsync = promisify(execFile);
async function runGit(cwd, args) {
  try {
    const result = await execFileAsync("git", args, { cwd });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0
    };
  } catch (error) {
    const failure = error;
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      exitCode: Number(failure.code ?? 1)
    };
  }
}
async function createControlledCommit(input) {
  const repoCheck = await runGit(input.cwd, ["rev-parse", "--is-inside-work-tree"]);
  if (repoCheck.exitCode !== 0) {
    throw new Error("Current directory is not a git repository.");
  }
  const addArgs = input.files && input.files.length > 0 ? ["add", "--", ...input.files] : ["add", "-A"];
  const addResult = await runGit(input.cwd, addArgs);
  if (addResult.exitCode !== 0) {
    throw new Error(addResult.stderr.trim() || addResult.stdout.trim() || "git add failed.");
  }
  const stagedChanges = await runGit(input.cwd, ["diff", "--cached", "--quiet"]);
  if (stagedChanges.exitCode === 0) {
    throw new Error("No changes to commit.");
  }
  const commitMessage = normalizeCommitMessage(input.message, input.taskId);
  const commitResult = await runGit(input.cwd, ["commit", "-m", commitMessage]);
  if (commitResult.exitCode !== 0) {
    throw new Error(
      commitResult.stderr.trim() || commitResult.stdout.trim() || "git commit failed."
    );
  }
  const statusResult = await runGit(input.cwd, ["status", "--short"]);
  return {
    commitMessage,
    status: statusResult.stdout.trim()
  };
}

// src/index.ts
var COMMIT_COMMAND_DESCRIPTION = "Create a git commit with the AppVerk commit workflow";
var moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
var packagedCommandPath = path.resolve(moduleDirectory, "commands/commit.md");
var sourceCommandPath = path.resolve(moduleDirectory, "../src/commands/commit.md");
function loadCommitCommandTemplate() {
  try {
    return readFileSync(packagedCommandPath, "utf8");
  } catch {
    return readFileSync(sourceCommandPath, "utf8");
  }
}
function createLazyCommitTemplateLoader() {
  let cached;
  return () => {
    if (cached === void 0) {
      cached = loadCommitCommandTemplate();
    }
    return cached;
  };
}
var AppVerkCommitPlugin = async () => {
  const getCommitTemplate = createLazyCommitTemplateLoader();
  return {
    config: async (config) => {
      config.command = config.command ?? {};
      config.command.commit = {
        description: COMMIT_COMMAND_DESCRIPTION,
        get template() {
          return getCommitTemplate();
        }
      };
    },
    tool: {
      av_commit: tool({
        description: "Create a commit through the AppVerk commit workflow",
        args: {
          message: tool.schema.string().describe("The Conventional Commit message to create"),
          files: tool.schema.array(tool.schema.string()).optional().describe("Optional file paths to stage before committing"),
          taskId: tool.schema.string().optional().describe("Optional task ID appended as a Refs footer")
        },
        async execute(args, context) {
          const result = await createControlledCommit({
            cwd: context.worktree ?? context.directory,
            message: args.message,
            files: args.files ?? [],
            taskId: args.taskId
          });
          return JSON.stringify(result, null, 2);
        }
      })
    },
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") {
        return;
      }
      const command = String(output.args.command ?? "");
      const decision = classifyBashCommand(command);
      if (decision === "block-direct-commit") {
        throw new Error("Direct git commit is blocked. Use /commit instead.");
      }
      if (decision === "block-push") {
        throw new Error("git push is blocked by @appverk/opencode-commit.");
      }
    }
  };
};
var index_default = AppVerkCommitPlugin;
export {
  AppVerkCommitPlugin,
  index_default as default
};
