import { RequestHandler, rest } from 'msw'
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import * as SwaggerParser from '@apidevtools/swagger-parser'

const parser = new SwaggerParser()

/**
 * Generates request handlers fro the given OpenAPI document.
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

        const operation = pathItem[method]

        const baseUrl =
          'basePath' in specification
            ? specification.basePath
            : window.document.baseURI

        const resolvedUrl = new URL(url, baseUrl).href

        const handler = rest[method](resolvedUrl, (req, res, ctx) => {
          const status = req.url.searchParams.get('response') || '200'
          const response = operation?.responses?.[status]
          const contentType = Object.keys(response.content)[0]
          const responseNode = response.content[contentType]

          return res(
            ctx.status(Number(status)),
            ctx.set('Content-Type', contentType),
            ctx.body(JSON.stringify(responseNode.schema.example)),
          )
        })

        handlers.push(handler)
      }

      return handlers
    },
    [],
  )

  return handlers
}
