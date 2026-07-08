export function getValueAtPath(target: unknown, path: Array<string>): unknown {
  let currentValue = target

  for (const segment of path) {
    if (currentValue == null || typeof currentValue !== 'object') {
      return undefined
    }

    currentValue = (currentValue as Record<string, unknown>)[segment]
  }

  return currentValue
}
