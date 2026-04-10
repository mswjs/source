import { dereference } from './dereference.js'

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

it('merges schemas defined using allOf', async () => {
  await expect(
    dereference({
      foo: {
        allOf: [
          {
            $ref: '#/components/schemas/User',
          },
          {
            type: 'object',
            properties: {
              street: { type: 'string' },
            },
          },
        ],
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
    }),
  ).resolves.toMatchInlineSnapshot(`
    {
      "components": {
        "schemas": {
          "User": {
            "properties": {
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
          "name": {
            "type": "string",
          },
          "street": {
            "type": "string",
          },
        },
        "type": "object",
      },
    }
  `)
})
