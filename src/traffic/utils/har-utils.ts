import type Har from 'har-format'
import { decodeBase64String } from './base64-utils.js'

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

/**
 * Checks if the query parameters of a request match the recorded parameters.
 * @param request - The request URL.
 * @param recordedParams - The recorded query parameters.
 * @returns A boolean indicating whether the query parameters match or not.
 */
export function matchesQueryParameters(
  request: string,
  recordedParams: URLSearchParams,
): boolean {
  const requestUrl = new URL(request)
  const requestParams = requestUrl.searchParams

  if (requestParams === recordedParams) {
    return true
  }

  for (const [key, value] of recordedParams) {
    if (!requestParams.has(key) || requestParams.get(key) !== value) {
      return false
    }
  }

  return true
}
