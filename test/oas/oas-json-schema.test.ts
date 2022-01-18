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
  expect(await res.json()).toEqual({
    id: '6fbe024f-2316-4265-a6e8-d65a837e308a',
    items: [
      {
        id: '67862f3c-cbfc-451b-8ede-d1d0420ea196',
        price: 67164.74,
      },
      {
        id: 'f683b452-acd6-400c-9fab-447c31177e14',
        price: 90336.12,
      },
    ],
  })
})
