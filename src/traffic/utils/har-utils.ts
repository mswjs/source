import type Har from 'har-format'
import { decodeBase64String } from './decode-base64-string.js'

export function toHeaders(harHeaders: Array<Har.Header>): Headers {
  return new Headers(
    harHeaders.map<[string, string]>((header) => {
      /**
       * @fixme This will preserve the "Content-Encoding"
       * response header for compressed bodies. Make sure
       * MSW also handles the compression, otherwise the
       * "incorrect header check" error will be thrown.
       */
      return [header.name, header.value]
    }),
  )
}

export function toResponseBody(
  content: Har.Content,
): Uint8Array | string | undefined {
  const { text, encoding, mimeType } = content

  if (!text) {
    return
  }

  if (encoding === 'base64' && mimeType.includes('text')) {
    return decodeBase64String(text)
  }

  /**
   * @fixme Handle compressed response bodies.
   */

  return text
}

export function toResponse(responseEntry: Har.Response): Response {
  const body = toResponseBody(responseEntry.content)
  const response = new Response(body, {
    status: responseEntry.status,
    statusText: responseEntry.statusText,
    headers: toHeaders(responseEntry.headers),
  })
  return response
}
