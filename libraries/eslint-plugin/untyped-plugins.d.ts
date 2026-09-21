/* eslint-disable @basis/no-default-export, @typescript-eslint/consistent-type-imports --
   ambient module declarations must live in a script file and mirror the plugins' default exports */
/**
 * Ambient declarations for ESLint plugins that do not ship their own type
 * definitions. Each declaration describes just enough of the plugin's default
 * export for flat-config registration: a map of rule name to rule module.
 */

declare module 'eslint-plugin-import-newlines' {
  /** Default export of `eslint-plugin-import-newlines` */
  interface ImportNewlinesPlugin {
    /** Rule modules exposed by the plugin */
    rules: Record<string, import('eslint').Rule.RuleModule>,
  }
  const plugin: ImportNewlinesPlugin
  export default plugin
}

declare module 'eslint-plugin-sort-destructure-keys' {
  /** Default export of `eslint-plugin-sort-destructure-keys` */
  interface SortDestructureKeysPlugin {
    /** Rule modules exposed by the plugin */
    rules: Record<string, import('eslint').Rule.RuleModule>,
  }
  const plugin: SortDestructureKeysPlugin
  export default plugin
}
