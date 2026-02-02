// @vitest-environment happy-dom
import { fromOpenApi } from '../../src/open-api/from-open-api.js'
import { withHandlers } from '../support/with-handlers.js'
import { createOpenApiSpec } from '../support/create-open-api-spec.js'

it('respects the response "example"', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/user': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    example: { id: 1, name: 'John' },
                  },
                },
              },
            },
          },
        },
      },
    }),
  )

  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/user')
  })

  expect.soft(response.status).toBe(200)
  expect.soft(response.headers.get('content-type')).toBe('application/json')
  await expect.soft(response.json()).resolves.toEqual({ id: 1, name: 'John' })
})

it('respects multiple response "examples"', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/user': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    examples: {
                      Example: {
                        value: JSON.stringify({ id: 1, name: 'John' }),
                      },
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

  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/user')
  })

  expect.soft(response.status).toBe(200)
  expect.soft(response.headers.get('content-type')).toBe('application/json')
  await expect
    .soft(response.json(), 'Uses the first response example')
    .resolves.toEqual({ id: 1, name: 'John' })
})
