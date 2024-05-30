import { fromOpenApi } from '../../src/open-api/from-open-api.js'
import { createOpenApiSpec } from '../support/create-open-api-spec.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

it('supports absolute server url', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      servers: [{ url: 'https://example.com' }],
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
      },
    }),
  )
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        // Must rebase request URLs against the "servers[0].url"
        path: 'https://example.com/numbers',
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

it('supports relative server url', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      servers: [{ url: '/v2' }],
      paths: {
        '/token': {
          post: {
            responses: {
              200: {
                content: {
                  'plain/text': {
                    example: 'abc-123',
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
        method: 'POST',
        path: 'http://localhost/v2/token',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: expect.arrayContaining([['content-type', 'plain/text']]),
        body: 'abc-123',
      },
    },
  ])
})

it('supports multiple server urls', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      servers: [{ url: 'https://example.com' }, { url: 'https://v2.mswjs.io' }],
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
      },
    }),
  )
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    {
      handler: {
        method: 'GET',
        path: 'https://example.com/numbers',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: expect.arrayContaining([['content-type', 'application/json']]),
        body: JSON.stringify([1, 2, 3]),
      },
    },
    {
      handler: {
        method: 'GET',
        path: 'https://v2.mswjs.io/numbers',
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

it('supports the "basePath" url', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      basePath: 'https://example.com',
      paths: {
        '/strings': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    example: ['a', 'b', 'c'],
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
        path: 'https://example.com/strings',
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: expect.arrayContaining([['content-type', 'application/json']]),
        body: JSON.stringify(['a', 'b', 'c']),
      },
    },
  ])
})
