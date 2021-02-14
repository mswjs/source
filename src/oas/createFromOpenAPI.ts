import { rest } from 'msw'
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import { parse } from '@apidevtools/swagger-parser'

export async function createFromOpenAPI(
  document: string | OpenAPIV3.Document | OpenAPIV2.Document,
) {
  const api = await parse(document)

  const handlers = Object.entries(api.paths).reduce<any>(
    (handlers, [url, pathDef]) => {
      const nextHandlers = Object.entries(pathDef).map(
        ([method, def]: [string, any]) => {
          if (!(method in rest)) {
            return
          }

          // @ts-expect-error tbd
          const resolvedUrl = api.basePath
            ? // @ts-expect-error tbd
              new URL(url, api.basePath).toString()
            : url

          // @ts-expect-error tbd
          return rest[method](resolvedUrl, (req, res, ctx) => {
            const status = req.url.searchParams.get('response') || '200'
            const response = def.responses[status]
            const contentType = Object.keys(response.content)[0]
            const responseNode = response.content[contentType]

            return res(
              ctx.status(Number(status)),
              ctx.set('Content-Type', contentType),
              ctx.body(JSON.stringify(responseNode.schema.example)),
            )
          })
        },
      )

      return handlers.concat(nextHandlers)
    },
    [],
  )

  return handlers
}
