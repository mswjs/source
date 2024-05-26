import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { createOpenApiSpec } from '../support/createOpenApiSpec'
import { withHandlers } from '../support/withHandlers'

it('supports a single absolute server url', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      servers: [
        {
          url: 'https://example.com',
        },
      ],
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

  const res = await withHandlers(handlers, () => {
    return fetch('https://example.com/numbers')
  })

  expect(res.status).toEqual(200)
  const responseText = await res.text()
  const responseJson = JSON.parse(responseText)
  expect(responseJson).toEqual([1, 2, 3])
})

it('supports a single relative server url', async () => {
  const handlers = await fromOpenApi(
    createOpenApiSpec({
      servers: [
        {
          url: '/v2',
        },
      ],
      paths: {
        '/token': {
          get: {
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

  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/v2/token')
  })

  expect(res.status).toEqual(200)
  expect(await res.text()).toEqual('abc-123')
})

it('supports multiple absolute server urls', async () => {
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

  const responses = await withHandlers(handlers, () => {
    return Promise.all([
      fetch('https://example.com/numbers'),
      fetch('https://v2.mswjs.io/numbers'),
    ])
  })

  for (const res of responses) {
    expect(res.status).toEqual(200)
    expect(await res.json()).toEqual([1, 2, 3])
  }
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

  const res = await withHandlers(handlers, () => {
    return fetch('https://example.com/strings')
  })

  expect(res.status).toEqual(200)
  expect(await res.json()).toEqual(['a', 'b', 'c'])
})
