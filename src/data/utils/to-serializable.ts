/**
 * Returns a JSON-serializable copy of the given value.
 *
 * Unlike `JSON.stringify`, this resolves enumerable getter properties
 * (e.g. collection relations) and omits circular references instead
 * of throwing. Circular references occur in two-way relations, such as
 * `user.posts[0].author` pointing back to `user`.
 */
export function toSerializable(
  value: unknown,
  ancestors: Set<object> = new Set(),
): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  // Omit values that reference their own ancestor (a circular reference).
  if (ancestors.has(value)) {
    return undefined
  }

  const valueWithToJson = value as { toJSON?: () => unknown }

  if (typeof valueWithToJson.toJSON === 'function') {
    return valueWithToJson.toJSON()
  }

  ancestors.add(value)

  try {
    if (Array.isArray(value)) {
      return value.map((item) => {
        const serializableItem = toSerializable(item, ancestors)

        // Mirror `JSON.stringify`, which serializes
        // non-serializable array items as `null`.
        if (serializableItem === undefined) {
          return null
        }

        return serializableItem
      })
    }

    const serializableObject: Record<string, unknown> = {}

    for (const [key, propertyValue] of Object.entries(value)) {
      const serializablePropertyValue = toSerializable(propertyValue, ancestors)

      if (serializablePropertyValue !== undefined) {
        serializableObject[key] = serializablePropertyValue
      }
    }

    return serializableObject
  } finally {
    ancestors.delete(value)
  }
}
