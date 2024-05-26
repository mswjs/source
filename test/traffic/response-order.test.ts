import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { InspectedHandler, inspectHandlers } from '../support/inspectHandler'
import { normalizeLocalhost, readArchive } from './utils'

const requestOrder = readArchive(
  'test/traffic/fixtures/archives/request-order.har',
)

it('respects the response sequence when repeatedly requesting the same endpoint', async () => {
  const handlers = fromTraffic(requestOrder, normalizeLocalhost)
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
        headers: expect.any(Array),
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
        headers: expect.any(Array),
        body: 'two',
      },
    },
  ])
})
