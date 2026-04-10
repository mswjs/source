import { mergeSchemas } from './merge-schemas.js'

it('merges flat objects', () => {
  expect(mergeSchemas({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
})

it('overrides primitive values with the source', () => {
  expect(mergeSchemas({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
})

it('deeply merges nested objects', () => {
  expect(
    mergeSchemas(
      { properties: { name: { type: 'string' } } },
      { properties: { age: { type: 'integer' } } },
    ),
  ).toEqual({
    properties: {
      name: { type: 'string' },
      age: { type: 'integer' },
    },
  })
})

it('concatenates arrays', () => {
  expect(mergeSchemas({ items: [1, 2] }, { items: [3, 4] })).toEqual({
    items: [1, 2, 3, 4],
  })
})

it('deduplicates primitive arrays', () => {
  expect(
    mergeSchemas({ required: ['id', 'name'] }, { required: ['name', 'email'] }),
  ).toEqual({ required: ['id', 'name', 'email'] })
})

it('returns source when target is not an object', () => {
  expect(mergeSchemas('string', { a: 1 })).toEqual({ a: 1 })
})

it('returns source when source is not an object', () => {
  expect(mergeSchemas({ a: 1 }, 'string')).toEqual('string')
})
