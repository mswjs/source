// @vitest-environment happy-dom
import {
  fromOpenApi,
  MapPathItemFunction,
} from '../../src/open-api/from-open-api.js'
import { createOpenApiSpec } from '../support/create-open-api-spec.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

it('creates handlers based on provided filter', async () => {
  const openApiSpec = createOpenApiSpec({
    paths: {
      '/numbers': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  example: [1, 2, 3],
                },
              },
            },
          },
        },
      },
      '/orders': {
        get: {
          responses: {
            200: {
              content: {
                'application/json': {
                  example: [{ id: 1 }, { id: 2 }, { id: 3 }],
                },
              },
            },
          },
        },
      },
    },
  })

  const mapPathItem: MapPathItemFunction = (pathItemTuple) =>
    pathItemTuple[0] === '/numbers' ? pathItemTuple : undefined
  const handlers = await fromOpenApi(openApiSpec, mapPathItem)

  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'http://localhost/numbers',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: expect.arrayContaining([['content-type', 'application/json']]),
        body: JSON.stringify([1, 2, 3]),
      },
    },
  ])
})
