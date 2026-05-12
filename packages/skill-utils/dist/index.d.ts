import { Plugin } from '@opencode-ai/plugin';

/**
 * Canonical Category → Prefix mapping for the code-review and QA plugin ecosystem.
 *
 * This is the single source of truth for issue prefixes. Both the code-review
 * plugin (`/review`, `/fix`) and the QA plugin (`/run-qa`) must stay in sync
 * with this table.
 *
 * - **Owned by:** code-review plugin (defines categories and prefixes)
 * - **Consumed by:** QA plugin (produces QA-XXX issues with Category: Testing)
 *
 * When adding a new category or prefix, update this mapping and then regenerate
 * the built assets in both plugins.
 */
declare const CATEGORY_PREFIX_MAPPING: Readonly<Record<string, string>>;
/** Valid issue prefixes derived from the canonical mapping. */
declare const VALID_PREFIXES: string[];
/** Valid categories derived from the canonical mapping. */
declare const VALID_CATEGORIES: string[];

interface CreateSkillPluginOptions {
    namespace: string;
    agentName: string;
    commandName: string;
    agentDescription: string;
    commandDescription: string;
    loadSkill: ((name: string) => string) | null;
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

export { CATEGORY_PREFIX_MAPPING, type CreateSkillLoaderOptions, type CreateSkillPluginOptions, VALID_CATEGORIES, VALID_PREFIXES, createSkillLoader, createSkillPlugin };
