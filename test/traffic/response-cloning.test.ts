import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'
import { _toHeaders, normalizeLocalhost, readArchive } from './utils/index.js'

it('subsequent requests to the same endpoint should return a readable response', async () => {
  const har = readArchive('test/traffic/fixtures/archives/response-cloning.har')
  const handlers = fromTraffic(har, normalizeLocalhost)
  await inspectHandlers(handlers)
  const repeatedHandlerResponse = await handlers[handlers.length - 1]!.run({
    request: new Request('http://localhost/resource'),
    requestId: crypto.randomUUID(),
  })
  expect(repeatedHandlerResponse?.response).toBeDefined()
  await expect(repeatedHandlerResponse!.response!.text()).resolves.toBe('two')
})
