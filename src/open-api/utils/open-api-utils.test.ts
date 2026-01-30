import {
  getAcceptedContentTypes,
  getResponseStatusCode,
} from './open-api-utils.js'

// Tests for `getAcceptedContentTypes()`.

it('returns a single content type as-is', () => {
  expect(
    getAcceptedContentTypes(new Headers([['accept', 'text/html']])),
  ).toEqual(['text/html'])
})

it('ignores whitespace separating multiple content types', () => {
  expect(
    getAcceptedContentTypes(
      new Headers([['accept', 'text/html, application/xhtml+xml, */*']]),
    ),
  ).toEqual(['text/html', 'application/xhtml+xml', '*/*'])
})

it('removes an empty content type', () => {
  expect(getAcceptedContentTypes(new Headers([['accept', ', ,']]))).toEqual([])

  expect(
    getAcceptedContentTypes(new Headers([['accept', 'text/html, , */*']])),
  ).toEqual(['text/html', '*/*'])
})

describe.skip('complex "accept" headers', () => {
  it('supports weight reordering', () => {
    expect(
      getAcceptedContentTypes(
        new Headers([
          [
            'accept',
            'text/plain; q=0.5, text/html, text/x-dvi; q=0.8, text/x-c',
          ],
        ]),
      ),
    ).toEqual(['text/html', 'text/x-c', 'text/x-dvi', 'text/plain'])
  })

  it('supports specificity reordering', () => {
    expect(
      getAcceptedContentTypes(
        new Headers([
          ['accept', 'text/*, text/plain, text/plain;format=flowed, */*'],
        ]),
      ),
    ).toEqual(['text/plain;format=flowed', 'text/plain', 'text/*', '*/*'])
  })
})

// Tests for `getResponseStatusCode()`.

it('returns status code specified in url query, if defined', () => {
  const responses = {
    '204': { description: 'No Content' },
  }

  expect(
    getResponseStatusCode(responses, {
      url: 'http://localhost/resource?response=204',
    }),
  ).toEqual(204)
})

it('returns `501` if status code is specified in url query, but not defined, even if others are defined', () => {
  const responses = {
    '204': { description: 'No Content' },
  }

  expect(
    getResponseStatusCode(responses, {
      url: 'http://localhost/resource?response=201',
    }),
  ).toEqual(501)
})

it('returns `200` if a 200 code response is defined', () => {
  const responses = {
    '200': { description: 'Success' },
  }

  expect(getResponseStatusCode(responses, {})).toEqual(200)
})

it('returns the first defined success (2XX) status code', () => {
  const responses = {
    '404': { description: 'Not Found' },
    '201': { description: 'Success' },
    '204': { description: 'No Content' },
  }

  expect(getResponseStatusCode(responses, {})).toEqual(201)
})

it('returns `default` if a default status code is defined with no success codes', () => {
  const responses = {
    '404': { description: 'Not Found' },
    default: { description: 'Success' },
  }

  expect(getResponseStatusCode(responses, {})).toEqual('default')
})

it('returns `501` as a fallback', () => {
  const responses = {
    '404': { description: 'Not Found' },
  }

  expect(getResponseStatusCode(responses, {})).toEqual(501)
})

it('returns `501` if `responses` is empty', () => {
  expect(getResponseStatusCode({}, {})).toEqual(501)
})

it('returns `501` if `responses` is undefined', () => {
  expect(getResponseStatusCode(undefined, {})).toEqual(501)
})
