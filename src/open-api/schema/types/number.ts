import { datatype } from 'faker'
import { OpenAPIV3 } from 'openapi-types'

export function evolveNumber(schema: OpenAPIV3.SchemaObject): number {
  return datatype.number({
    min: schema.minimum,
    max: schema.maximum,
  })
}
