import {
  matchesQueryParameters,
  toHeaders,
  toResponse,
  toResponseBody,
} from './har-utils'

describe(toHeaders, () => {
  it('supports a single har headers', () => {
    expect(
      toHeaders([{ name: 'Content-Type', value: 'application/json' }]),
    ).toEqual(
      new Headers({
        'Content-Type': 'application/json',
      }),
    )
  })

  it('supports multiple har headers', () => {
    expect(
      toHeaders([
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Authorization', value: 'Bearer 123' },
      ]),
    ).toEqual(
      new Headers({
        'Content-Type': 'application/json',
        Authorization: 'Bearer 123',
      }),
    )
  })

  it('supports multi-value headers', () => {
    expect(
      toHeaders([
        { name: 'Set-Cookie', value: 'a=1' },
        { name: 'Set-Cookie', value: 'b=2' },
      ]),
    ).toEqual(
      new Headers([
        ['Set-Cookie', 'a=1'],
        ['Set-Cookie', 'b=2'],
      ]),
    )
  })
})

describe(toResponseBody, () => {
  it('returns undefined given no response body', () => {
    expect(
      toResponseBody({
        size: 0,
        mimeType: '',
      }),
    ).toBe(undefined)
  })

  it('returns the response body as text', () => {
    expect(
      toResponseBody({
        text: 'hello world',
        size: 11,
        mimeType: 'text/plain',
      }),
    ).toBe('hello world')
  })

  it('decodes the base64-encoded response body', () => {
    const bodyBytes = Uint8Array.from('hello world', (c) => c.charCodeAt(0))
    const responseBody = toResponseBody({
      text: btoa('hello world'),
      size: 11,
      mimeType: 'text/plain',
      encoding: 'base64',
    })

    expect(responseBody).toEqualBytes(bodyBytes)
  })

  it.todo('handles a compressed response body')
})

describe.todo(toResponse)

describe('matchesQueryParameters', () => {
  it('should exact match query parameters', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?a=1&b=2',
        new URLSearchParams('a=1&b=2'),
      ),
    ).toBe(true)
  })

  it('should fail when having missing query parameter', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?a=1',
        new URLSearchParams('a=1&b=2'),
      ),
    ).toBe(false)
  })

  it('should fail when query parameter values differ', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?a=1&b=3',
        new URLSearchParams('a=1&b=2'),
      ),
    ).toBe(false)
  })

  it('should support when query string is empty', () => {
    expect(
      matchesQueryParameters('https://example.com/', new URLSearchParams('')),
    ).toBe(true)
  })

  it('should support encoded query parameters', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?key=hello%20world',
        new URLSearchParams('key=hello world'),
      ),
    ).toBe(true)
  })

  it('should fail when query parameters have multiple values', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?key=value1&key=value2',
        new URLSearchParams('key=value1&key=value2'),
      ),
    ).toBe(false)
  })

  it('should fail when query parameters differ in case', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?Key=Value',
        new URLSearchParams('key=value'),
      ),
    ).toBe(false)
  })

  it('should match when query parameters order differ', () => {
    expect(
      matchesQueryParameters(
        'https://example.com/?b=2&a=1',
        new URLSearchParams('a=1&b=2'),
      ),
    ).toBe(true)
  })
})
