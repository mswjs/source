import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { InspectedHandler, inspectHandlers } from '../support/inspectHandler'
import { _toHeaders, normalizeLocalhost, readArchive } from './utils'

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
