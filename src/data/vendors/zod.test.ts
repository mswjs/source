import z from 'zod'
import { toGraphQLType } from './zod.js'
import { printType } from 'graphql'

it('...', () => {
  expect(printType(toGraphQLType('User', z.object({ name: z.string() })))).toBe(
    `\
type User {
  name: String
}`,
  )
})

it('arrays', () => {
  expect(
    printType(
      toGraphQLType(
        'User',
        z.object({
          numbers: z.array(z.string()),
        }),
      ),
    ),
  ).toBe(
    `\
type User {
  numbers: [String]
}`,
  )
})

it('nested objects', () => {
  expect(
    printType(
      toGraphQLType(
        'User',
        z.object({
          address: z.object({
            street: z.string(),
          }),
        }),
      ),
    ),
  ).toBe(
    `\
type User {
  address: ???
}`,
  )
})
