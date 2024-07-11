// @vitest-environment node
import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'
import { normalizeLocalhost, readArchive, _toHeaders } from './utils/index.js'

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
