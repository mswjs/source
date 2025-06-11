export function normalizeSwaggerPath<T extends string>(path: T) {
  return (
    path
      // Replace OpenAPI style parameters (/pet/{petId})
      // with the common path parameters (/pet/:petId).
      .replace(/\{(.+?)\}/g, ':$1')
  )
}
