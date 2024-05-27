import type { OpenAPIV3 } from 'openapi-types'
import { evolveString } from './types/string.js'
import { evolveInteger } from './types/integer.js'
import { evolveBoolean } from './types/boolean.js'
import { evolveNumber } from './types/number.js'
import { evolveArray } from './types/array.js'
import { evolveObject } from './types/object.js'

export function evolveJsonSchema(
  schema: OpenAPIV3.SchemaObject,
): string | number | boolean | unknown[] | Record<string, unknown> | undefined {
  // Always use an explicit example first.
  // A "schema" field may equal an example if it's a resolved reference.
  if (schema.example) {
    return schema.example
  }

  switch (schema.type) {
    case 'string': {
      return evolveString(schema)
    }

    case 'integer': {
      return evolveInteger(schema)
    }

    case 'boolean': {
      return evolveBoolean()
    }

    case 'number': {
      return evolveNumber(schema)
    }

    case 'array': {
      return evolveArray(schema)
    }

    case 'object': {
      return evolveObject(schema)
    }
  }
}
