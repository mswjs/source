import * as fs from 'fs'
import * as path from 'path'
import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { readArchive, normalizeLocalhost, _toHeaders } from './utils/index.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

it('creates a request handler from a recorded text response', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-text.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/text',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0]!.response.headers),
        body: 'hello world',
      },
    },
  ])
})

it('creates a request handler from a recorded json response', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-json.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/json',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0]!.response.headers),
        body: JSON.stringify({
          id: 'abc-123',
          firstName: 'John',
        }),
      },
    },
  ])
})

it('creates a request handler from a recorded binary response', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-binary.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  const imageBinary = fs
    .readFileSync(path.resolve(__dirname, 'fixtures/image.jpg'))
    // Convert to "base64" because the browser's traffic encodes binaries
    // using "base64" encoding. This alters the length of the response blob.
    .toString('base64')

  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/binary',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0]!.response.headers),
        body: imageBinary,
      },
    },
  ])
})

it('creates a request handler from a compressed recorded json response', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/response-compressed.har',
  )
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/json-compressed',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0]!.response.headers),
        body: JSON.stringify({
          id: 'abc-123',
          firstName: 'John',
        }),
      },
    },
  ])
})
