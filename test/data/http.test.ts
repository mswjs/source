import { Collection } from '@msw/data'
import { z } from 'zod'
import { fromCollection } from '../../src/data/from-collection.js'
import { withHandlers } from '../support/with-handlers.js'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  roles: z.array(z.string()).default([]),
  address: z
    .object({
      city: z.string(),
    })
    .optional(),
  nickname: z.string().optional(),
})

function createUsersCollection() {
  return new Collection({ schema: userSchema })
}

const baseUrl = 'https://api.example.com/users'

it('generates handlers relative to the root by default', () => {
  const users = createUsersCollection()
  const handlers = fromCollection(users)

  expect(
    handlers.map((handler) => `${handler.info.method} ${handler.info.path}`),
  ).toEqual([
    'GET /',
    'GET /:id',
    'POST /',
    'PUT /:id',
    'PATCH /:id',
    'DELETE /:id',
  ])
})

it('generates handlers relative to the custom base url', () => {
  const users = createUsersCollection()
  const handlers = fromCollection(users, { baseUrl })

  expect(
    handlers.map((handler) => `${handler.info.method} ${handler.info.path}`),
  ).toEqual([
    `GET ${baseUrl}`,
    `GET ${baseUrl}/:id`,
    `POST ${baseUrl}`,
    `PUT ${baseUrl}/:id`,
    `PATCH ${baseUrl}/:id`,
    `DELETE ${baseUrl}/:id`,
  ])
})

describe('GET (list)', () => {
  it('returns all records', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John' })
    await users.create({ id: 'def-456', name: 'Kate' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(baseUrl),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual([
      { id: 'abc-123', name: 'John', roles: [] },
      { id: 'def-456', name: 'Kate', roles: [] },
    ])
  })

  it('filters records by a query parameter', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John' })
    await users.create({ id: 'def-456', name: 'Kate' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}?name=Kate`),
    )

    await expect(response.json()).resolves.toEqual([
      { id: 'def-456', name: 'Kate', roles: [] },
    ])
  })

  it('filters records by a nested property query parameter', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John', address: { city: 'NY' } })
    await users.create({ id: 'def-456', name: 'Kate', address: { city: 'LA' } })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}?address.city=LA`),
    )

    await expect(response.json()).resolves.toEqual([
      { id: 'def-456', name: 'Kate', roles: [], address: { city: 'LA' } },
    ])
  })

  it('filters records by an array property query parameter', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John', roles: ['admin'] })
    await users.create({ id: 'def-456', name: 'Kate', roles: ['editor'] })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}?roles=admin`),
    )

    await expect(response.json()).resolves.toEqual([
      { id: 'abc-123', name: 'John', roles: ['admin'] },
    ])
  })

  it('returns an empty array when no records match the filters', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}?name=Unknown`),
    )

    await expect(response.json()).resolves.toEqual([])
  })

  it('supports offset-based pagination', async () => {
    const users = createUsersCollection()
    await users.createMany(5, (index) => ({
      id: `user-${index}`,
      name: `User ${index}`,
    }))

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}?skip=1&take=2`),
    )

    await expect(response.json()).resolves.toEqual([
      { id: 'user-1', name: 'User 1', roles: [] },
      { id: 'user-2', name: 'User 2', roles: [] },
    ])
  })

  it('returns a 400 response for invalid pagination parameters', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}?skip=-5`),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message:
        'Failed to query the collection: expected the "skip" query parameter to be a non-negative integer but got "-5".',
    })
  })
})

describe('GET (record)', () => {
  it('returns a record by its primary key', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}/abc-123`),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: 'abc-123',
      name: 'John',
      roles: [],
    })
  })

  it('supports non-string primary keys', async () => {
    const posts = new Collection({
      schema: z.object({
        id: z.number(),
        title: z.string(),
      }),
    })
    await posts.create({ id: 1, title: 'First' })
    await posts.create({ id: 2, title: 'Second' })

    const response = await withHandlers(
      fromCollection(posts, { baseUrl: 'https://api.example.com/posts' }),
      () => fetch('https://api.example.com/posts/2'),
    )

    await expect(response.json()).resolves.toEqual({ id: 2, title: 'Second' })
  })

  it('supports a custom primary key', async () => {
    const users = new Collection({
      schema: z.object({
        email: z.string(),
        name: z.string(),
      }),
    })
    await users.create({ email: 'john@example.com', name: 'John' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl, primaryKey: 'email' }),
      () => fetch(`${baseUrl}/john@example.com`),
    )

    await expect(response.json()).resolves.toEqual({
      email: 'john@example.com',
      name: 'John',
    })
  })

  it('returns a 404 response for a non-existing record', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () => fetch(`${baseUrl}/unknown`),
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      message:
        'Failed to execute "findFirst" on collection: no record found matching the query',
    })
  })
})

describe('POST', () => {
  it('creates a new record', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(baseUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: 'abc-123', name: 'John' }),
        }),
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({
      id: 'abc-123',
      name: 'John',
      roles: [],
    })
    expect(users.count()).toBe(1)
  })

  it('returns a 400 response for initial values not matching the schema', async () => {
    const users = createUsersCollection()
    vi.spyOn(console, 'error').mockImplementation(() => void 0)

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(baseUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: 'abc-123' }),
        }),
    )

    expect(response.status).toBe(400)
    expect(users.count()).toBe(0)
  })

  it('returns a 400 response for a malformed request body', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(baseUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'not-json',
        }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message:
        'Failed to handle the request: expected a valid JSON request body.',
    })
  })
})

describe('PUT', () => {
  it('replaces the record with the request body', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John', nickname: 'Johnny' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/abc-123`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'John Maverick' }),
        }),
    )

    expect(response.status).toBe(200)
    // The properties missing in the request body are removed
    // while the primary key is always preserved.
    await expect(response.json()).resolves.toEqual({
      id: 'abc-123',
      name: 'John Maverick',
      roles: [],
    })
    expect(users.findFirst((query) => query.where({ id: 'abc-123' }))).toEqual({
      id: 'abc-123',
      name: 'John Maverick',
      roles: [],
    })
  })

  it('returns a 400 response when the replaced record violates the schema', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John' })
    vi.spyOn(console, 'error').mockImplementation(() => void 0)

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/abc-123`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 123 }),
        }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message:
        'Failed to update a record with "id" equal to "abc-123": the updated record does not match the collection schema.',
    })
  })

  it('returns a 404 response for a non-existing record', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/unknown`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'John' }),
        }),
    )

    expect(response.status).toBe(404)
  })
})

describe('PATCH', () => {
  it('merges the request body into the record', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John', nickname: 'Johnny' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/abc-123`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'John Maverick' }),
        }),
    )

    expect(response.status).toBe(200)
    // The properties missing in the request body are preserved.
    await expect(response.json()).resolves.toEqual({
      id: 'abc-123',
      name: 'John Maverick',
      nickname: 'Johnny',
      roles: [],
    })
  })

  it('returns a 404 response for a non-existing record', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/unknown`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: 'John' }),
        }),
    )

    expect(response.status).toBe(404)
  })
})

describe('DELETE', () => {
  it('deletes a record by its primary key', async () => {
    const users = createUsersCollection()
    await users.create({ id: 'abc-123', name: 'John' })

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/abc-123`, {
          method: 'DELETE',
        }),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      id: 'abc-123',
      name: 'John',
      roles: [],
    })
    expect(users.count()).toBe(0)
  })

  it('returns a 404 response for a non-existing record', async () => {
    const users = createUsersCollection()

    const response = await withHandlers(
      fromCollection(users, { baseUrl }),
      () =>
        fetch(`${baseUrl}/unknown`, {
          method: 'DELETE',
        }),
    )

    expect(response.status).toBe(404)
  })
})

describe('relations', () => {
  it('serializes records with circular relations', async () => {
    const authorSchema = z.object({
      id: z.string(),
      get posts() {
        return z.array(postSchema).default([])
      },
    })
    const postSchema = z.object({
      title: z.string(),
      get author() {
        return authorSchema.optional()
      },
    })

    const authors = new Collection({ schema: authorSchema })
    const posts = new Collection({ schema: postSchema })

    authors.defineRelations(({ many }) => ({
      posts: many(posts),
    }))
    posts.defineRelations(({ one }) => ({
      author: one(authors),
    }))

    const author = await authors.create({ id: 'abc-123' })
    const post = await posts.create({ title: 'First', author })
    await authors.update(author, {
      data(draft) {
        draft.posts.push(post)
      },
    })

    const response = await withHandlers(
      fromCollection(authors, { baseUrl: 'https://api.example.com/authors' }),
      () => fetch('https://api.example.com/authors/abc-123'),
    )

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json.id).toBe('abc-123')
    expect(json.posts).toHaveLength(1)
    expect(json.posts[0].title).toBe('First')
    // The circular "author" reference on the related post is omitted.
    expect(json.posts[0].author).toBeUndefined()
  })
})
