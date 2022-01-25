import { RequestHandler, rest } from 'msw'
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import * as SwaggerParser from '@apidevtools/swagger-parser'
import { createResponseResolver } from './response/createResponseResolver'
import { normalizeSwaggerUrl } from './utils/normalizeSwaggerUrl'

const parser = new SwaggerParser()

/**
 * Generates request handlers from the given OpenAPI V2/V3 document.
 */
export async function fromOpenApi(
  document: string | OpenAPIV3.Document | OpenAPIV2.Document,
): Promise<RequestHandler[]> {
  const specification = await parser.dereference(document)

  const handlers = Object.entries(specification.paths).reduce<RequestHandler[]>(
    (
      handlers,
      [url, pathItem]: [
        string,
        OpenAPIV2.PathItemObject | OpenAPIV3.PathItemObject,
      ],
    ) => {
      for (const key of Object.keys(pathItem)) {
        const method = key as unknown as keyof OpenAPIV2.PathItemObject

        if (
          method !== 'get' &&
          method !== 'put' &&
          method !== 'post' &&
          method !== 'delete' &&
          method !== 'options' &&
          method !== 'head' &&
          method !== 'patch'
        ) {
          continue
        }

        const operation = pathItem[method] as OpenAPIV3.OperationObject
        if (!operation) {
          continue
        }

        const baseUrl =
          'basePath' in specification
            ? specification.basePath
            : window.document.baseURI

        const resolvedUrl = new URL(normalizeSwaggerUrl(url), baseUrl).href

        const handler = rest[method](
          resolvedUrl,
          createResponseResolver(operation),
        )

        handlers.push(handler)
      }

      return handlers
    },
    [],
  )

  return handlers
}
