import { evolveJsonSchema } from '../../src/fromOpenApi/fromOpenApi'

describe('string', () => {
  it('supports a plain string value', () => {
    const data = evolveJsonSchema({
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
        },
      },
    })
    expect(data).toEqual({ firstName: 'G}cw!,=}.6' })
  })

  it('supports the "example" value', () => {
    const data = evolveJsonSchema({
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          example: 'John',
        },
      },
    })
    expect(data).toEqual({ firstName: 'John' })
  })

  it('supports "minLength"', () => {
    const data = evolveJsonSchema({
      type: 'object',
      properties: {
        email: {
          type: 'string',
          minLength: 10,
        },
      },
    })
    expect(data).toEqual({ email: expect.stringMatching(/^\S{10,}$/) })
  })

  it('supports the "pattern" expression', () => {
    const json = evolveJsonSchema({
      type: 'object',
      properties: {
        otp: {
          type: 'string',
          pattern: '^[0-9]{3}-[0-9]{3}$',
        },
      },
    })
    expect(json).toEqual({ otp: expect.stringMatching(/^[0-9]{3}-[0-9]{3}$/) })
  })

  it('supports the "uuid" format', () => {
    const json = evolveJsonSchema({
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
        },
      },
    })
    expect(json).toEqual({ id: '65a837e3-08ae-4678-a2f3-ccbfc51b8ede' })
  })

  it('supports the "email" format', () => {
    const json = evolveJsonSchema({
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
        },
      },
    })
    expect(json).toEqual({ email: 'Arvel27@hotmail.com' })
  })

  it('supports the "password" format', () => {
    const json = evolveJsonSchema({
      type: 'object',
      properties: {
        password: {
          type: 'string',
          format: 'password',
        },
      },
    })
    expect(json).toEqual({ password: '1tYIHS3bbkpHh_h' })
  })
})

describe('boolean', () => {
  it('supports a plain boolean value', () => {
    const json = evolveJsonSchema({
      type: 'object',
      properties: {
        isNewUser: {
          type: 'boolean',
        },
      },
    })
    expect(json).toEqual({ isNewUser: false })
  })

  it('supports the "example" value', () => {
    const json = evolveJsonSchema({
      type: 'object',
      properties: {
        subscribed: {
          type: 'boolean',
          example: true,
        },
      },
    })
    expect(json).toEqual({ subscribed: true })
  })
})

describe('number', () => {
  it('supports a plain number value', () => {
    const number = evolveJsonSchema({ type: 'number' })
    expect(number).toEqual(28044)
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

describe('array', () => {
  it('supports a plain array of numbers', () => {
    const array = evolveJsonSchema({
      type: 'array',
      items: { type: 'number' },
    })
    expect(array).toEqual([7336, 44789])
  })

  it('supports a plain array of strings', () => {
    const array = evolveJsonSchema({
      type: 'array',
      items: { type: 'string' },
    })
    expect(array).toEqual([
      'u)<u;,-Q"(',
      '`v4u9<NW%U',
      'VZ.yW9b6*R',
      'GyaNGS%hR%',
    ])
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
    })
    expect(array).toEqual([
      {
        id: '28cf09ee-8272-4ec6-a82a-e559cab2eb9a',
        title: 'fAAg:BtgHr',
      },
      {
        id: 'f0a7911c-f175-49f6-a3ce-c940c925980e',
        title: 'bBLuhZL":w',
      },
      {
        id: 'db8f1272-be3b-4713-88c3-e0b812060108',
        title: '7*p;S6Tzo:',
      },
      {
        id: '134199f6-850d-4c43-bc96-6dcb68625021',
        title: 'x%v*i5Zc$U',
      },
      {
        id: 'a0214f59-4314-42b2-bf95-f0db34739fde',
        title: '/g"]\'$NlYg',
      },
    ])
  })

  it('supports nested arrays', () => {
    const data = evolveJsonSchema({
      type: 'array',
      items: {
        type: 'array',
        items: { type: 'number' },
      },
    })
    expect(data).toEqual([
      [31736, 53182, 98861, 10933],
      [14603, 38014, 50878, 55094],
      [74533, 91644, 66923],
      [26491, 13226, 6633, 76424],
    ])
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
    })
    expect(data).toEqual({
      id: '451bb8cb-e2ea-4063-b9cf-6fe83e0ae647',
      firstName: '0Y#TKwlvCE',
      age: 67,
    })
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
    })
    expect(data).toEqual({
      firstName: 'z$1A,(-aP"',
      nested: {
        isNested: false,
      },
    })
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
