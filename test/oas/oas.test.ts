import fetch from 'cross-fetch'
import { fromOpenApi } from 'src/fromOpenApi/fromOpenApi'
import { withHandlers } from '../support/withHandlers'

it('supports explicit "example" JSON in the response schema', async () => {
  const document = require('./fixtures/response-example.json')
  const handlers = await fromOpenApi(document)

  const res = await withHandlers(handlers, () => {
    return fetch('http://oas.source.com/user')
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
    lastName: 'Maverick',
  })
})

it('supports response example by reference', async () => {
  const document = require('./fixtures/response-ref')
  const handlers = await fromOpenApi(document)

  const res = await withHandlers(handlers, () => {
    return fetch('http://oas.source.com/user')
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
    lastName: 'Maverick',
  })
})
