import { RequestHandler, HttpHandler, http } from 'msw'
import type { OpenAPIV3, OpenAPIV2, OpenAPI } from 'openapi-types'
import SwaggerParser from '@apidevtools/swagger-parser'
import { normalizeSwaggerPath } from './utils/normalize-swagger-path.js'
import { getServers } from './utils/get-servers.js'
import { isAbsoluteUrl, joinPaths } from './utils/url.js'
import { createResponseResolver } from './utils/open-api-utils.js'

type SupportedHttpMethods = keyof typeof http
const supportedHttpMethods = Object.keys(
  http,
) as unknown as SupportedHttpMethods

type OpenApiDocument =
  | string
  | OpenAPI.Document
  | OpenAPIV2.Document
  | OpenAPIV3.Document

type ExtractPaths<T> = T extends { paths: infer P } ? keyof P : never

export type MapOperationFunction<TPath extends string> = (args: {
  path: TPath
  method: SupportedHttpMethods
  operation: OpenAPIV3.OperationObject
  document: OpenApiDocument
}) => OpenAPIV3.OperationObject | undefined

/**
 * Generates request handlers from the given OpenAPI V2/V3 document.
 *
 * @example
 * import specification from './api.oas.json'
 * await fromOpenApi(specification)
 */

export async function fromOpenApi<T extends OpenApiDocument>(
  document: T,
  mapOperation?: MapOperationFunction<
    T extends string ? string : ExtractPaths<T>
  >,
): Promise<Array<RequestHandler>> {
  const specification = await SwaggerParser.dereference(document)
  const requestHandlers: Array<RequestHandler> = []

  if (typeof specification.paths === 'undefined') {
    return []
  }

  const pathItems = Object.entries(specification.paths ?? {})
  for (const item of pathItems) {
    const [path, handlers] = item as [ExtractPaths<T>, any]
    const pathItem = handlers as
      | OpenAPIV2.PathItemObject
      | OpenAPIV3.PathItemObject

    for (const key of Object.keys(pathItem)) {
      const method = key as keyof OpenAPIV2.PathItemObject

      // Ignore unsupported HTTP methods.
      if (!isSupportedHttpMethod(method)) {
        continue
      }

      const rawOperation = pathItem[method] as OpenAPIV3.OperationObject
      if (!rawOperation) {
        continue
      }

      const operation = mapOperation
        ? mapOperation({
            path,
            method,
            operation: rawOperation,
            document: specification,
          })
        : rawOperation

      if (!operation) {
        continue
      }

      const serverUrls = getServers(specification)

      for (const baseUrl of serverUrls) {
        const normalizedPath = normalizeSwaggerPath(path)
        const requestUrl = isAbsoluteUrl(baseUrl)
          ? new URL(normalizedPath, baseUrl).href
          : joinPaths(normalizedPath, baseUrl)

        if (
          typeof operation.responses === 'undefined' ||
          operation.responses === null
        ) {
          const handler = new HttpHandler(
            method,
            requestUrl,
            () =>
              new Response('Not Implemented', {
                status: 501,
                statusText: 'Not Implemented',
              }),
            {
              /**
               * @fixme Support `once` the same as in HAR?
               */
            },
          )

          requestHandlers.push(handler)

          continue
        }

        for (const responseStatus of Object.keys(operation.responses)) {
          const content = operation.responses[responseStatus]
          if (!content) {
            continue
          }

          const handler = new HttpHandler(
            method,
            requestUrl,
            createResponseResolver(operation),
            {
              /**
               * @fixme Support `once` the same as in HAR?
               */
            },
          )

          requestHandlers.push(handler)
        }
      }
    }
  }

  return requestHandlers
}

function isSupportedHttpMethod(method: string): method is SupportedHttpMethods {
  return supportedHttpMethods.includes(method)
}
