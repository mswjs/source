export function decodeBase64String(data: string): Uint8Array {
  const binaryString = atob(data)
  const encoder = new TextEncoder()
  const bytes = encoder.encode(binaryString)
  return bytes
}
