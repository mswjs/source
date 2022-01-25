export function toString(value: unknown): string {
  return typeof value !== 'string' ? JSON.stringify(value) : value
}
