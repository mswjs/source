import crypto from 'node:crypto'
import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { readArchive, normalizeLocalhost, _toHeaders } from './utils/index.js'

it('responds to a request where all search parameters match', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/request-parameters.har',
  )

  const handlers = fromTraffic(har, normalizeLocalhost)
  const requestHandler = handlers[0]!

  const result = await requestHandler.run({
    request: new Request('https://localhost/docs/?hello=world&userId=abc-123'),
    requestId: crypto.randomUUID(),
  })
  expect(result?.response).toBeDefined()

  await expect(result?.response?.text()).resolves.toBe('hello world')
})

it('does not respond to a request where some search parameters match', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/request-parameters.har',
  )

  const handlers = fromTraffic(har, normalizeLocalhost)
  const requestHandler = handlers[0]!

  const result = await requestHandler.run({
    request: new Request('https://localhost/docs/?hello=world'),
    requestId: crypto.randomUUID(),
  })
  expect(result?.response).toBeUndefined()
})

it('does not respond to a request where no search parameters match', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/request-parameters.har',
  )

  const handlers = fromTraffic(har, normalizeLocalhost)
  const requestHandler = handlers[0]!

  const result = await requestHandler!.run({
    request: new Request('https://localhost/docs', {
      method: 'GET',
    }),
    requestId: 'query-string',
  })
  expect(result?.response).toBeUndefined()
})
