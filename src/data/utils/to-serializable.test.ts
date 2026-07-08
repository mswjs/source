import { toSerializable } from './to-serializable.js'

it('returns primitives as-is', () => {
  expect(toSerializable('hello')).toBe('hello')
  expect(toSerializable(123)).toBe(123)
  expect(toSerializable(false)).toBe(false)
  expect(toSerializable(null)).toBe(null)
  expect(toSerializable(undefined)).toBe(undefined)
})

it('serializes plain objects and arrays', () => {
  expect(
    toSerializable({ id: 1, tags: ['a', 'b'], nested: { value: true } }),
  ).toEqual({ id: 1, tags: ['a', 'b'], nested: { value: true } })
})

it('resolves enumerable getter properties', () => {
  const object = {}
  Object.defineProperty(object, 'computed', {
    enumerable: true,
    get() {
      return 'resolved'
    },
  })

  expect(toSerializable(object)).toEqual({ computed: 'resolved' })
})

it('respects custom "toJSON" methods', () => {
  const date = new Date('2000-01-01T00:00:00.000Z')

  expect(toSerializable({ createdAt: date })).toEqual({
    createdAt: '2000-01-01T00:00:00.000Z',
  })
})

it('omits circular references', () => {
  const user: Record<string, unknown> = { id: 1 }
  const post: Record<string, unknown> = { title: 'First', author: user }
  user.posts = [post]

  expect(toSerializable(user)).toEqual({
    id: 1,
    posts: [{ title: 'First' }],
  })
})

it('preserves repeated non-circular references', () => {
  const author = { name: 'John' }
  const library = { books: [{ author }, { author }] }

  expect(toSerializable(library)).toEqual({
    books: [{ author: { name: 'John' } }, { author: { name: 'John' } }],
  })
})
