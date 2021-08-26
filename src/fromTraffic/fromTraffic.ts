import { invariant } from 'outvariant'
import { Har, Entry, Request } from 'har-format'
import { Cookie, parse } from 'set-cookie-parser'
import { Headers, headersToObject } from 'headers-utils'
import {
  RestHandler,
  rest,
  context,
  ResponseFunction,
  ResponseTransformer,
  ResponseComposition,
} from 'msw'

export type MapEntryFn = (entry: Entry) => Entry
type ResponseProducer = (
  res: ResponseComposition<unknown>,
  transformers: ResponseTransformer<unknown>[],
) => ReturnType<ResponseFunction>

const defaultResponseProducer: ResponseProducer = (res, transformers) => {
  return res(...transformers)
}

/**
 * Creates a request handler from the given Network Archive entry.
 */
function toRequestHandler(
  entry: Entry,
  produceResponse: ResponseProducer = defaultResponseProducer,
): RestHandler {
  const transformers: ResponseTransformer[] = []
  const { request, response, time } = entry
  const method = request.method.toLowerCase() as keyof typeof rest

  const responseHeaders: Headers = new Headers()
  const responseCookies: Cookie[] = []

  // Response status and status text.
  transformers.push(context.status(response.status, response.statusText))

  // Response headers and cookies.
  for (const header of response.headers) {
    const headerName = header.name.toLowerCase()

    // Skip response cookie headers because a mocked response cookies
    // are not implemented through headers (security consideration).
    // Store the list of cookie headers to apply them via `ctx.cookie` later.
    if (['set-cookie', 'set-cookie2'].includes(headerName)) {
      responseCookies.push(...parse(header.value))
      continue
    }

    // Skip the "Content-Encoding" header to prevent "incorrect header check" errors.
    // MSW must not attempt to compress the response body, even if it was originally
    // compressed. All response bodies are sent uncompressed.
    if (headerName === 'content-encoding') {
      continue
    }

    responseHeaders.set(header.name, header.value)
  }

  transformers.push(context.set(headersToObject(responseHeaders)))

  // Response cookies.
  if (responseCookies.length > 0) {
    responseCookies.forEach((cookie) => {
      const { name, value, ...cookieOptions } = cookie
      transformers.push(
        context.cookie(name, value, {
          ...cookieOptions,
          sameSite: cookieOptions.sameSite === '',
        }),
      )
    })
  }

  // Response time.
  const responseTime = time || 0
  transformers.push(context.delay(responseTime))

  // Response body.
  const { text: responseBody } = response.content

  if (responseBody) {
    transformers.push(context.body(responseBody))
  }

  return rest[method](request.url, (req, res) => {
    return produceResponse(res, transformers)
  })
}

/**
 * Generates request handlers from the given HAR file.
 */
export function fromTraffic(har: Har, mapEntry?: MapEntryFn): RestHandler[] {
  invariant(
    har,
    'Failed to generate request handler from traffic: expected an HAR but got %s',
    typeof har,
  )

  invariant(
    har.log.entries.length > 0,
    'Failed to generate request handlers from traffic: given HAR file has no entries.',
  )

  const requestPaths = new Set<string>()

  const handlers = har.log.entries.reduceRight<RestHandler[]>(
    (handlers, entry) => {
      const resolvedEntry = mapEntry?.(entry) || entry
      const requestPath = createRequestPath(resolvedEntry.request)
      const isUniqueHandler = !requestPaths.has(requestPath)

      const handler = toRequestHandler(resolvedEntry, (res, transformers) => {
        // Reducing the entries from right to left implies that the first
        // entry we meet is, in fact, the last entry recorded.
        // Always create a regular handler for the last entry.
        // If there are any consecutive entries for the same URL,
        // create a one-time handler instead to preserve response order.
        const responseFn = isUniqueHandler ? res : res.once
        return responseFn(...transformers)
      })

      // Prepend the handler to the list of handler because we're reducing
      // from right to left, but the order of handlers must correspond
      // to the chronological order of requests.
      handlers.unshift(handler)
      requestPaths.add(requestPath)

      return handlers
    },
    [],
  )

  return handlers
}

function createRequestPath(request: Request): string {
  return `${request.method}+${request.url}`
}
