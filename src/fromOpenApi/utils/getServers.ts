import { OpenAPIV2, OpenAPIV3 } from 'openapi-types'

/**
 * Returns the list of servers where the given specification
 * can be hosted.
 */
export function getServers(
  specification: OpenAPIV2.Document | OpenAPIV3.Document,
): string[] {
  if (
    'basePath' in specification &&
    typeof specification.basePath !== 'undefined'
  ) {
    return [specification.basePath]
  }

  if (
    'servers' in specification &&
    typeof specification.servers !== 'undefined'
  ) {
    return specification.servers.map((server) => server.url)
  }

  return ['/']
}
