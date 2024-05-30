const encoder = new TextEncoder()

export function encodeBase64String(data: string): Uint8Array {
  return encoder.encode(btoa(data))
}

export function decodeBase64String(data: string): Uint8Array {
  return encoder.encode(atob(data))
}
