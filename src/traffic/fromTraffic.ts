import { invariant } from 'outvariant'
import { Har, Entry } from 'har-format'
import { RestHandler, rest } from 'msw'

function toRequestHandler(entry: Entry): RestHandler {
  const { request, response, time } = entry
  const method = request.method.toLowerCase() as keyof typeof rest
  const responseTime = time || 0

  const responseHeaders = response.headers.reduce<Record<string, string>>(
    (headers, { name, value }) => {
      headers[name] = value
      return headers
    },
    {},
  )

  // const responseBody = response.content.text
  //   ? Uint8Array.from(response.content.text)
  //   : null

  return rest[method](request.url, (req, res, ctx) => {
    return res(
      ctx.status(response.status, response.statusText),
      ctx.set(responseHeaders),
      ctx.delay(responseTime),
    )
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
