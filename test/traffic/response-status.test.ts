import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { readArchive, normalizeLocalhost, _toHeaders } from './utils/index.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

/**
 * @see https://github.com/mswjs/source/issues/54
 */
it('supports non-configurable response status codes', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/response-status-101.har',
  )
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/status',
      },
      response: {
        status: 101,
        statusText: 'Continue',
        headers: _toHeaders(har.log.entries[0].response.headers),
        body: '',
      },
    },
  ])
})
