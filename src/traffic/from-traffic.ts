import { invariant } from 'outvariant'
import type Har from 'har-format'
import { RequestHandler, HttpHandler, cleanUrl, delay } from 'msw'
import { matchesQueryParameters, toResponse } from './utils/har-utils.js'

export type MapEntryFunction = (entry: Har.Entry) => Har.Entry | undefined

/**
 * Generate request handlers from the given
 * network archive (HAR) file.
 *
 * @example
 * import har from './traffic.har'
 * fromTraffic(har)
 */
export function fromTraffic(
  archive: Har.Har,
  mapEntry?: MapEntryFunction,
): Array<RequestHandler> {
  invariant(
    archive,
    'Failed to generate request handlers from traffic: expected an HAR object but got %s.',
    typeof archive,
  )

  invariant(
    archive.log.entries.length > 0,
    'Failed to generate request handlers from traffic: given HAR object has no entries.',
  )

  const requestIds = new Set<string>()
  const handlers: Array<RequestHandler> = []

  // Loop over the HAR entries from right to left.
  for (let i = archive.log.entries.length - 1; i >= 0; i--) {
    const rawEntry = archive.log.entries[i]
    if (!rawEntry) {
      continue
    }

    const entry = mapEntry ? mapEntry(rawEntry) : rawEntry
    if (!entry) {
      continue
    }

    const { request } = entry
    const requestId = createRequestId(request)
    const isUniqueHandler = !requestIds.has(requestId)
    const method = request.method.toLowerCase()
    const queryParameters = fromQueryParameters(entry.request.queryString ?? [])
    const path = cleanUrl(request.url)
    const response = toResponse(entry.response)

    const handler = new HttpHandler(
      method,
      path,
      async ({ request, requestId }) => {
        // If the recorded request has query parameters and the
        // intercepted request doesn't match them all, skip it.
        if (
          request.url &&
          !matchesQueryParameters(request.url, queryParameters)
        ) {
          return
        }

        if (entry.time) {
          await delay(entry.time)
        }

        return response
      },
      {
        once: !isUniqueHandler,
      },
    )

    // Prepend the handler to the list of handler because we're reducing
    // from right to left, but the order of handlers must correspond
    // to the chronological order of requests.
    handlers.unshift(handler)
    requestIds.add(requestId)
  }

  return handlers
}

function createRequestId(request: Har.Request): string {
  return `${request.method}+${request.url}`
}

function fromQueryParameters(
  input: Array<{ name: string; value: string }>,
): URLSearchParams {
  const params = new URLSearchParams()
  for (const param of input) {
    params.append(param.name, param.value)
  }
  return params
}
