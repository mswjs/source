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
