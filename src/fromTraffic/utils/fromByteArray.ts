export function fromByteArray(bytes: Uint8Array) {
  const decoder = new TextDecoder().decode(bytes)
  return decoder.toString()
}
