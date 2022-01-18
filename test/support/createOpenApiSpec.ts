import { OpenAPI } from 'openapi-types'

export function createOpenApiSpec(
  document: Partial<OpenAPI.Document>,
): OpenAPI.Document {
  return Object.assign(
    {},
    {
      openapi: '3.0.0',
      info: {
        title: 'Test Specification',
        version: '0.0.0',
      },
      paths: {},
    },
    document,
  )
}
