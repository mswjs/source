import { datatype } from 'faker'
import { OpenAPIV3 } from 'openapi-types'
import { invariant } from 'outvariant'
import { evolveJsonSchema } from '../evolve'

export function evolveArray(schema: OpenAPIV3.ArraySchemaObject): unknown[] {
  const { items: arraySchema } = schema

  invariant(
    !('$ref' in arraySchema),
    'Failed to generate mock from schema array (%j): found unresolved reference.',
    arraySchema,
  )

  const minLength = schema.minLength || 2
  const arrayLength = datatype.number({
    min: minLength,
    max: schema.maxLength || minLength + 4,
  })

  const value: unknown[] = new Array(arrayLength)
    .fill(null)
    .reduce<unknown[]>((array) => {
      const value = evolveJsonSchema(arraySchema)
      if (value) {
        // Push instead of concating to support
        // nested arrays.
        array.push(value)
      }
      return array
    }, [])

  return value
}
