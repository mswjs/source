import { OpenAPIV2, OpenAPI } from 'openapi-types'

/**
 * Returns the list of servers specified in the given OpenAPI document.
 */
export function getServers(
  document: OpenAPI.Document | OpenAPIV2.Document,
): Array<string> {
  if ('basePath' in document && typeof document.basePath !== 'undefined') {
    return [document.basePath]
  }

  if ('servers' in document && typeof document.servers !== 'undefined') {
    return document.servers.map((server) => server.url)
  }

  return ['/']
}
