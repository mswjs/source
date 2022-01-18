/**
 * @jest-environment node
 */
import { Har, Response } from 'har-format'
import { fromTraffic, toResponseBody } from '../../src/fromTraffic/fromTraffic'
import { decodeBase64String } from '../../src/fromTraffic/utils/decodeBase64String'
import { readArchive } from './utils'

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
    const mapEntry = jest.fn()
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

  it('supports skipping an entry using the "mapEntry" function', () => {
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
      } as Har,
      (entry) => {
        if (entry.request.url === 'https://api.stripe.com') {
          return entry
        }
      },
    )

    expect(handlers).toHaveLength(1)
    expect(handlers[0].info.path).toEqual('https://api.stripe.com')
  })
})

describe('toResponseBody', () => {
  function createResponse(
    body?: string,
    options?: { encoding?: string },
  ): Response {
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
    expect(toResponseBody(createResponse(undefined))).toEqual(undefined)
  })

  it('returns a decoded text body given a base64-encoded response body', () => {
    const encoder = new TextEncoder()
    const body = encoder.encode('hello world')
    const expectedBody = decodeBase64String(
      encoder.encode('hello world').toString(),
    )

    expect(
      toResponseBody(createResponse(body.toString(), { encoding: 'base64' })),
    ).toEqual(expectedBody)
  })

  it('returns a plain text response body as-is', () => {
    expect(toResponseBody(createResponse('hello world'))).toEqual('hello world')
  })
})
