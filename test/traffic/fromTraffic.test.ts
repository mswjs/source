/**
 * @vitest-environment node
 */
import Har from 'har-format'
import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { decodeBase64String } from '../../src/fromTraffic/utils/decodeBase64String'
import { readArchive } from './utils'
import { toResponse } from '../../src/fromTraffic/utils/harUtils'
import { inspectHandlers } from '../support/inspectHandler'
import { encodeBase64String } from '../../src/fromTraffic/utils/encodeBase64String'
import { isEqualBytes } from '../../src/fromTraffic/utils/isEqualBytes'

describe('fromTraffic', () => {
  it('throws an exception given no HAR object', () => {
    expect(() =>
      // @ts-expect-error Intentionally undefined value.
      fromTraffic(undefined),
    ).toThrow(
      'Failed to generate request handlers from traffic: expected an HAR object but got undefined.',
    )
  })

  it('throws an exception given an HAR file with no entries', () => {
    const traffic = readArchive('test/traffic/fixtures/archives/empty.har')
    expect(() => fromTraffic(traffic)).toThrow(
      'Failed to generate request handlers from traffic: given HAR object has no entries.',
    )
  })

  it('applies a custom "mapEntry" function to each HAR entry', () => {
    const traffic = readArchive(
      'test/traffic/fixtures/archives/request-order.har',
    )
    const mapEntry = vi.fn()
    fromTraffic(traffic, mapEntry)

    expect(mapEntry).toHaveBeenCalledTimes(traffic.log.entries.length)

    /**
     * @note That archive entries are analyzed in chronological order
     * from newest to oldest entries.
     */
    traffic.log.entries.reverse().forEach((entry, index) => {
      expect(mapEntry).toHaveBeenNthCalledWith(index + 1, entry)
    })
  })

  it('supports skipping an entry using the "mapEntry" function', async () => {
    const handlers = fromTraffic(
      {
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.github.com',
              },
              response: {
                status: 200,
                headers: [{ name: '', value: '' }],
                content: { text: 'hello world' },
              },
            },
            {
              request: {
                method: 'GET',
                url: 'https://api.stripe.com',
              },
              response: {
                status: 200,
                headers: [],
                content: { text: undefined },
              },
            },
          ],
        },
      } as Har.Har,
      (entry) => {
        if (entry.request.url === 'https://api.stripe.com') {
          return entry
        }
      },
    )

    expect(handlers).toHaveLength(1)
    const [initialRequestHandler] = await inspectHandlers(handlers)
    expect(initialRequestHandler.handler).toEqual({
      method: 'GET',
      path: 'https://api.stripe.com',
    })
  })
})

describe('toResponseBody', () => {
  function createResponse(
    body?: string,
    options?: { encoding?: string },
  ): Har.Response {
    return {
      status: 200,
      statusText: 'OK',
      httpVersion: '1.0',
      cookies: [],
      headers: [],
      content: {
        text: body,
        size: body?.length || 0,
        mimeType: 'text/plain',
        encoding: options?.encoding,
      },
      redirectURL: '',
      headersSize: -1,
      bodySize: -1,
    }
  }

  it('returns undefined given response with no body', () => {
    expect(toResponse(createResponse(undefined)).body).toBeNull()
  })

  it('returns a decoded text body given a base64-encoded response body', async () => {
    const exepctedBody = 'hello world'
    const response = toResponse(createResponse(btoa(exepctedBody), { encoding: 'base64' }))
    const responseText = await response.text()

    expect(
      responseText
    ).toEqual(exepctedBody)
  })

  it('returns a plain text response body as-is', async () => {
    const bodyResponse = toResponse(createResponse('hello world'))
    const textOfResponse = await bodyResponse.text()
    expect(textOfResponse).toEqual('hello world')
  })
})
