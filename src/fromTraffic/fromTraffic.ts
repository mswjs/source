import { invariant } from 'outvariant'
import { Har, Entry, Request, Response } from 'har-format'
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
import { decodeBase64String } from './utils/decodeBase64String'

export type MapEntryFn = (entry: Entry) => Entry | undefined

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

  const applyTransformers = (
    ...nextTransformers: Array<ResponseTransformer | undefined>
  ): void => {
    transformers.push(
      ...(nextTransformers.filter(Boolean) as ResponseTransformer[]),
    )
  }

  // Response status and status text.
  applyTransformers(context.status(response.status, response.statusText))

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

  applyTransformers(context.set(headersToObject(responseHeaders)))

  // Response cookies.
  if (responseCookies.length > 0) {
    responseCookies.forEach((cookie) => {
      const { name, value, ...cookieOptions } = cookie

      applyTransformers(
        context.cookie(name, value, {
          ...cookieOptions,
          sameSite: cookieOptions.sameSite === '',
        }),
      )
    })
  }

  // Response time.
  const responseTime = time || 0
  applyTransformers(context.delay(responseTime))

  // Response body.
  const responseBody = toResponseBody(response)
  applyTransformers(responseBody ? context.body(responseBody) : undefined)

  return rest[method](request.url, (req, res) => {
    return produceResponse(res, transformers)
  })
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
    const responseBody = decodeBase64String(text)
    return responseBody
  }

  return text
}

/**
 * Generates request handlers from the given HAR file.
 */
export function fromTraffic(har: Har, mapEntry?: MapEntryFn): RestHandler[] {
  invariant(
    har,
    'Failed to generate request handlers from traffic: expected an HAR object but got %s.',
    typeof har,
  )

  invariant(
    har.log.entries.length > 0,
    'Failed to generate request handlers from traffic: given HAR object has no entries.',
  )

  const requestPaths = new Set<string>()

  const handlers = har.log.entries.reduceRight<RestHandler[]>(
    (handlers, entry) => {
      const resolvedEntry = mapEntry ? mapEntry(entry) : entry

      if (!resolvedEntry) {
        return handlers
      }

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
