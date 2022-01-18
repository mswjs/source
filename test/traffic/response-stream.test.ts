import fetch from 'cross-fetch'
import { fromTraffic } from '../../src/fromTraffic/fromTraffic'
import { withHandlers } from '../../test/support/withHandlers'
import { normalizeLocalhost, readArchive } from './utils'

const responseStream = readArchive(
  'test/traffic/fixtures/archives/response-stream.har',
)

it('mocks a recorded response stream', async () => {
  const handlers = fromTraffic(responseStream, normalizeLocalhost)
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/stream')
  })

  expect(res.status).toEqual(200)
  expect(await res.text()).toEqual('this is a chunked response')
})
