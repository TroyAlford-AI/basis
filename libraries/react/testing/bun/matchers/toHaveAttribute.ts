interface ReturnType { message: () => string, pass: boolean }

/**
 * Check if an element has an attribute with a specific value.
 * @param node the node to check
 * @param name the name of the attribute
 * @param value the value of the attribute
 * @returns the result of the check
 */
export function toHaveAttribute(
  node: unknown,
  name: string,
  value?: string | RegExp,
): ReturnType {
  const element = node as HTMLElement | null
  if (!element) {
    return {
      message: () => 'expected element to exist but received null',
      pass: false,
    }
  }

  const actual = element.getAttribute(name)
  let message = ''
  let pass: boolean

  if (value === undefined) {
    message = `expected element to have attribute ${name}`
    pass = actual !== null
  } else if (value instanceof RegExp) {
    message = `expected ${actual} to equal ${value}`
    pass = value.test(actual as string)
  } else {
    message = `expected ${actual} to equal ${value}`
    pass = actual === value
  }

  return { message: () => message, pass }
}
