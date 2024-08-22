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
      const path = pointerToPath(document['$ref'])
      return path.reduce((item, key) => item[key], root)
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
