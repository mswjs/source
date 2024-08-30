import { fromTraffic } from '../../src/traffic/from-traffic'
import { InspectedHandler, inspectHandlers } from '../support/inspect'
import { normalizeLocalhost, readArchive } from './utils'

it('replays an error response (status code 0)', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-error.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/resource',
      },
      response: {
        status: 0,
        statusText: '',
        headers: [],
        body: '',
      },
    },
  ])
})
