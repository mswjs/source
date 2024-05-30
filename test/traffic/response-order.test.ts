import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'
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
        headers: _toHeaders(har.log.entries[0].response.headers),
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
        headers: _toHeaders(har.log.entries[1].response.headers),
        body: 'two',
      },
    },
  ])
})
