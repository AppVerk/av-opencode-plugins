import { AppVerkCommitPlugin } from "../packages/commit/dist/index.js"
import { AppVerkPythonDeveloperPlugin } from "../packages/python-developer/dist/index.js"
import { AppVerkCodeReviewPlugin } from "../packages/code-review/dist/index.js"
import { AppVerkFrontendDeveloperPlugin } from "../packages/frontend-developer/dist/index.js"

const defaultPluginFactories = [
  AppVerkCommitPlugin,
  AppVerkPythonDeveloperPlugin,
  AppVerkCodeReviewPlugin,
  AppVerkFrontendDeveloperPlugin,
]

function mergeTools(plugins) {
  const merged = {}

  for (const plugin of plugins) {
    for (const [name, definition] of Object.entries(plugin.tool ?? {})) {
      if (merged[name]) {
        throw new Error(`Duplicate OpenCode tool registered: ${name}`)
      }

      merged[name] = definition
    }
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

function mergeToolExecuteBefore(plugins) {
  const hooks = plugins
    .map((plugin) => plugin["tool.execute.before"])
    .filter(Boolean)

  if (hooks.length === 0) {
    return undefined
  }

  return async (...args) => {
    for (const hook of hooks) {
      await hook(...args)
    }
  }
}

function mergeToolExecuteAfter(plugins) {
  const hooks = plugins
    .map((plugin) => plugin["tool.execute.after"])
    .filter(Boolean)

  if (hooks.length === 0) {
    return undefined
  }

  return async (...args) => {
    for (const hook of hooks) {
      await hook(...args)
    }
  }
}

function mergeHook(plugins, key) {
  if (key === "tool.execute.before") {
    return mergeToolExecuteBefore(plugins)
  }

  if (key === "tool.execute.after") {
    return mergeToolExecuteAfter(plugins)
  }

  const hooks = plugins.map((plugin) => plugin[key]).filter(Boolean)

  if (hooks.length === 0) {
    return undefined
  }

  return async (...args) => {
    for (const hook of hooks) {
      await hook(...args)
    }
  }
}

export function createAppVerkPlugins(pluginFactories = defaultPluginFactories) {
  return async (context) => {
    const plugins = await Promise.all(
      pluginFactories.map((factory) => factory(context)),
    )

    const merged = {
      tool: mergeTools(plugins),
    }
    const hookKeys = new Set()

    for (const plugin of plugins) {
      for (const key of Object.keys(plugin)) {
        if (key !== "config" && key !== "tool") {
          hookKeys.add(key)
        }
      }
    }

    if (plugins.some((plugin) => plugin.config)) {
      merged.config = async (config) => {
        for (const plugin of plugins) {
          await plugin.config?.(config)
        }
      }
    }

    for (const key of hookKeys) {
      merged[key] = mergeHook(plugins, key)
    }

    return merged
  }
}

export const AppVerkPlugins = createAppVerkPlugins()

export default AppVerkPlugins
