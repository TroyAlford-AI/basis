import { describe, expect, test } from 'bun:test'
import { decode, encode } from './encode'

const VALUES: [unknown, `H-${string}`][] = [
  [1, 'H-MQ'],
  [2, 'H-Mg'],
  [3, 'H-Mw'],
  [[1, 2, 3, 'a', 'b', 'c'], 'H-WzEsMiwzLCJhIiwiYiIsImMiXQ'],
  ['hello', 'H-ImhlbGxvIg'],
  [true, 'H-dHJ1ZQ'],
  [false, 'H-ZmFsc2U'],
  [{ a: 1, b: 2 }, 'H-eyJhIjoxLCJiIjoyfQ'],
]

const NULLS: [null | undefined, null][] = [
  [null, null],
  [undefined, null],
]

describe('encode/decode', () => {
  test.each(VALUES)('handles %p', (value, expected) => {
    expect(encode(value)).toEqual(expected)
    expect(decode<unknown>(expected)).toEqual(value)
  })

  test.each(NULLS)('should return null for %p', (value, expected) => {
    expect(encode(value)).toEqual(expected)
  })
})
