/* eslint-disable @basis/no-default-export --
   ambient module declarations must live in a script file and mirror the packages' default exports */
/**
 * Ambient module declarations for Babel packages that do not ship their own type definitions.
 * Only the surface used by `transformJsxDev` is declared here.
 */
declare module '@babel/generator' {
  import type { Node } from '@babel/types'

  /** Options accepted by `@babel/generator`. */
  export interface GeneratorOptions {
    /** Whether to render the output on a single line. */
    compact?: boolean,
    /** Whether to attempt to retain the original line numbers. */
    retainLines?: boolean,
  }

  /** The result of generating source code from an AST. */
  export interface GeneratorResult {
    /** The generated source code. */
    code: string,
  }

  /**
   * Generates source code from a Babel AST.
   * @param node The AST to generate from.
   * @param options The generation options.
   * @returns The generated code.
   */
  export default function generate(node: Node, options?: GeneratorOptions): GeneratorResult
}

declare module '@babel/traverse' {
  import type { CallExpression, MemberExpression, Node } from '@babel/types'

  /** A path pointing at a node within a Babel AST. */
  export interface NodePath<N extends Node = Node> {
    /** The node at this path. */
    node: N,
    /**
     * Replaces the node at this path.
     * @param node The replacement node.
     */
    replaceWith(node: Node): void,
  }

  /** A visitor keyed by the node types it handles. */
  export interface Visitor {
    /** Visits a call expression. */
    CallExpression?: (path: NodePath<CallExpression>) => void,
    /** Visits a member expression. */
    MemberExpression?: (path: NodePath<MemberExpression>) => void,
  }

  /**
   * Traverses a Babel AST with the provided visitor.
   * @param node The AST to traverse.
   * @param visitor The visitor callbacks.
   */
  export default function traverse(node: Node, visitor: Visitor): void
}
