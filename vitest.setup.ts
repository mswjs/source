import { invariant } from 'outvariant'

expect.extend({
  toEqualBytes(actual: unknown, expected: unknown) {
    invariant(isUint8Array(actual), 'Expected actual to be a Uint8Array')
    invariant(isUint8Array(expected), 'Expected expected to be a Uint8Array')

    if (actual.length !== expected.length) {
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
  async toEqualResponse(actual: Response, expected: Record<string, unknown>) {
    invariant(
      actual instanceof Response,
      'Expected actual to be an instance of Response',
    )
    invariant(
      expected instanceof Response,
      'Expected expected to be an instance of Response',
    )

    // Status code.
    if (actual.status !== expected.status) {
      return {
        pass: false,
        message: () => 'Response status codes are not equal',
        actual: actual.status,
        expected: expected.status,
      }
    }

    // Headers.
    if (
      !this.equals(Array.from(actual.headers), Array.from(expected.headers))
    ) {
      return {
        pass: false,
        message: () => 'Response headers are not equal',
        actual: Array.from(actual.headers),
        expected: Array.from(expected.headers),
      }
    }

    // Body.
    const actualBody = await actual.text()
    const expectedBody = await expected.text()
    if (actualBody !== expectedBody) {
      return {
        pass: false,
        message: () => 'Response bodies are not equal',
        actual: actualBody,
        expected: expectedBody,
      }
    }

    return {
      pass: true,
      message: () => 'Responses are equal',
    }
  },
})

function isUint8Array(value: unknown): value is Uint8Array {
  return value?.constructor.name === 'Uint8Array'
}
