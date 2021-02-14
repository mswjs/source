import fetch from 'cross-fetch'
import { setupServer } from 'msw/node'
import { fromOpenAPI } from 'src/oas/fromOpenAPI'

it('supports explicit "example" JSON in the response schema', async () => {
  const document = require('./fixtures/response-example.json')
  const handlers = await fromOpenAPI(document)
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
