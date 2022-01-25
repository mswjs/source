import type { OpenAPIV3 } from 'openapi-types'
import { evolveString } from './types/string'
import { evolveInteger } from './types/integer'
import { evolveBoolean } from './types/boolean'
import { evolveNumber } from './types/number'
import { evolveArray } from './types/array'
import { evolveObject } from './types/object'

export function evolveJsonSchema(
  schema: OpenAPIV3.SchemaObject,
): string | number | boolean | unknown[] | Record<string, unknown> | undefined {
  // Always use an explicit example first.
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
