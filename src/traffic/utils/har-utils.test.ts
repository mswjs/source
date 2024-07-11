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

describe(matchesQueryParameters, () => {
  it('returns true if search parameters are empty', () => {
    expect(matchesQueryParameters(new URLSearchParams([]), [])).toBe(true)
  })

  it('returns true on exact search parameters match', () => {
    expect(
      matchesQueryParameters(
        new URLSearchParams([
          ['a', '1'],
          ['b', '2'],
        ]),
        [
          { name: 'a', value: '1' },
          { name: 'b', value: '2' },
        ],
      ),
    ).toBe(true)
  })

  it('returns false if missing some search parameters', () => {
    expect(
      matchesQueryParameters(new URLSearchParams([['a', '1']]), [
        { name: 'a', value: '1' },
        { name: 'b', value: '2' },
      ]),
    ).toBe(false)
  })

  it('returns false if search parameter value differs', () => {
    expect(
      matchesQueryParameters(new URLSearchParams([['a', '000']]), [
        { name: 'a', value: '1' },
      ]),
    ).toBe(false)
  })

  it('supports encoded search parameters', () => {
    expect(
      matchesQueryParameters(new URLSearchParams('?key=hello%20world'), [
        { name: 'key', value: 'hello world' },
      ]),
    ).toBe(true)
  })

  it('supports multi-value search parameters', () => {
    expect(
      matchesQueryParameters(
        new URLSearchParams([
          ['a', '1'],
          ['a', '2'],
          ['b', '3'],
        ]),
        [
          { name: 'a', value: '1' },
          { name: 'a', value: '2' },
          { name: 'b', value: '3' },
        ],
      ),
    ).toBe(true)
  })

  it('returns false if search parameters differ in casing', () => {
    expect(
      matchesQueryParameters(new URLSearchParams([['Key', 'Value']]), [
        { name: 'key', value: 'value' },
      ]),
    ).toBe(false)
  })

  it('disregards the order of search parameters', () => {
    expect(
      matchesQueryParameters(
        new URLSearchParams([
          ['b', '2'],
          ['a', '1'],
        ]),
        [
          { name: 'a', value: '1' },
          { name: 'b', value: '2' },
        ],
      ),
    ).toBe(true)
  })

  it('returns false on extra search parameters', () => {
    expect(matchesQueryParameters(new URLSearchParams([['a', '1']]), [])).toBe(
      false,
    )

    expect(
      matchesQueryParameters(
        new URLSearchParams([
          ['b', '2'],
          ['a', '1'],
        ]),
        [{ name: 'a', value: '1' }],
      ),
    ).toBe(false)
  })
})
