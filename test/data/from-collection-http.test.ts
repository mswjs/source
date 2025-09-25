import { z } from 'zod'
import { Collection } from '@msw/data'
import { HttpResponse } from 'msw'
import { fromCollection } from '../../src/data/from-collection.js'
import { withHandlers } from '../support/with-handlers.js'

it('generates a GET handler to return all records', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
    }),
  })
  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Kate' })

  const handlers = fromCollection({
    name: 'users',
    key: 'id',
    collection: users,
    baseUrl: 'http://localhost/',
  })

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users')
    }),
  ).resolves.toEqualResponse(
    HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Kate' },
    ]),
  )
})

it('generates a GET handler to return a single record by key', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
    }),
  })
  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Kate' })

  const handlers = fromCollection({
    name: 'users',
    key: 'id',
    collection: users,
    baseUrl: 'http://localhost/',
  })

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users/2')
    }),
  ).resolves.toEqualResponse(HttpResponse.json({ id: 2, name: 'Kate' }))
})

it('generates a POST handler to create new records', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
    }),
  })
  await users.create({ id: 1, name: 'John' })

  const handlers = fromCollection({
    name: 'users',
    key: 'id',
    collection: users,
    baseUrl: 'http://localhost/',
  })

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users', {
        method: 'POST',
        body: JSON.stringify({
          id: 2,
          name: 'Kate',
        }),
      })
    }),
  ).resolves.toEqualResponse(
    HttpResponse.json({ id: 2, name: 'Kate' }, { status: 201 }),
  )

  expect(users.all()).toEqual([
    { id: 1, name: 'John' },
    { id: 2, name: 'Kate' },
  ])
})

it('generates a PUT handler to update existing records', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
    }),
  })
  await users.create({ id: 1, name: 'John' })

  const handlers = fromCollection({
    name: 'users',
    key: 'id',
    collection: users,
    baseUrl: 'http://localhost/',
  })

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Johnatan' }),
      })
    }),
  ).resolves.toEqualResponse(HttpResponse.json({ id: 1, name: 'Johnatan' }))

  expect(users.all()).toEqual([{ id: 1, name: 'Johnatan' }])

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users/123-456', {
        method: 'PUT',
        body: JSON.stringify({ name: 'irrelevant' }),
      })
    }),
  ).resolves.toEqualResponse(new HttpResponse(null, { status: 404 }))
})

it('generates a DELETE handler to delete existing records', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
    }),
  })
  await users.create({ id: 1, name: 'John' })

  const handlers = fromCollection({
    name: 'users',
    key: 'id',
    collection: users,
    baseUrl: 'http://localhost/',
  })

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users/1', {
        method: 'DELETE',
        body: JSON.stringify({ name: 'Johnatan' }),
      })
    }),
  ).resolves.toEqualResponse(HttpResponse.json({ id: 1, name: 'John' }))

  expect(users.all()).toEqual([])

  await expect(
    withHandlers(handlers, () => {
      return fetch('http://localhost/users/123-456', {
        method: 'DELETE',
      })
    }),
  ).resolves.toEqualResponse(new HttpResponse(null, { status: 404 }))
})
