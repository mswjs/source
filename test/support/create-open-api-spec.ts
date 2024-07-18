import { OpenAPI } from 'openapi-types'

export function createOpenApiSpec<T extends Partial<OpenAPI.Document>>(
  document: T,
) {
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
  ) satisfies T
}
