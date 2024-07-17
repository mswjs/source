import { RequestHandler, HttpHandler, http } from 'msw'
import type { OpenAPIV3, OpenAPIV2, OpenAPI } from 'openapi-types'
import SwaggerParser from '@apidevtools/swagger-parser'
import { normalizeSwaggerUrl } from './utils/normalize-swagger-url.js'
import { getServers } from './utils/get-servers.js'
import { isAbsoluteUrl, joinPaths } from './utils/url.js'
import { createResponseResolver } from './utils/open-api-utils.js'

type SupportedHttpMethods = keyof typeof http
const supportedHttpMethods = Object.keys(
  http,
) as unknown as SupportedHttpMethods

export type MapOperationFunction = (
  url: string,
  method: SupportedHttpMethods,
  operation: OpenAPIV3.OperationObject,
) => OpenAPIV3.OperationObject | undefined

/**
 * Generates request handlers from the given OpenAPI V2/V3 document.
 *
 * @example
 * import specification from './api.oas.json'
 * await fromOpenApi(specification)
 */
export async function fromOpenApi(
  document: string | OpenAPI.Document | OpenAPIV3.Document | OpenAPIV2.Document,
  mapOperation?: MapOperationFunction,
): Promise<Array<RequestHandler>> {
  const specification = await SwaggerParser.dereference(document)
  const requestHandlers: Array<RequestHandler> = []

  if (typeof specification.paths === 'undefined') {
    return []
  }

  const pathItems = Object.entries(specification.paths ?? {})

  for (const item of pathItems) {
    const [url, handlers] = item
    const pathItem = handlers as
      | OpenAPIV2.PathItemObject
      | OpenAPIV3.PathItemObject

    for (const key of Object.keys(pathItem)) {
      const method = key as keyof OpenAPIV2.PathItemObject

      // Ignore unsupported HTTP methods.
      if (!isSupportedHttpMethod(method)) {
        continue
      }

      const rowOperation = pathItem[method] as OpenAPIV3.OperationObject
      if (!rowOperation) {
        continue
      }

      const operation = mapOperation
        ? mapOperation(url, method, rowOperation)
        : rowOperation

      if (!operation) {
        continue
      }

      const serverUrls = getServers(specification)

      for (const baseUrl of serverUrls) {
        const path = normalizeSwaggerUrl(url)
        const requestUrl = isAbsoluteUrl(baseUrl)
          ? new URL(path, baseUrl).href
          : joinPaths(path, baseUrl)

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
