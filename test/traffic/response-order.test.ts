import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'
import { withHandlers } from '../support/with-handlers.js'
import { _toHeaders, normalizeLocalhost, readArchive } from './utils/index.js'

it('respects the response sequence when repeatedly requesting the same endpoint', async () => {
  const har = readArchive('test/traffic/fixtures/archives/request-order.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    // The first request handler returns a unique response.
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/resource',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0]!.response.headers),
        body: 'one',
      },
    },
    // Any subsequent request handlers produce the latest (second) response.
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/resource',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[1]!.response.headers),
        body: 'two',
      },
    },
  ])
})

it('responds with the latest response for subsequent requests', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-cloning.har')
  const handlers = fromTraffic(har, normalizeLocalhost)

  {
    const response = await withHandlers(handlers, () => {
      return fetch('http://localhost/resource')
    })
    // First, must respond with the first recorded response.
    await expect(response.text()).resolves.toBe('first')
  }

  // Any subsequent requests receive the latest response.
  {
    const response = await withHandlers(handlers, () => {
      return fetch('http://localhost/resource')
    })
    await expect(response.text()).resolves.toBe('latest')
  }

  // Any subsequent requests receive the latest response.
  {
    const response = await withHandlers(handlers, () => {
      return fetch('http://localhost/resource')
    })
    await expect(response.text()).resolves.toBe('latest')
  }
})
