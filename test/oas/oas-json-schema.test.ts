import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { withHandlers } from '../support/withHandlers'
import { createOpenApiSpec } from '../support/createOpenApiSpec'
import { InspectedHandler, inspectHandlers } from '../support/inspectHandler'

const ID_REGEXP =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

it('supports JSON Schema object', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/cart': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          format: 'uuid',
                        },
                        items: {
                          type: 'array',
                          maxLength: 2,
                          items: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                                format: 'uuid',
                              },
                              price: {
                                type: 'integer',
                              },
                            },
                          },
                        },
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
    return fetch('http://localhost/cart')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/json')
  expect(await response.json()).toEqual({
    id: expect.stringMatching(ID_REGEXP),
    items: [
      expect.objectContaining({
        id: expect.stringMatching(ID_REGEXP),
        price: expect.any(Number),
      }),
      expect.objectContaining({
        id: expect.stringMatching(ID_REGEXP),
        price: expect.any(Number),
      }),
    ],
  })
})

it('normalizes path parameters', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/pet/{petId}': {
          get: { responses: { 200: {} } },
        },
        '/pet/{petId}/{foodId}': {
          get: { responses: { 200: {} } },
        },
      },
    }),
  )
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    expect.objectContaining({
      handler: {
        method: 'GET',
        path: 'http://localhost/pet/:petId',
      },
    }),
    expect.objectContaining({
      handler: {
        method: 'GET',
        path: 'http://localhost/pet/:petId/:foodId',
      },
    }),
  ])
})

it('treats operations without "responses" as not implemented (501)', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/no-responses': {
          get: {},
        },
        '/empty-responses': {
          get: { responses: null },
        },
      },
    }),
  )
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/no-responses',
      },
      response: {
        status: 501,
        statusText: 'Not Implemented',
        headers: [['content-type', 'text/plain;charset=UTF-8']],
        body: 'Not Implemented',
      },
    },
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/empty-responses',
      },
      response: {
        status: 501,
        statusText: 'Not Implemented',
        headers: [['content-type', 'text/plain;charset=UTF-8']],
        body: 'Not Implemented',
      },
    },
  ])
})

it('treats responses without a 200 scenario as not implemented', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/no-200': {
          get: {
            responses: {
              400: { description: 'Invalid request' },
              403: { description: 'Not authorized' },
            },
          },
        },
      },
    }),
  )

  expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/no-200')
    }),
  ).toEqualResponse(new Response('Not Implemented', { status: 501 }))
})

it('responds with 501 to a request for explicit non-existing response status', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/resource': {
          get: {
            responses: {
              400: { description: 'Invalid request' },
            },
          },
        },
      },
    }),
  )

  await expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/resource?response=200')
    }),
  ).toEqualResponse(new Response('Not Implemented', { status: 501 }))

  await expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/resource?response=404')
    }),
  ).toEqualResponse(new Response('Not Implemented', { status: 501 }))
})

it('respects the "Accept" request header', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      paths: {
        '/user': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    example: { id: 'user-1' },
                  },
                  'application/xml': {
                    example: `<id>xml-1</id>`,
                  },
                },
              },
            },
          },
        },
      },
    }),
  )

  // The "Accept" request header with a single value.
  await expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/user', {
        headers: {
          Accept: 'application/xml',
        },
      })
    }),
  ).toEqualResponse(
    new Response('<id>xml-1</id>', {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    }),
  )

  await expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/user', {
        headers: {
          Accept: 'application/json',
        },
      })
    }),
  ).toEqualResponse(
    new Response(JSON.stringify({ id: 'user-1' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  )

  // Uses the response matching the first value of the "Accept"
  // request header if multiple response mime types are accepted.
  await expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/user', {
        headers: {
          Accept: 'application/json, application/xml',
        },
      })
    }),
  ).toEqualResponse(
    new Response(JSON.stringify({ id: 'user-1' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  )
})
