/**
 * Check if an element contains specific text content.
 * @param node the node to check
 * @param text the text content to check for
 * @returns the result of the check
 */
export function toHaveTextContent(node: unknown, text: string | RegExp) {
  const element = node as HTMLElement

  const actual = element.textContent || ''
  const pass = text instanceof RegExp ? text.test(actual) : actual.includes(text)
  return {
    message: () => `expected ${actual} to include ${text}`,
    pass,
  }
}
