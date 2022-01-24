export function toBase64(value: string): string {
  return typeof Buffer === 'undefined'
    ? btoa(value)
    : Buffer.from(value).toString('base64')
}
