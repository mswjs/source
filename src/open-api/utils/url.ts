export function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch (error) {
    return false
  }
}

export function joinPaths(path: string, basePath: string): string {
  const url = `${basePath}/${path}`.replace(/\/{2,}/g, '/')

  // This function accepts only relative URLs.
  return url.startsWith('/') ? url : `/${url}`
}
