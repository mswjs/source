import { Collection } from '@msw/data'
import { GraphQLHandler } from 'msw'
import { z } from 'zod'
import { fromCollection } from '../../src/data/from-collection.js'
import { withHandlers } from '../support/with-handlers.js'

const graphqlUrl = 'https://api.example.com/graphql'

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  subscribed: z.boolean().default(false),
})

function createUsersCollection() {
  return new Collection({ schema: userSchema })
}

async function seedUsers(users: ReturnType<typeof createUsersCollection>) {
  await users.create({ id: 'abc-123', name: 'John', age: 32 })
  await users.create({ id: 'def-456', name: 'Kate', age: 27, subscribed: true })
  await users.create({ id: 'ghi-789', name: 'Alice', age: 40 })
}

interface GraphQLOperationInput {
  query: string
  variables?: Record<string, unknown>
  operationName?: string
}

async function executeOperation(
  input: GraphQLOperationInput,
  url: string = graphqlUrl,
) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  return response.json()
}

it('generates a single graphql handler', () => {
  const users = createUsersCollection()
  const handlers = fromCollection(users, { format: 'graphql', name: 'user' })

  expect(handlers).toHaveLength(1)
  expect(handlers[0]).toBeInstanceOf(GraphQLHandler)
})

it('throws when the "name" option is missing', () => {
  const users = createUsersCollection()

  expect(() => {
    // @ts-expect-error Intentionally missing the required "name" option.
    fromCollection(users, { format: 'graphql' })
  }).toThrow(
    'Failed to generate GraphQL handlers from collection: expected the "name" option to be a non-empty string',
  )
})

it('throws when the derived plural name equals the singular name', () => {
  const users = createUsersCollection()

  expect(() => {
    fromCollection(users, {
      format: 'graphql',
      name: 'series',
    })
  }).toThrow(
    'Failed to generate GraphQL handlers from collection: the plural form of the "name" option ("series") equals its singular form',
  )
})

it('derives irregular plural operation names', async () => {
  const people = new Collection({
    schema: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })
  await people.create({ id: 'abc-123', name: 'John' })

  const result = await withHandlers(
    fromCollection(people, {
      format: 'graphql',
      name: 'person',
      baseUrl: graphqlUrl,
    }),
    () =>
      executeOperation({
        query: `query ListPeople { people { name } }`,
      }),
  )

  expect(result).toEqual({
    data: {
      people: [{ name: 'John' }],
    },
  })
})

describe('queries', () => {
  it('returns all records with the selected fields only', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users { id name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [
          { id: 'abc-123', name: 'John' },
          { id: 'def-456', name: 'Kate' },
          { id: 'ghi-789', name: 'Alice' },
        ],
      },
    })
  })

  it('supports the "equals" comparator in the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(where: { name: { equals: "Kate" } }) { id } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ id: 'def-456' }],
      },
    })
  })

  it('supports the "contains" comparator in the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(where: { name: { contains: "o" } }) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'John' }],
      },
    })
  })

  it('supports the number comparators in the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(where: { age: { gt: 30, lt: 40 } }) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'John' }],
      },
    })
  })

  it('supports the "in" comparator in the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(where: { id: { in: ["abc-123", "ghi-789"] } }) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'John' }, { name: 'Alice' }],
      },
    })
  })

  it('supports the boolean comparators in the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(where: { subscribed: { equals: true } }) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'Kate' }],
      },
    })
  })

  it('supports the "where" argument provided as a typed variable', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers($where: UserWhereInput) { users(where: $where) { name } }`,
          variables: {
            where: { age: { gte: 40 } },
          },
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'Alice' }],
      },
    })
  })

  it('returns the first matching record for the singular query', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query GetUser { user(where: { id: { equals: "def-456" } }) { id name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        user: { id: 'def-456', name: 'Kate' },
      },
    })
  })

  it('returns null for the singular query without matches', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query GetUser { user(where: { id: { equals: "unknown" } }) { id } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        user: null,
      },
    })
  })

  it('supports offset-based pagination', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(skip: 1, take: 1) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'Kate' }],
      },
    })
  })

  it('supports cursor-based pagination', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(cursor: "def-456", take: 2) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [{ name: 'Kate' }, { name: 'Alice' }],
      },
    })
  })

  it('returns an empty list for an unknown cursor', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users(cursor: "unknown") { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [],
      },
    })
  })

  it('executes the operation matching the "operationName"', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `
query ListUsers { users { id } }
query GetKate { user(where: { name: { equals: "Kate" } }) { name } }
`,
          operationName: 'GetKate',
        }),
    )

    expect(result).toEqual({
      data: {
        user: { name: 'Kate' },
      },
    })
  })

  it('returns validation errors for fields absent from all records', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users { unknownField } }`,
        }),
    )

    expect(result.data).toBeUndefined()
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('Cannot query field "unknownField"'),
      }),
    ])
  })

  it('returns an empty list for an empty collection', async () => {
    const users = createUsersCollection()

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query ListUsers { users { id } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        users: [],
      },
    })
  })
})

describe('mutations', () => {
  it('creates a new record from an inline "data" literal', async () => {
    const users = createUsersCollection()

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          /**
           * @note The properties of the "data" argument are selectable
           * even though the collection is empty: the argument values
           * are used as additional type inference samples.
           */
          query: `mutation CreateUser { createUser(data: { id: "abc-123", name: "John", age: 32 }) { id name age } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        createUser: { id: 'abc-123', name: 'John', age: 32 },
      },
    })
    expect(users.count()).toBe(1)
  })

  it('creates a new record from the "data" variable', async () => {
    const users = createUsersCollection()

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation CreateUser($data: UserInput!) { createUser(data: $data) { id name } }`,
          variables: {
            data: { id: 'abc-123', name: 'John', age: 32 },
          },
        }),
    )

    expect(result).toEqual({
      data: {
        createUser: { id: 'abc-123', name: 'John' },
      },
    })
    expect(users.count()).toBe(1)
  })

  it('rejects the "data" argument with unknown properties', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation CreateUser { createUser(data: { id: "xyz-000", unknownProperty: true }) { id } }`,
        }),
    )

    expect(result.data).toBeUndefined()
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining(
          'Field "unknownProperty" is not defined by type "UserInput"',
        ),
      }),
    ])
    expect(users.count()).toBe(3)
  })

  it('returns errors for initial values not matching the schema', async () => {
    const users = createUsersCollection()
    vi.spyOn(console, 'error').mockImplementation(() => void 0)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation CreateUser { createUser(data: { id: "abc-123" }) { id } }`,
        }),
    )

    expect(result.data).toEqual({ createUser: null })
    expect(result.errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('does not match the schema'),
      }),
    ])
    expect(users.count()).toBe(0)
  })

  it('updates the first record matching the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation UpdateUser { updateUser(where: { id: { equals: "abc-123" } }, data: { name: "Johnatan" }) { id name age } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        updateUser: { id: 'abc-123', name: 'Johnatan', age: 32 },
      },
    })
    expect(users.findFirst((query) => query.where({ id: 'abc-123' }))).toEqual({
      id: 'abc-123',
      name: 'Johnatan',
      age: 32,
      subscribed: false,
    })
  })

  it('returns errors when updating a non-existing record', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation UpdateUser { updateUser(where: { id: { equals: "unknown" } }, data: { name: "Nobody" }) { id } }`,
        }),
    )

    expect(result.data).toEqual({ updateUser: null })
    expect(result.errors).toEqual([
      expect.objectContaining({
        message:
          'Failed to execute "update" on collection: no record found matching the query',
      }),
    ])
  })

  it('updates all records matching the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation UpdateUsers { updateUsers(where: { age: { gte: 30 } }, data: { subscribed: true }) { name subscribed } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        updateUsers: [
          { name: 'John', subscribed: true },
          { name: 'Alice', subscribed: true },
        ],
      },
    })
  })

  it('deletes the first record matching the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation DeleteUser { deleteUser(where: { id: { equals: "def-456" } }) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        deleteUser: { name: 'Kate' },
      },
    })
    expect(users.count()).toBe(2)
  })

  it('returns errors when deleting a non-existing record', async () => {
    const users = createUsersCollection()

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation DeleteUser { deleteUser(where: { id: { equals: "unknown" } }) { id } }`,
        }),
    )

    expect(result.data).toEqual({ deleteUser: null })
    expect(result.errors).toEqual([
      expect.objectContaining({
        message:
          'Failed to execute "delete" on collection: no record found matching the query',
      }),
    ])
  })

  it('deletes all records matching the "where" argument', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `mutation DeleteUsers { deleteUsers(where: { age: { lt: 40 } }) { name } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        deleteUsers: [{ name: 'John' }, { name: 'Kate' }],
      },
    })
    expect(users.count()).toBe(1)
  })

  it('creates records in an empty collection', async () => {
    const users = createUsersCollection()

    const result = await withHandlers(
      fromCollection(users, {
        format: 'graphql',
        name: 'user',
        baseUrl: graphqlUrl,
      }),
      async () => {
        await executeOperation({
          query: `mutation CreateUser($data: UserInput!) { createUser(data: $data) { id } }`,
          variables: {
            data: { id: 'abc-123', name: 'John', age: 32 },
          },
        })

        // The schema is inferred per request so the newly created
        // record is immediately queryable with its actual fields.
        return executeOperation({
          query: `query ListUsers { users { id name } }`,
        })
      },
    )

    expect(result).toEqual({
      data: {
        users: [{ id: 'abc-123', name: 'John' }],
      },
    })
  })
})

describe('endpoint scoping', () => {
  it('matches any endpoint without the "baseUrl" option', async () => {
    const users = createUsersCollection()
    await seedUsers(users)

    const result = await withHandlers(
      fromCollection(users, { format: 'graphql', name: 'user' }),
      () =>
        executeOperation(
          { query: `query ListUsers { users { id } }` },
          'https://another.example.com/api',
        ),
    )

    expect(result.data.users).toHaveLength(3)
  })
})

describe('relations', () => {
  it('supports querying records with circular relations', async () => {
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

    const result = await withHandlers(
      fromCollection(authors, {
        format: 'graphql',
        name: 'author',
        baseUrl: graphqlUrl,
      }),
      () =>
        executeOperation({
          query: `query GetAuthor { author(where: { id: { equals: "abc-123" } }) { id posts { title } } }`,
        }),
    )

    expect(result).toEqual({
      data: {
        author: {
          id: 'abc-123',
          posts: [{ title: 'First' }],
        },
      },
    })
  })
})
