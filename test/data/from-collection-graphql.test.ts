import z from 'zod'
import { Collection } from '@msw/data'
import { fromCollection } from '../../src/data/from-collection'

it('', async () => {
  const users = new Collection({
    schema: z.object({
      id: z.number(),
      name: z.string(),
    }),
  })
  await users.create({ id: 1, name: 'John' })
  await users.create({ id: 2, name: 'Kate' })

  const handlers = fromCollection(users, {
    name: 'users',
    key: 'id',
  })
})
