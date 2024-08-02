import { pointerToPath } from '@stoplight/json'

/**
 * TODO: Support remote references.
 *
 * This function is asynchronous in case we ever want to support remote
 * references.
 */
export async function dereference(
  document: any,
  root: any = null,
): Promise<any> {
  if (root === null) {
    root = document
  }

  if (Array.isArray(document)) {
    return Promise.all(
      document.map(async (item) => await dereference(item, root)),
    )
  }

  if (typeof document === 'object' && document !== null) {
    if ('$ref' in document) {
      const pointer = document['$ref']
      const path = pointerToPath(pointer)
      return path.reduce((item, key) => item[key], root)
    }

    await Promise.all(
      Object.keys(document).map(async (key) => {
        document[key] = await dereference(document[key], root)
      }),
    )

    return document
  }

  return document
}
