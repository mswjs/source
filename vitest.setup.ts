import { invariant } from 'outvariant'

expect.extend({
  toEqualBytes(expected: unknown, actual: unknown) {
    invariant(isUint8Array(expected), '')
    invariant(isUint8Array(actual), '')

    if (expected.length !== actual.length) {
      return {
        pass: false,
        message: () =>
          `Expected Uint8Array of length (${expected.length}) but got (${actual.length})`,
        actual: actual.length,
        expected: expected.length,
      }
    }

    for (let i = 0; i < expected.length; i++) {
      if (actual[i] !== expected[i]) {
        return {
          pass: false,
          message: () =>
            `Expected Uint8Array to be equal but found a difference at index ${i}`,
          actual: actual[i],
          expected: expected[i],
        }
      }
    }

    return {
      pass: true,
      message: () => '...',
    }
  },
})

function isUint8Array(value: unknown): value is Uint8Array {
  return value?.constructor.name === 'Uint8Array'
}
