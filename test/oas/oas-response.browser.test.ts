import { fromOpenApi } from '../../src/open-api/from-open-api'
import { InspectedHandler, inspectHandlers } from '../support/inspect'

it('generates request handlers in the browser', async () => {
  const handlers = await fromOpenApi({
    openapi: '3.0.0',
    info: {
      title: 'Specification',
      version: '1.0.0',
    },
    basePath: 'https://example.com',
    paths: {
      '/user': {
        get: {
          responses: {
            '200': {
              description: 'User detail response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
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
          firstName: 'fully',
          lastName: 'until',
        }),
      },
    },
  ])
})
