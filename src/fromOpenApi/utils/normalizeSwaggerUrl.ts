export function normalizeSwaggerUrl(url: string): string {
  return (
    url
      // Replace OpenAPI style parameters (/pet/{petId})
      // with the common path parameters (/pet/:petId).
      .replace(/\{(.+?)\}/g, ':$1')
  )
}
