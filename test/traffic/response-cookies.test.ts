import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { readArchive, normalizeLocalhost, _toHeaders } from './utils/index.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

it('preserves the "Set-Cookie" response header', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-cookies.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/cookies',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0].response.headers),
        body: 'yummy',
      },
    },
  ])
})
