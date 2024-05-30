import * as fs from 'fs'
import * as Har from 'har-format'
import { MapEntryFunction } from '../../../src/traffic/from-traffic.js'

export function readArchive(archivePath: string): Har.Har {
  return JSON.parse(fs.readFileSync(archivePath, 'utf8'))
}

/**
 * Normalizes requests to localhost.
 * - Replaces `127.0.0.1` with `localhost`.
 * - Removes ports to prevent request mismatches.
 */
export const normalizeLocalhost: MapEntryFunction = (entry) => {
  const url = new URL(entry.request.url)
  // Disregard the original request host so we can always
  // assert against "localhost" in tests.
  url.host = 'localhost'
  // Disregard the original port for the same reason.
  url.port = ''
  entry.request.url = url.href
  return entry
}

export function _toHeaders(
  trafficHeaders: Array<Har.Header>,
): Array<[string, string]> {
  const headers: Array<[string, string]> = []

  for (const header of trafficHeaders) {
    headers.push([header.name.toLowerCase(), header.value])
  }

  // Sort the headers alphabetically so their order
  // doesn't matter when asserting in test.
  headers.sort()

  return headers
}

function toHeaders(trafficHeaders: Array<Har.Header>): Headers {
  return trafficHeaders.reduce((headers, { name, value }) => {
    headers.set(name, value)
    return headers
  }, new Headers())
}

export function headersAfterMsw(
  trafficHeaders: Array<Har.Header>,
): Record<string, unknown> {
  const headers = toHeaders(trafficHeaders)

  // "Content-Encoding" header is removed when creating a request handler.
  // All responses are served uncompressed.
  headers.delete('content-encoding')

  // The custom "X-Powered-By" header is appended by the library,
  // which creates a wrong order of this header's multiple values.
  headers.append('x-powered-by', 'msw')
  const headersObject = Object.fromEntries(headers.entries())
  const poweredBy = headersObject['x-powered-by']
  const poweredByList = Array.isArray(poweredBy)
    ? poweredBy
    : poweredBy.split(', ')

  poweredByList.reverse()
  headersObject['x-powered-by'] = poweredByList.join(', ')

  return headersObject
}
