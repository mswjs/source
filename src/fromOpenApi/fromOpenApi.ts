import { RequestHandler, rest } from 'msw'
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import SwaggerParser from '@apidevtools/swagger-parser'
import { createResponseResolver } from './response/createResponseResolver'
import { normalizeSwaggerUrl } from './utils/normalizeSwaggerUrl'
import { getServers } from './utils/getServers'
import { isAbsoluteUrl, joinPaths } from './utils/url'

/**
 * Generates request handlers from the given OpenAPI V2/V3 document.
 */
export async function fromOpenApi(
  document: string | OpenAPIV3.Document | OpenAPIV2.Document,
): Promise<Array<RequestHandler>> {
  const specification = await SwaggerParser.dereference(document)

  const handlers = Object.entries(specification.paths).reduce<
    Array<RequestHandler>
  >(
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

        const serverUrls = getServers(specification)

        for (const baseUrl of serverUrls) {
          const path = normalizeSwaggerUrl(url)
          const requestUrl = isAbsoluteUrl(baseUrl)
            ? new URL(path, baseUrl).href
            : joinPaths(path, baseUrl)

          handlers.push(
            rest[method](requestUrl, createResponseResolver(operation)),
          )
        }
      }

      return handlers
    },
    [],
  )

  return handlers
}
