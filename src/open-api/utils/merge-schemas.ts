function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function mergeSchemas(target: unknown, source: unknown): unknown {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return source
  }

  const result: Record<string, unknown> = { ...target }

  for (const key of Object.keys(source)) {
    const targetVal = result[key]
    const sourceVal = source[key]

    if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      result[key] = [...new Set([...targetVal, ...sourceVal])]
    } else if (isPlainObject(targetVal) && isPlainObject(sourceVal)) {
      result[key] = mergeSchemas(targetVal, sourceVal)
    } else {
      result[key] = sourceVal
    }
  }

  return result
}
