import { evolveJsonSchema } from '../../src/fromOpenApi/fromOpenApi'

describe('string', () => {
  it('supports a plain string value', () => {
    const value = evolveJsonSchema({
      type: 'string',
    })
    expect(value).toMatch(/^\S+$/)
  })

  it('supports the "example" value', () => {
    const value = evolveJsonSchema({
      type: 'string',
      example: 'John',
    })
    // Explicit examples are always used as-is.
    expect(value).toEqual('John')
  })

  it('supports "minLength"', () => {
    const value = evolveJsonSchema({
      type: 'string',
      minLength: 10,
    })
    expect(value).toMatch(/^\S{10,}$/)
  })

  it('supports the "pattern" expression', () => {
    const value = evolveJsonSchema({
      type: 'string',
      pattern: '^[0-9]{3}-[0-9]{3}$',
    })
    expect(value).toMatch(/^[0-9]{3}-[0-9]{3}$/)
  })

  it('supports the "enum" value', () => {
    const value = evolveJsonSchema({
      type: 'string',
      enum: ['active', 'pending', 'stale'],
    })

    expect(value).toMatch(/^(active|pending|stale)$/)
  })

  it('supports the "uuid" format', () => {
    const value = evolveJsonSchema({
      type: 'string',
      format: 'uuid',
    })
    expect(value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('supports the "email" format', () => {
    const value = evolveJsonSchema({
      type: 'string',
      format: 'email',
    })
    expect(value).toMatch(/^\S+@\S+\.\w+$/)
  })

  it('supports the "password" format', () => {
    const value = evolveJsonSchema({
      type: 'string',
      format: 'password',
    })
    expect(value).toMatch(/^\S+$/)
  })
})

describe('boolean', () => {
  it('supports a plain boolean value', () => {
    const value = evolveJsonSchema({
      type: 'boolean',
    }) as boolean
    expect(typeof value).toEqual('boolean')
  })

  it('supports the "example" value', () => {
    const value = evolveJsonSchema({
      type: 'boolean',
      example: true,
    })
    expect(value).toEqual(true)
  })
})

describe('number', () => {
  it('supports a plain number value', () => {
    const number = evolveJsonSchema({ type: 'number' })
    expect(typeof number).toEqual('number')
  })

  it('supports the "minimum" option', () => {
    const number = evolveJsonSchema({
      type: 'number',
      minimum: 100,
    })
    expect(number).toBeGreaterThanOrEqual(100)
  })

  it('supports the "maximum" option', () => {
    const number = evolveJsonSchema({
      type: 'number',
      maximum: 50,
    })
    expect(number).toBeLessThanOrEqual(50)
  })

  it('supports both the "minimum" and "maximum" options', () => {
    const number = evolveJsonSchema({
      type: 'number',
      minimum: 25,
      maximum: 50,
    })
    expect(number).toBeGreaterThanOrEqual(25)
    expect(number).toBeLessThanOrEqual(50)
  })
})

describe('integer', () => {
  it('supports a plain integer', () => {
    const number = evolveJsonSchema({
      type: 'integer',
    }) as number
    expect(number.toString()).toMatch(/^\d+\.\d+$/)
  })

  it('supports the "minimum" option', () => {
    const number = evolveJsonSchema({
      type: 'integer',
      minimum: 100,
    })
    expect(number).toBeGreaterThanOrEqual(100)
  })

  it('supports the "maximum" option', () => {
    const number = evolveJsonSchema({
      type: 'integer',
      maximum: 100,
    })
    expect(number).toBeLessThanOrEqual(100)
  })

  it('suports both the "minimum" and "maximum" options', () => {
    const number = evolveJsonSchema({
      type: 'integer',
      minimum: 100,
      maximum: 100,
    })
    expect(number).toBeGreaterThanOrEqual(100)
    expect(number).toBeLessThanOrEqual(100)
  })

  it('supports a "int64" format integer', () => {
    const number = evolveJsonSchema({
      type: 'integer',
      format: 'int64',
    }) as number
    expect(number.toString()).toMatch(/^\d+$/)
  })
})

describe('array', () => {
  it('supports a plain array of numbers', () => {
    const array = evolveJsonSchema({
      type: 'array',
      items: { type: 'number' },
    }) as number[]

    expect(array).toBeInstanceOf(Array)
    array.forEach((value) => {
      expect(typeof value).toEqual('number')
    })
  })

  it('supports a plain array of strings', () => {
    const array = evolveJsonSchema({
      type: 'array',
      items: { type: 'string' },
    }) as string[]

    expect(array).toBeInstanceOf(Array)
    array.forEach((value) => {
      expect(value).toMatch(/^\S+$/)
    })
  })

  it('supports a plain array of objects', () => {
    const array = evolveJsonSchema({
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          title: { type: 'string' },
        },
      },
    }) as Array<{ id: string; title: string }>

    expect(array).toBeInstanceOf(Array)
    array.forEach((value) => {
      expect(value.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
      expect(value.title).toMatch(/^\S+$/)
    })
  })

  it('supports nested arrays', () => {
    const data = evolveJsonSchema({
      type: 'array',
      items: {
        type: 'array',
        items: { type: 'number' },
      },
    }) as number[][]

    expect(data).toBeInstanceOf(Array)
    data.forEach((value) => {
      expect(value).toBeInstanceOf(Array)
      value.forEach((number) => {
        expect(typeof number).toEqual('number')
      })
    })
  })

  it('supports the "minLength" option', () => {
    const data = evolveJsonSchema({
      type: 'array',
      minLength: 10,
      items: { type: 'number' },
    }) as number[]
    expect(data.length).toBeGreaterThanOrEqual(10)
  })

  it('supports the "maxLength" option', () => {
    const data = evolveJsonSchema({
      type: 'array',
      maxLength: 10,
      items: { type: 'number' },
    }) as number[]
    expect(data.length).toBeLessThanOrEqual(10)
  })
})

describe('object', () => {
  it('supports a plain object', () => {
    const data = evolveJsonSchema({
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
        },
        firstName: {
          type: 'string',
        },
        age: {
          type: 'number',
          minimum: 18,
          maximum: 99,
        },
      },
    }) as Record<string, unknown>
    expect(Object.keys(data)).toEqual(['id', 'firstName', 'age'])

    expect(data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(data.firstName).toMatch(/^\S+$/)
    expect(data.age).toBeGreaterThanOrEqual(18)
    expect(data.age).toBeLessThanOrEqual(99)
  })

  it('supports a nested object', () => {
    const data = evolveJsonSchema({
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
        },
        nested: {
          type: 'object',
          properties: {
            isNested: {
              type: 'boolean',
            },
          },
        },
      },
    }) as { firstName: string; nested: { isNested: boolean } }

    expect(Object.keys(data)).toEqual(['firstName', 'nested'])
    expect(data.firstName).toMatch(/^\S+$/)
    expect(Object.keys(data.nested)).toEqual(['isNested'])
    expect(typeof data.nested.isNested).toEqual('boolean')
  })

  it('supports the "example" value', () => {
    const data = evolveJsonSchema({
      type: 'object',
      example: {
        id: 'abc-123',
        firstName: 'John',
      },
    })
    expect(data).toEqual({
      id: 'abc-123',
      firstName: 'John',
    })
  })
})