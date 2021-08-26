import fetch from 'cross-fetch'
import { fromTraffic } from 'src/fromTraffic/fromTraffic'
import { withHandlers } from 'test/support/withHandlers'
import { normalizeLocalhost, readArchive } from './utils'

const requestOrder = readArchive(
  'test/traffic/fixtures/archives/request-order.har',
)

it('respects the response sequence when repeatedly requesting the same endpoint', async () => {
  const handlers = fromTraffic(requestOrder, normalizeLocalhost)
  const [firstResponse, secondResponse, thirdResponse] = await withHandlers(
    handlers,
    async () => {
      // Intentionally request the same endpoint.
      return [
        await fetch('http://localhost/resource'),
        await fetch('http://localhost/resource'),
        await fetch('http://localhost/resource'),
      ]
    },
  )

  // The first request receives a unique response.
  expect(firstResponse.status).toEqual(200)
  expect(await firstResponse.text()).toEqual('one')

  // The second request receives a different response.
  expect(secondResponse.status).toEqual(200)
  expect(await secondResponse.text()).toEqual('two')

  // Any subsequent request receives the latest (second) response.
  expect(thirdResponse.status).toEqual(200)
  expect(await thirdResponse.text()).toEqual('two')
})
