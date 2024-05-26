import { encodeBase64String } from './encodeBase64String'
import { isEqualBytes } from './isEqualBytes'
import { toHeaders, toResponse, toResponseBody } from './harUtils'

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

    expect(responseBody).toBeDefined()
    expect(isEqualBytes(bodyBytes, responseBody as Uint8Array)).toBe(true)
 })

  it.todo('handles a compressed response body')
})

describe.todo(toResponse)
