import { encodeBase64String, decodeBase64String } from './base64-utils.js'

it('encodes a base64 string', () => {
  expect(encodeBase64String('hello world')).toEqualBytes(
    new TextEncoder().encode('aGVsbG8gd29ybGQ='),
  )
})

it('decodes a bas64 string', () => {
  expect(decodeBase64String('aGVsbG8gd29ybGQ=')).toEqualBytes(
    new TextEncoder().encode('hello world'),
  )
})
