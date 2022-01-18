import fetch from 'cross-fetch'
import { seed } from 'faker'
import { OpenAPIV3 } from 'openapi-types'
import { fromOpenApi } from '../../src/fromOpenApi/fromOpenApi'
import { withHandlers } from '../../test/support/withHandlers'

async function withJsonSchema(
  schema: OpenAPIV3.SchemaObject,
): Promise<Record<string, unknown>> {
  const document: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Basic types',
      version: '1.0.0',
    },
    paths: {
      '/test': {
        get: {
          responses: {
            '200': {
              description: 'Test response',
              content: {
                'text/plain': {
                  schema,
                },
              },
            },
          },
        },
      },
    },
  }
  const handlers = await fromOpenApi(document)
  const res = await withHandlers(handlers, () => fetch('http://localhost/test'))
  return res.json()
}

beforeAll(() => {
  seed(1)
})

describe('string', () => {
  it('supports a plain string value', async () => {
    const json = await withJsonSchema({
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
        },
      },
    })
    expect(json).toEqual({ firstName: 'G}cw!,=}.6' })
  })

  it('supports the "example" value', async () => {
    const json = await withJsonSchema({
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          example: 'John',
        },
      },
    })
    expect(json).toEqual({ firstName: 'John' })
  })

  it('supports "minLength"', async () => {
    const json = await withJsonSchema({
      type: 'object',
      properties: {
        email: {
          type: 'string',
          minLength: 10,
        },
      },
    })
    expect(json).toEqual({ email: expect.stringMatching(/^\S{10,}$/) })
  })

  it('supports the "pattern" expression', async () => {
    const json = await withJsonSchema({
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

  it('supports the "uuid" format', async () => {
    const json = await withJsonSchema({
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

  it('supports the "email" format', async () => {
    const json = await withJsonSchema({
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

  it('supports the "password" format', async () => {
    const json = await withJsonSchema({
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
  it('supports a plain boolean value', async () => {
    const json = await withJsonSchema({
      type: 'object',
      properties: {
        isNewUser: {
          type: 'boolean',
        },
      },
    })
    expect(json).toEqual({ isNewUser: false })
  })

  it('supports the "example" value', async () => {
    const json = await withJsonSchema({
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
  it('supports a plain number value', async () => {
    const number = await withJsonSchema({ type: 'number' })
    expect(number).toEqual(28044)
  })

  it('supports the "minimum" option', async () => {
    const number = await withJsonSchema({
      type: 'number',
      minimum: 100,
    })
    expect(number).toBeGreaterThanOrEqual(100)
  })

  it('supports the "maximum" option', async () => {
    const number = await withJsonSchema({
      type: 'number',
      maximum: 50,
    })
    expect(number).toBeLessThanOrEqual(50)
  })

  it('supports both the "minimum" and "maximum" options', async () => {
    const number = await withJsonSchema({
      type: 'number',
      minimum: 25,
      maximum: 50,
    })
    expect(number).toBeGreaterThanOrEqual(25)
    expect(number).toBeLessThanOrEqual(50)
  })
})

describe('array', () => {
  it('supports a plain array of numbers', async () => {
    const array = await withJsonSchema({
      type: 'array',
      items: { type: 'number' },
    })
    expect(array).toEqual([7336, 44789])
  })

  it('supports a plain array of strings', async () => {
    const array = await withJsonSchema({
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

  it('supports a plain array of objects', async () => {
    const array = await withJsonSchema({
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

  it('supports nested arrays', async () => {
    const array = await withJsonSchema({
      type: 'array',
      items: {
        type: 'array',
        items: { type: 'number' },
      },
    })
    expect(array).toEqual([
      [31736, 53182, 98861, 10933],
      [14603, 38014, 50878, 55094],
      [74533, 91644, 66923],
      [26491, 13226, 6633, 76424],
    ])
  })

  it('supports the "minLength" option', async () => {
    const array = await withJsonSchema({
      type: 'array',
      minLength: 10,
      items: { type: 'number' },
    })
    expect(array.length).toBeGreaterThanOrEqual(10)
  })

  it('supports the "maxLength" option', async () => {
    const array = await withJsonSchema({
      type: 'array',
      maxLength: 10,
      items: { type: 'number' },
    })
    expect(array.length).toBeLessThanOrEqual(10)
  })
})

describe('object', () => {
  it.todo('supports everything')
})
