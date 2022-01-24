import fetch from 'cross-fetch'
import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { withHandlers } from '../support/withHandlers'
import { createOpenApiSpec } from '../support/createOpenApiSpec'

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
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/cart')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/json')

  const json: {
    id: string
    items: Array<{ id: string; price: number }>
  } = await res.json()

  expect(Object.keys(json)).toEqual(['id', 'items'])
  expect(json.id).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  )
  expect(json.items).toBeInstanceOf(Array)

  json.items.forEach((item) => {
    expect(Object.keys(item)).toEqual(['id', 'price'])
    expect(item.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(typeof item.price).toEqual('number')
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

  expect(handlers[0].info.header).toEqual('GET http://localhost/pet/:petId')
  expect(handlers[1].info.header).toEqual(
    'GET http://localhost/pet/:petId/:foodId',
  )
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

  await withHandlers(handlers, () =>
    fetch('http://localhost/no-responses'),
  ).then((res) => {
    expect(res.status).toEqual(501)
  })

  await withHandlers(handlers, () =>
    fetch('http://localhost/empty-responses'),
  ).then((res) => {
    expect(res.status).toEqual(501)
  })
})

it('responds with an empty 200 to a request without explicit 200 response', async () => {
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

  const res = await withHandlers(handlers, () =>
    fetch('http://localhost/no-200'),
  )
  expect(res.status).toEqual(200)
  expect(await res.text()).toEqual('')
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

  await withHandlers(handlers, () =>
    fetch('http://localhost/resource?response=200'),
  ).then(async (res) => {
    expect(res.status).toEqual(501)
    expect(await res.text()).toEqual('')
  })

  await withHandlers(handlers, () =>
    fetch('http://localhost/resource?response=404'),
  ).then(async (res) => {
    expect(res.status).toEqual(501)
    expect(await res.text()).toEqual('')
  })
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
  await withHandlers(handlers, () => {
    return fetch('http://localhost/user', {
      headers: {
        Accept: 'application/xml',
      },
    })
  }).then(async (res) => {
    expect(res.status).toEqual(200)
    expect(await res.text()).toEqual(`<id>xml-1</id>`)
  })

  // The "Accept" request header with multiple values.
  await withHandlers(handlers, () => {
    return fetch('http://localhost/user', {
      headers: {
        Accept: 'application/json, application/xml',
      },
    })
  }).then(async (res) => {
    expect(res.status).toEqual(200)
    // The first MimeType is used for the mocked data.
    expect(await res.text()).toEqual(`{"id":"user-1"}`)
  })
})
