export function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
  if (bytes1.length !== bytes2.length) {
    return false
  }

  for (let i = 0; i < bytes1.length; i++) {
    if (bytes1[i] !== bytes2[i]) {
      return false
    }
  }

  return true
}
