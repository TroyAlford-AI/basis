/**
 * Check if a node has a class
 * @param node the node to check
 * @param classes the classes to check for
 * @returns the result of the check
 */
export function toHaveClass(node: unknown, ...classes: string[]) {
  const element = node as HTMLElement

  return {
    message: () => `expected ${element.className} to include ${classes.join(' ')}`,
    pass: classes.every(className => element.classList.contains(className)),
  }
}
