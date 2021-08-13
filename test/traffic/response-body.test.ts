/**
 * @jest-environment jsdom
 */
import * as fs from 'fs'
import * as path from 'path'
import fetch from 'cross-fetch'
import { headersToObject } from 'headers-utils'
import { setupServer } from 'msw/node'
import { fromTraffic } from 'src/traffic/fromTraffic'
import { readArchive, headersAfterMsw, normalizeLocalhost } from './utils'

// Archives.
const empty = readArchive('test/traffic/fixtures/archives/empty.har')
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

const server = setupServer()

beforeAll(async () => {
  server.listen({
    onUnhandledRequest: 'error',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  jest.restoreAllMocks()
})

it('throws an exception given an HAR file with no entries', () => {
  expect(() => fromTraffic(empty)).toThrow(
    'Failed to generate request handlers from traffic: given HAR file has no entries.',
  )
})

it('mocks a recorded text response', async () => {
  const handlers = fromTraffic(responseText, normalizeLocalhost)
  expect(handlers).toHaveLength(1)

  server.use(...handlers)
  const res = await fetch('http://localhost/text')

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(responseText.log.entries[0].response.headers),
  )
  expect(await res.text()).toEqual('hello world')
})

it('mocks a recorded JSON response', async () => {
  const handlers = fromTraffic(responseJson, normalizeLocalhost)
  expect(handlers).toHaveLength(1)

  server.use(...handlers)
  const res = await fetch('http://localhost/json')

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(responseJson.log.entries[0].response.headers),
  )
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
  })
})

it('mocks a recorded binary (base64) response', async () => {
  const handlers = fromTraffic(responseBinary, normalizeLocalhost)
  expect(handlers).toHaveLength(1)

  server.use(...handlers)
  const res = await fetch('http://localhost/binary')
  const blob = await res.blob()

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
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
  expect(handlers).toHaveLength(1)

  server.use(...handlers)
  const res = await fetch('http://localhost/json-compressed')

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(responseCompressed.log.entries[0].response.headers),
  )
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
  })
})

it('propagates recoded response cookies to the mocked response', async () => {
  const handlers = fromTraffic(responseCookies, normalizeLocalhost)
  expect(handlers).toHaveLength(1)

  server.use(...handlers)
  const res = await fetch('http://localhost/cookies')

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(responseCookies.log.entries[0].response.headers),
  )
  expect(document.cookie).toEqual('secret-token=abc-123')
  expect(await res.text()).toEqual('yummy')
})

// it.todo('respects the order of the same recorded requests')
