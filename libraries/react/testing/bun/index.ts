import { afterAll, describe, expect, it, test } from 'bun:test'
import { toHaveAttribute } from './matchers/toHaveAttribute'
import { toHaveClass } from './matchers/toHaveClass'
import { toHaveStyle } from './matchers/toHaveStyle'
import { toHaveTextContent } from './matchers/toHaveTextContent'
import { toRaise } from './matchers/toRaise'

Object.assign(globalThis, { afterAll, describe, it, test })

import './extensions/console'
import './extensions/verbosity'

expect.extend({
  toHaveAttribute,
  toHaveClass,
  toHaveStyle,
  toHaveTextContent,
  toRaise,
})
