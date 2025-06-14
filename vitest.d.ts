import type { Assertion, AsymmetricMatchersContaining } from 'vitest'

interface CustomMatchers<R = unknown> {
  /**
   * Compare two `Uint8Array` arrays.
   */
  toEqualBytes: (expected: Uint8Array) => R
  toEqualResponse: (expected: Response) => Promise<R>
}

declare module 'vitest' {
  interface Matchers<R = any> extends CustomMatchers<R> {}
}
