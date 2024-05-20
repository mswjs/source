import { RequestHandler, HttpHandler, http } from 'msw'
import type { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import SwaggerParser from '@apidevtools/swagger-parser'
import { normalizeSwaggerUrl } from './utils/normalizeSwaggerUrl.js'
import { getServers } from './utils/getServers.js'
import { isAbsoluteUrl, joinPaths } from './utils/url.js'
import { createResponseResolver } from './utils/openApiUtils.js'

type SupportedHttpMethods = keyof typeof http
const supportedHttpMethods = Object.keys(
  http,
) as unknown as SupportedHttpMethods

/**
 * Generates request handlers from the given OpenAPI V2/V3 document.
 *
 * @example
 * import specification from './api.oas.json'
 * await fromOpenApi(specification)
 */
export async function fromOpenApi(
  document: string | OpenAPIV3.Document | OpenAPIV2.Document,
): Promise<Array<RequestHandler>> {
  const specification = await SwaggerParser.dereference(document)
  const handlers: Array<RequestHandler> = []

  for (const url in Object.entries(specification.paths)) {
    const pathItem = specification.paths[url] as
      | OpenAPIV2.PathItemObject
      | OpenAPIV3.PathItemObject

    for (const key of Object.keys(pathItem)) {
      const method = key as keyof OpenAPIV2.PathItemObject

      // Ignore unsupported HTTP methods.
      if (!isSupportedHttpMethod(method)) {
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

        handlers.push(handler)
      }
    }
  }

  return handlers
}

function isSupportedHttpMethod(method: string): method is SupportedHttpMethods {
  return supportedHttpMethods.includes(method)
}
