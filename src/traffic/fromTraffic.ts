import { invariant } from 'outvariant'
import { Har, Entry } from 'har-format'
import { Cookie, parse } from 'set-cookie-parser'
import { Headers, headersToObject } from 'headers-utils'
import { RestHandler, rest, context, ResponseTransformer } from 'msw'

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
    if (['set-cookie', 'set-cookie2'].includes(header.name.toLowerCase())) {
      responseCookies.push(...parse(header.value))
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
    console.log('MSW res body', responseBody.slice(0, 10))
    /**
     * @todo Convert all response bodies to Buffer.
     * That way both buffer and non-buffer bodies can be sent.
     */

    // const buffer = Uint8Array.from(atob(responseBody), (c) => c.charCodeAt(0))
    // console.log('MSW RES:', buffer)

    transformers.push(context.body(responseBody))
  }

  return rest[method](request.url, (req, res) => {
    return res(...transformers)
  })
}

/**
 * Generates request handlers from the given HAR file.
 */
export function fromTraffic(har: Har): RestHandler[] {
  invariant(
    har.log.entries.length > 0,
    'Failed to generate request handlers from traffic: given HAR file has no entries.',
  )

  return har.log.entries.map(toRequestHandler)
}
