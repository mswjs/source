import { pointerToPath } from '@stoplight/json'

/**
 * TODO: Support remote references.
 *
 * This function is asynchronous in case we ever want to support remote
 * references.
 */
export async function dereference(document: unknown, root?: any): Promise<any> {
  if (root == null) {
    root = document
  }

  if (Array.isArray(document)) {
    return Promise.all(
      document.map(async (item) => await dereference(item, root)),
    )
  }

  if (typeof document === 'object' && document !== null) {
    if ('$ref' in document && typeof document['$ref'] === 'string') {
      const visited = new Set<string>()
      let resolved: any = document
      while (
        resolved !== null &&
        typeof resolved === 'object' &&
        '$ref' in resolved &&
        typeof resolved['$ref'] === 'string'
      ) {
        const ref = resolved['$ref']
        if (visited.has(ref)) {
          throw new Error(
            `Failed to dereference document: circular $ref chain detected (${[
              ...visited,
              ref,
            ].join(' -> ')})`,
          )
        }
        visited.add(ref)
        const path = pointerToPath(ref)
        resolved = path.reduce((item, key) => item[key], root)
      }
      return dereference(resolved, root)
    }

    await Promise.all(
      Object.keys(document).map(async (key) => {
        Reflect.set(
          document,
          key,
          await dereference(Reflect.get(document, key), root),
        )
      }),
    )

    return document
  }

  return document
}
