import type { Assertion, AsymmetricMatchersContaining } from 'vitest'

interface CustomMatchers<R = unknown> {
  /**
   * Compare two `Uint8Array` arrays.
   */
  toEqualBytes: (expected: Uint8Array) => R
  toEqualResponse: (expected: Response) => Promise<R>
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
