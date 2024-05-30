import { fromOpenApi } from '../../src/open-api/from-open-api.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

it('supports explicit response example', async () => {
  const document = require('./fixtures/response-example.json')
  const handlers = await fromOpenApi(document)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'https://example.com/user',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: expect.arrayContaining([['content-type', 'application/json']]),
        body: JSON.stringify({
          id: 'abc-123',
          firstName: 'John',
          lastName: 'Maverick',
        }),
      },
    },
  ])
})

it('supports a referenced response example', async () => {
  const document = require('./fixtures/response-ref')
  const handlers = await fromOpenApi(document)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'https://example.com/user',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: expect.arrayContaining([['content-type', 'application/json']]),
        body: JSON.stringify({
          id: 'abc-123',
          firstName: 'John',
          lastName: 'Maverick',
        }),
      },
    },
  ])
})
