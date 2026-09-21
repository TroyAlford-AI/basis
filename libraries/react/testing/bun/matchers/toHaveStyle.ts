type StyleMatcher = string | RegExp | Partial<CSSStyleDeclaration>

/**
 * Check if an element has specific styles.
 * @param node the node to check
 * @param styles the styles to check for
 * @returns the result of the check
 */
export function toHaveStyle(node: unknown, ...styles: StyleMatcher[]) {
  const element = node as HTMLElement

  const pass = styles.every(style => {
    if (typeof style === 'string') return element.style.cssText.includes(style)
    if (style instanceof RegExp) return style.test(element.style.cssText)
    if (typeof style === 'object') {
      return Object.entries(style)
        .every(([key, value]) => (element.style as unknown as Record<string, unknown>)[key] === value)
    }
    return false
  })

  return {
    message: () => `expected element to have styles: ${JSON.stringify(styles)}`,
    pass,
  }
}
