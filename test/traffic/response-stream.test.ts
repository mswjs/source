import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { InspectedHandler, inspectHandlers } from '../support/inspectHandler'
import { normalizeLocalhost, readArchive, _toHeaders } from './utils'

it('mocks a recorded response stream', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-stream.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/stream',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: _toHeaders(har.log.entries[0].response.headers),
        body: 'this is a chunked response',
      },
    },
  ])
})
