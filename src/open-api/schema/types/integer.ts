import { datatype } from 'faker'
import { OpenAPIV3 } from 'openapi-types'

export function evolveInteger(schema: OpenAPIV3.SchemaObject): number {
  switch (schema.format) {
    case 'int16':
    case 'int32':
    case 'int64': {
      return datatype.number({
        min: schema.minimum,
        max: schema.maximum,
      })
    }

    default: {
      return datatype.float({
        min: schema.minimum,
        max: schema.maximum,
      })
    }
  }
}
