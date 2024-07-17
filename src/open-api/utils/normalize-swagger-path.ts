export function normalizeSwaggerPath(path: string): string {
  return (
    path
      // Replace OpenAPI style parameters (/pet/{petId})
      // with the common path parameters (/pet/:petId).
      .replace(/\{(.+?)\}/g, ':$1')
  )
}
