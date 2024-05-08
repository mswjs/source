import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { withHandlers } from '../support/withHandlers'

it('supports explicit response example', async () => {
  const document = require('./fixtures/response-example.json')
  const handlers = await fromOpenApi(document)

  const res = await withHandlers(handlers, () => {
    return fetch('https://example.com/user')
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
    lastName: 'Maverick',
  })
})

it('supports a referenced response example', async () => {
  const document = require('./fixtures/response-ref')
  const handlers = await fromOpenApi(document)

  const res = await withHandlers(handlers, () => {
    return fetch('https://example.com/user')
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('application/json')
  expect(await res.json()).toEqual({
    id: 'abc-123',
    firstName: 'John',
    lastName: 'Maverick',
  })
})
