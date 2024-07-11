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
 * Check if the search parameters of a request match the recorded parameters.
 * @param searchParams Actual request search parameters.
 * @param queryString Expected recorded HAR query parameters.
 * @returns A boolean indicating whether the search parameters match.
 */
export function matchesQueryParameters(
  searchParams: URLSearchParams,
  queryString: Array<Har.QueryString>,
): boolean {
  for (const { name, value } of queryString) {
    if (!searchParams.has(name)) {
      return false
    }

    // Coerce each search parameter to a multi-value parameter.
    if (!searchParams.getAll(name).includes(value)) {
      return false
    }

    // Delete the search parameters that match.
    // Provide an explicit value to support multi-value parameters.
    // That will delete only the matching name/value pair.
    searchParams.delete(name, value)
  }

  // Forbid extra search parameters in the actual request.
  // Extra search parameters may indicate a different request altogether.
  if (searchParams.size > 0) {
    return false
  }

  return true
}
