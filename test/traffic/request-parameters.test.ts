import * as fs from 'fs'
import * as path from 'path'
import { fromTraffic } from '../../src/traffic/from-traffic.js'
import { readArchive, normalizeLocalhost, _toHeaders } from './utils/index.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'
import { RequestHandler } from 'msw'

it('should return response for query parameter', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/request-parameters.har',
  )

  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(handlers).toHaveLength(1)
  const [requestHandler] = handlers as Array<RequestHandler>
  expect(requestHandler).toBeDefined()

  const result = await requestHandler!.run({
    request: new Request('https://localhost/docs/?selected=hello', {
      method: 'GET',
    }),
    requestId: 'strict-query-string',
  })
  expect(result).toBeDefined()
  expect(result?.response).toBeDefined()
  const responseText = await result?.response?.text()

  expect(responseText).toContain(
    'Source is designed to breach that gap and allow you to generate request handlers from supported inputs, like OpenAPI documents or HAR files.',
  )
})

it('should not return response when query parameter is missing', async () => {
  const har = readArchive(
    'test/traffic/fixtures/archives/request-parameters.har',
  )

  const handlers = fromTraffic(har, normalizeLocalhost)
  expect(handlers).toHaveLength(1)
  const [requestHandler] = handlers as Array<RequestHandler>
  expect(requestHandler).toBeDefined()

  const result = await requestHandler!.run({
    request: new Request('https://localhost/docs', {
      method: 'GET',
    }),
    requestId: 'query-string',
  })
  expect(result).toBeDefined()
  expect(result?.response).not.toBeDefined()
})
