import { invariant } from 'outvariant'
import { Har, Entry } from 'har-format'
import { Cookie, parse } from 'set-cookie-parser'
import { Headers, headersToObject } from 'headers-utils'
import { RestHandler, rest, context, ResponseTransformer } from 'msw'

export type MapEntryFn = (entry: Entry) => Entry

function toRequestHandler(entry: Entry): RestHandler {
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

    if (['set-cookie', 'set-cookie2'].includes(headerName)) {
      responseCookies.push(...parse(header.value))
      continue
    }

    if (headerName === 'content-encoding') {
      continue
    }

    responseHeaders.set(header.name, header.value)
  }

  transformers.push(context.set(headersToObject(responseHeaders)))

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
    /**
     * @todo Convert all response bodies to Buffer.
     * That way both buffer and non-buffer bodies can be sent.
     */
    transformers.push(context.body(responseBody))
  }

  return rest[method](request.url, (req, res) => {
    return res(...transformers)
  })
}

/**
 * Generates request handlers from the given HAR file.
 */
export function fromTraffic(har: Har, mapEntry?: MapEntryFn): RestHandler[] {
  invariant(
    har.log.entries.length > 0,
    'Failed to generate request handlers from traffic: given HAR file has no entries.',
  )

  return har.log.entries.map((entry) => {
    return toRequestHandler(mapEntry ? mapEntry(entry) : entry)
  })
}
