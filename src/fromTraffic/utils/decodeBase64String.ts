import { Buffer } from 'buffer'

export function decodeBase64String(text: string): Uint8Array {
  return Uint8Array.from(
    Buffer.from(text, 'base64').toString('binary'),
    (char) => char.charCodeAt(0),
  )
}
