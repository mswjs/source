import fetch from 'cross-fetch'
import { setupServer } from 'msw/node'
import { OpenAPI } from 'openapi-types'
import { createFromOpenAPI } from 'src/oas/createFromOpenAPI'

it('generates request handlers given an OpenAPI document', async () => {
  const spec: OpenAPI.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Example specification',
      version: '1.0.0',
    },
    basePath: 'http://oas.source.com',
    paths: {
      '/user': {
        get: {
          responses: {
            '200': {
              description: 'User detail response',
              content: {
                'application/json': {
                  schema: {
                    example: {
                      id: 'abc-123',
                      firstName: 'John',
                      lastName: 'Maverick',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }

  const handlers = await createFromOpenAPI(spec)
  const server = setupServer(...handlers)
  server.listen()

  const res = await fetch('http://oas.source.com/user')
  server.close()

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
    lastName: 'Maverick',
  })
})
