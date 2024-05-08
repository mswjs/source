import { datatype, random } from 'faker'
import { OpenAPIV3 } from 'openapi-types'
import { invariant } from 'outvariant'
import { repeat } from '../../utils/repeat.js'
import { evolveJsonSchema } from '../evolve.js'

export function evolveObject(
  schema: OpenAPIV3.NonArraySchemaObject,
): Record<string, unknown> {
  // Always us an explicit example, if provided.
  if (schema.example) {
    return schema.example
  }

  const json: Record<string, unknown> = {}

  // Support explicit "properties".
  if (schema.properties) {
    for (const [key, propertyDefinition] of Object.entries(schema.properties)) {
      invariant(
        !('$ref' in propertyDefinition),
        'Failed to generate mock from the schema property definition (%j): found unresolved reference.',
        propertyDefinition,
      )

      const value = evolveJsonSchema(propertyDefinition)
      if (typeof value !== 'undefined') {
        json[key] = value
      }
    }
  }

  // Support "additionalProperties".
  if (schema.additionalProperties) {
    const additionalPropertiesSchema = schema.additionalProperties

    if (additionalPropertiesSchema === true) {
      repeat(0, 4, () => {
        const propertyName = random.word().toLowerCase()
        json[propertyName] = datatype.string()
      })

      return json
    }

    invariant(
      !('$ref' in additionalPropertiesSchema),
      'Failed to generate mock from the "additionalProperties" schema: found unresolved reference.',
    )

    repeat(0, 4, () => {
      const propertyName = random.word().toLowerCase()
      json[propertyName] = evolveJsonSchema(additionalPropertiesSchema)
    })
  }

  return json
}
