import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { createOpenApiSpec } from '../../test/support/createOpenApiSpec'
import { InspectedHandler, inspectHandlers } from '../support/inspectHandler'

it('supports response headers', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/user': {
          get: {
            responses: {
              200: {
                headers: {
                  'X-Rate-Limit-Remaining': {
                    schema: {
                      type: 'number',
                    },
                  },
                  'X-Rate-Limit-Reset': {
                    schema: {
                      type: 'string',
                      format: 'date-time',
                    },
                  },
                },
                content: {
                  'text/plain': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
  )

  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/user',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: [
          ['content-type', 'text/plain'],
          ['x-rate-limit-remaining', expect.any(String)],
          [
            'x-rate-limit-reset',
            expect.stringMatching(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+?Z$/,
            ),
          ],
        ],
        body: expect.any(String),
      },
    },
  ])
})
