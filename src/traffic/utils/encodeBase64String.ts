export function encodeBase64String(data: string): Uint8Array {
  const binaryString = btoa(data)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(binaryString)
  return bytes
}
