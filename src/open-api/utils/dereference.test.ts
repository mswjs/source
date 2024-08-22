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
