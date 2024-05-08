import { invariant } from 'outvariant'
import { Har, Entry, Request, Response } from 'har-format'
import { Cookie, parse } from 'set-cookie-parser'
import {
  RestHandler,
  rest,
  context,
  ResponseFunction,
  ResponseTransformer,
  ResponseComposition,
  DefaultBodyType,
  cleanUrl,
} from 'msw'
import { decodeBase64String } from './utils/decodeBase64String'

export type MapEntryFn = (entry: Entry) => Entry | undefined

type ResponseProducer = (
  response: ResponseComposition<DefaultBodyType>,
  transformers: ResponseTransformer<DefaultBodyType>[],
) => ReturnType<ResponseFunction>

const defaultResponseProducer: ResponseProducer = (response, transformers) => {
  return response(...transformers)
}

/**
 * Create a request handler from the given Network Archive entry.
 */
function toRequestHandler(
  entry: Entry,
  produceResponse: ResponseProducer = defaultResponseProducer,
): RestHandler {
  const { request } = entry
  const method = request.method.toLowerCase() as keyof typeof rest
  const transformers = toResponseTransformers(entry)

  return rest[method](cleanUrl(request.url), (_, response) => {
    return produceResponse(response, transformers)
  })
}

/**
 * Map a traffic entry to the array of response transformers.
 */
export function toResponseTransformers(entry: Entry): ResponseTransformer[] {
  const { response, time } = entry

  const transformers: ResponseTransformer[] = []
  const responseHeaders = new Headers()
  const responseCookies: Cookie[] = []

  // Response status and status text.
  transformers.push(context.status(response.status, response.statusText))

  // Response headers.
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

  transformers.push(context.set(Object.fromEntries(responseHeaders.entries())))

  // Response cookies.
  for (const cookie of responseCookies) {
    const { name, value, ...options } = cookie

    transformers.push(
      context.cookie(name, value, {
        ...options,
        sameSite: options.sameSite === '',
      }),
    )
  }

  // Response delay.
  if (time) {
    transformers.push(context.delay(time))
  }

  // Response body.
  const responseBody = toResponseBody(response)

  if (responseBody) {
    transformers.push(context.body(responseBody))
  }

  return transformers
}

/**
 * Extract a response body from the given HAR response entry.
 * Decodes any base64-encoded text response bodies.
 */
export function toResponseBody(
  response: Response,
): Uint8Array | string | undefined {
  const { text, encoding, mimeType } = response.content

  if (!text) {
    return
  }

  if (encoding === 'base64' && mimeType.includes('text')) {
    return decodeBase64String(text)
  }

  return text
}

/**
 * Generate request handlers from the given HAR file.
 */
export function fromTraffic(
  har: Har,
  mapEntry?: MapEntryFn,
): Array<RestHandler> {
  invariant(
    har,
    'Failed to generate request handlers from traffic: expected an HAR object but got %s.',
    typeof har,
  )

  invariant(
    har.log.entries.length > 0,
    'Failed to generate request handlers from traffic: given HAR object has no entries.',
  )

  const requestIds = new Set<string>()

  const handlers = har.log.entries.reduceRight<RestHandler[]>(
    (handlers, entry) => {
      const resolvedEntry = mapEntry ? mapEntry(entry) : entry

      if (!resolvedEntry) {
        return handlers
      }

      const requestId = createRequestId(resolvedEntry.request)
      const isUniqueHandler = !requestIds.has(requestId)

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
      requestIds.add(requestId)

      return handlers
    },
    [],
  )

  return handlers
}

function createRequestId(request: Request): string {
  return `${request.method}+${request.url}`
}
