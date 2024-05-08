/**
 * @vitest-environment jsdom
 */
import { it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { withHandlers } from '../../test/support/withHandlers'
import { readArchive, headersAfterMsw, normalizeLocalhost } from './utils'

// Archives.
const responseText = readArchive(
  'test/traffic/fixtures/archives/response-text.har',
)
const responseJson = readArchive(
  'test/traffic/fixtures/archives/response-json.har',
)
const responseBinary = readArchive(
  'test/traffic/fixtures/archives/response-binary.har',
)
const responseCompressed = readArchive(
  'test/traffic/fixtures/archives/response-compressed.har',
)
const responseCookies = readArchive(
  'test/traffic/fixtures/archives/response-cookies.har',
)

it('mocks a recorded text response', async () => {
  const handlers = fromTraffic(responseText, normalizeLocalhost)
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/text')
  })

  expect(res.status).toEqual(200)
  expect(Object.fromEntries(res.headers.entries())).toEqual(
    headersAfterMsw(responseText.log.entries[0].response.headers),
  )
  expect(await res.text()).toEqual('hello world')
})

it('mocks a recorded JSON response', async () => {
  const handlers = fromTraffic(responseJson, normalizeLocalhost)
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/json')
  })

  expect(res.status).toEqual(200)
  expect(Object.fromEntries(res.headers.entries())).toEqual(
    headersAfterMsw(responseJson.log.entries[0].response.headers),
  )
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
  })
})

it('mocks a recorded binary (base64) response', async () => {
  const handlers = fromTraffic(responseBinary, normalizeLocalhost)
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/binary')
  })
  const blob = await res.blob()

  expect(res.status).toEqual(200)
  expect(Object.fromEntries(res.headers.entries())).toEqual(
    headersAfterMsw(responseBinary.log.entries[0].response.headers),
  )

  const imageBinary = fs
    .readFileSync(path.resolve(__dirname, 'fixtures/image.jpg'))
    // Convert to "base64" because the browser's traffic encodes binaries
    // using "base64" encoding. This alters the length of the response blob.
    .toString('base64')

  expect(blob.type).toEqual('image/jpg')
  expect(blob.size).toEqual(imageBinary.length)
  expect(await blob.text()).toEqual(imageBinary)
})

it('mocks a compressed recorded JSON response', async () => {
  const handlers = fromTraffic(responseCompressed, normalizeLocalhost)
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/json-compressed')
  })

  expect(res.status).toEqual(200)
  expect(Object.fromEntries(res.headers.entries())).toEqual(
    headersAfterMsw(responseCompressed.log.entries[0].response.headers),
  )
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
  })
})

it('propagates recoded response cookies to the mocked response', async () => {
  const handlers = fromTraffic(responseCookies, normalizeLocalhost)
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/cookies')
  })

  expect(res.status).toEqual(200)
  expect(Object.fromEntries(res.headers.entries())).toEqual(
    headersAfterMsw(responseCookies.log.entries[0].response.headers),
  )
  expect(document.cookie).toEqual('secret-token=abc-123')
  expect(await res.text()).toEqual('yummy')
})
