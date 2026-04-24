import { Plugin } from '@opencode-ai/plugin';

interface CreateSkillPluginOptions {
    namespace: string;
    agentName: string;
    commandName: string;
    agentDescription: string;
    commandDescription: string;
    loadSkill: (name: string) => string;
    availableSkills: readonly string[];
    moduleDirectory: string;
    mode?: "primary" | "subagent";
}
interface CreateSkillLoaderOptions {
    namespace: string;
    availableSkills: readonly string[];
    moduleDirectory: string;
}
declare function createSkillLoader(options: CreateSkillLoaderOptions): (name: string) => string;
declare function createSkillPlugin(options: CreateSkillPluginOptions): Plugin;

export { type CreateSkillLoaderOptions, type CreateSkillPluginOptions, createSkillLoader, createSkillPlugin };
