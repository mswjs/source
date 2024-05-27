import { encodeBase64String } from './encodeBase64String'
import { decodeBase64String } from './decodeBase64String'
import { fromByteArray } from './fromByteArray'

describe('base64strings', () => {
  test('should be able to decode base64 string', () => {
    const base64String = 'aGVsbG8gd29ybGQ='
    const decodedString = decodeBase64String(base64String)
    const asString = fromByteArray(decodedString)
    expect(asString).toEqual('hello world')
  })

  test('should be able to encode string to base64', () => {
    const input = 'hello world'
    const base64String = 'aGVsbG8gd29ybGQ='
    const encodedString = encodeBase64String(input)
    const asString = fromByteArray(encodedString)
    expect(asString).toEqual(base64String)
  })
})
