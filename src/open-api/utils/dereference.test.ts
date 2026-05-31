import { dereference } from './dereference.js'

it('follows chained $ref pointers to a leaf value', async () => {
  await expect(
    dereference({
      foo: {
        $ref: '#/components/schemas/A',
      },
      components: {
        schemas: {
          A: { $ref: '#/components/schemas/B' },
          B: { $ref: '#/components/schemas/C' },
          C: { type: 'string' },
        },
      },
    }),
  ).resolves.toMatchInlineSnapshot(`
    {
      "components": {
        "schemas": {
          "A": {
            "type": "string",
          },
          "B": {
            "type": "string",
          },
          "C": {
            "type": "string",
          },
        },
      },
      "foo": {
        "type": "string",
      },
    }
  `)
})

it('throws when a $ref chain is circular', async () => {
  await expect(
    dereference({
      foo: {
        $ref: '#/components/schemas/A',
      },
      components: {
        schemas: {
          A: { $ref: '#/components/schemas/B' },
          B: { $ref: '#/components/schemas/A' },
        },
      },
    }),
  ).rejects.toThrow(/circular \$ref chain/i)
})

it('dereferences', async () => {
  await expect(
    dereference({
      foo: {
        $ref: '#/components/schemas/User',
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              age: {
                type: 'string',
              },
              name: {
                $ref: '#/components/schemas/Name',
              },
            },
          },
          Name: {
            type: 'string',
          },
        },
      },
    }),
  ).resolves.toMatchInlineSnapshot(`
    {
      "components": {
        "schemas": {
          "Name": {
            "type": "string",
          },
          "User": {
            "properties": {
              "age": {
                "type": "string",
              },
              "name": {
                "type": "string",
              },
            },
            "type": "object",
          },
        },
      },
      "foo": {
        "properties": {
          "age": {
            "type": "string",
          },
          "name": {
            "type": "string",
          },
        },
        "type": "object",
      },
    }
  `)
})
