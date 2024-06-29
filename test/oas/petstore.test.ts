import { RequestHandler } from 'msw'
import { fromOpenApi } from '../../src/open-api/from-open-api.js'
import { withHandlers } from '../../test/support/with-handlers.js'

const petstoreSpecification = require('./fixtures/petstore.json')

let handlers: RequestHandler[]

beforeAll(async () => {
  handlers = await fromOpenApi(petstoreSpecification)
})

const entities = {
  pet: {
    id: expect.any(Number),
    name: expect.any(String),
    category: {
      id: expect.any(Number),
      name: expect.any(String),
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
    id: 42,
    petId: 100,
    quantity: 72,
    shipDate: expect.stringMatching(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+?Z$/,
    ),
    status: expect.stringMatching(/^(placed|approved|delivered)$/),
    complete: expect.any(Boolean),
  },
  user: {
    id: 42,
    email: 'abaft',
    firstName: 'fooey',
    lastName: 'fully',
    password: 'lined',
    phone: 'waste',
    userStatus: 81,
    username: 'wetly',
  },
}

it('POST /pet', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet', { method: 'POST' })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(entities.pet)
})

it('PUT /pet', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet', { method: 'PUT' })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(entities.pet)
})

it('GET /pet/findByStatus', async () => {
  const res = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet/findByStatus')
  })

  expect(res.status).toEqual(200)
  expect(res.headers.get('content-type')).toEqual('application/xml')
  expect(await res.json()).toEqual(
    expect.arrayContaining([expect.objectContaining(entities.pet)]),
  )
})

it('GET /pet/findByTags', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet/findByTags')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(
    expect.arrayContaining([expect.objectContaining(entities.pet)]),
  )
})

it('GET /pet/{petId}', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet/abc-123')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(entities.pet)
})

it('POST /pet/{petId}', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet/abc-123', { method: 'POST' })
  })

  // Petstore does not describe a 200 scenario for this POST endpoint.
  expect(response.status).toEqual(501)
  expect(await response.text()).toEqual('Not Implemented')
})

it('DELETE /pet/{petId}', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet/abc-123', { method: 'DELETE' })
  })

  expect(response.status).toEqual(501)
  expect(await response.text()).toEqual('Not Implemented')
})

it('POST http://localhost/v3/pet/:petId/uploadImage', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/pet/abc-123/uploadImage', {
      method: 'POST',
    })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/json')
  expect(await response.json()).toEqual({
    code: expect.any(Number),
    message: expect.any(String),
    type: expect.any(String),
  })
})

/**
 * Inventory.
 */
it('GET /store/inventory', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/store/inventory')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/json')

  const json = await response.json()
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
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/store/order', { method: 'POST' })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/json')
  expect(await response.json()).toEqual(entities.order)
})

it('GET /store/order/{orderId}', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/store/order/abc-123')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(entities.order)
})

/**
 * User.
 */
it('POST /user', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/user', { method: 'POST' })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/json')
  expect(await response.json()).toEqual(entities.user)
})

it('POST /user/createWithList', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/user/createWithList', {
      method: 'POST',
    })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(entities.user)
})

it('GET /user/login', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/user/login')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.text()).toEqual(expect.any(String))
})

it('GET /user/logout', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/user/logout')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual(null)
  expect(await response.text()).toEqual('')
})

it('GET /user/:username', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/user/john-james')
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual('application/xml')
  expect(await response.json()).toEqual(entities.user)
})

it('PUT /user/:username', async () => {
  const response = await withHandlers(handlers, () => {
    return fetch('http://localhost/v3/user/john-james', { method: 'PUT' })
  })

  expect(response.status).toEqual(200)
  expect(response.headers.get('content-type')).toEqual(null)
  expect(await response.text()).toEqual('')
})

it('DELETE /user/:username', async () => {
  // Does not describe the 200 response example.
  await expect(
    await withHandlers(handlers, () => {
      return fetch('http://localhost/v3/user/john-james', {
        method: 'DELETE',
      })
    }),
  ).toEqualResponse(new Response('Not Implemented', { status: 501 }))
})
