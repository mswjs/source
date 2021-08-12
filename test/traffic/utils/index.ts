import * as fs from 'fs'
import { Har, Header } from 'har-format'
import { HeadersObject, headersToObject } from 'headers-utils'
import { MapEntryFn } from 'src/traffic/fromTraffic'

export function readArchive(archivePath: string): Har {
  return JSON.parse(fs.readFileSync(archivePath, 'utf8'))
}

/**
 * Normalizes requests to localhost.
 * - Replaces `127.0.0.1` with `localhost`.
 * - Removes ports to prevent request mismatches.
 */
export const normalizeLocalhost: MapEntryFn = (entry) => {
  const { request } = entry
  entry.request = {
    ...request,
    url: request.url.replace(/(127\.0\.0\.1)(:\d{4,})/, 'localhost'),
  }

  return entry
}

function toHeaders(trafficHeaders: Header[]): Headers {
  return trafficHeaders.reduce((headers, { name, value }) => {
    headers.set(name, value)
    return headers
  }, new Headers())
}

export function headersAfterMsw(trafficHeaders: Header[]): HeadersObject {
  const headers = toHeaders(trafficHeaders)

  // "Content-Encoding" header is removed when creating a request handler.
  // All responses are served uncompressed.
  headers.delete('content-encoding')

  // The custom "X-Powered-By" header is appended by the library,
  // which creates a wrong order of this header's multiple values.
  headers.append('x-powered-by', 'msw')
  const headersObject = headersToObject(headers)
  const poweredBy = headersObject['x-powered-by'] as string[]
  poweredBy.reverse()

  return headersObject
}
