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
