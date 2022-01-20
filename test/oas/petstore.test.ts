import fetch from 'cross-fetch'
import { RequestHandler } from 'msw'
import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { withHandlers } from '../../test/support/withHandlers'
const petstoreSpecification = require('./fixtures/petstore.json')

let handlers: RequestHandler[]

beforeAll(async () => {
  handlers = await fromOpenApi(petstoreSpecification)
})

const entities = {
  pet: {
    id: 10,
    name: 'doggie',
    category: {
      id: 1,
      name: 'Dogs',
    },
    photoUrls: expect.arrayContaining([expect.any(String)]),
    tags: expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      }),
    ]),
    status: expect.stringMatching(/^(available|pending|sold)$/),
  },
  order: {
    id: 10,
    petId: 198772,
    quantity: 7,
    shipDate: expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+?Z$/,
    ),
    status: expect.stringMatching(/^(placed|approved|delivered)$/),
    complete: expect.any(Boolean),
  },
  user: {
    id: 10,
    username: 'theUser',
    firstName: 'John',
    lastName: 'James',
    email: 'john@email.com',
    password: 12345,
    phone: 12345,
    userStatus: 1,
  },
}

it('POST /pet', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet', { method: 'POST' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(entities.pet)
})

it('PUT /pet', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet', { method: 'PUT' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(entities.pet)
})

it('GET /pet/findByStatus', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet/findByStatus')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(
    expect.arrayContaining([expect.objectContaining(entities.pet)]),
  )
})

it('GET /pet/findByTags', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet/findByTags')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(
    expect.arrayContaining([expect.objectContaining(entities.pet)]),
  )
})

it('GET /pet/{petId}', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet/abc-123')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(entities.pet)
})

it('POST /pet/{petId}', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet/abc-123', { method: 'POST' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual(null)
  expect(await res.text()).toEqual('')
})

it('DELETE /pet/{petId}', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet/abc-123', { method: 'DELETE' })
  })

  // The "DELETE /pet/{petId}" does not describe a 200 response.
  // This implies that successful resource deletion is responded with
  // an empty 200 OK response that needs no explicit specification.
  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual(null)
  expect(await res.text()).toEqual('')
})

it('POST http://localhost/pet/:petId/uploadImage', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/pet/abc-123/uploadImage', { method: 'POST' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/json')
  expect(await res.json()).toEqual({
    code: expect.any(Number),
    message: expect.any(String),
    type: expect.any(String),
  })
})

/**
 * Inventory.
 */
it('GET /store/inventory', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/store/inventory')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/json')

  const json = await res.json()
  const keys = Object.keys(json)

  // Empty response is also okay, additional properties are optional.
  if (keys.length > 0) {
    // The API response is describe as a free-form JSON
    // containing any additional properties but all properties
    // must be integers.
    expect(keys).toEqual(expect.arrayContaining([expect.any(String)]))
    expect(Object.values(json)).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    )
  }
})

it('POST /store/order', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/store/order', { method: 'POST' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/json')
  expect(await res.json()).toEqual(entities.order)
})

it('GET /store/order/{orderId}', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/store/order/abc-123')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(entities.order)
})

/**
 * User.
 */
it('POST /user', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user', { method: 'POST' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/json')
  expect(await res.json()).toEqual(entities.user)
})

it('POST /user/createWithList', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user/createWithList', { method: 'POST' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(entities.user)
})

it('GET /user/login', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user/login')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.text()).toEqual(expect.any(String))
})

it('GET /user/logout', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user/logout')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual(null)
  expect(await res.text()).toEqual('')
})

it('GET /user/:username', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user/john-james')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(entities.user)
})

it('PUT /user/:username', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user/john-james', { method: 'PUT' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual(null)
  expect(await res.text()).toEqual('')
})

it('DELETE /user/:username', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/user/john-james', { method: 'DELETE' })
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual(null)
  expect(await res.text()).toEqual('')
})
