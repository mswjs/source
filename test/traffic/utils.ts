import fetch from 'cross-fetch'
import { Har, Header } from 'har-format'
import { HeadersObject, headersToObject } from 'headers-utils'

const { withHar, createHarLog } = require('node-fetch-har')

export async function emulateNetwork(
  getRequests: (makeRequest: typeof fetch) => Promise<Response>[],
): Promise<Har> {
  const har = createHarLog() as Har
  const makeRequest = withHar(fetch, { har }) as typeof fetch
  await Promise.all(getRequests(makeRequest))
  return har
}

function toHeaders(trafficHeaders: Header[]): Headers {
  return trafficHeaders.reduce((headers, { name, value }) => {
    headers.set(name, value)
    return headers
  }, new Headers())
}

export function headersAfterMsw(trafficHeaders: Header[]): HeadersObject {
  const headers = toHeaders(trafficHeaders)
  headers.append('x-powered-by', 'msw')
  const headersObject = headersToObject(headers)

  /**
   * @note Compenstate for the order of the "x-powered-by" response header:
   * - Actual: ["msw", "Express"]
   * - Expected: ["Express", "msw'"]
   * There is no way to prepend the header, only append.
   */
  const poweredBy = headersObject['x-powered-by'] as string[]
  poweredBy.reverse()

  return headersObject
}
