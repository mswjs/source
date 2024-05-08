import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { createOpenApiSpec } from '../../test/support/createOpenApiSpec'
import { withHandlers } from '../support/withHandlers'

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

  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user')
  })

  expect(res.status).toEqual(200)
  const headers = new Headers(res.headers)

  expect(Object.fromEntries(headers.entries())).toEqual({
    'content-type': 'text/plain',
    'x-powered-by': 'msw',
    // Header values are always strings.
    'x-rate-limit-remaining': expect.any(String),
    'x-rate-limit-reset': expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+?Z$/,
    ),
  })
})
