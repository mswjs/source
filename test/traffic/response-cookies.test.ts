import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { readArchive, normalizeLocalhost, _toHeaders } from './utils'
import { InspectedHandler, inspectHandlers } from '../support/inspectHandler'

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
