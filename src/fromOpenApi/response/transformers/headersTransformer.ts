import { MockedRequest, ResponseTransformer, RestContext } from 'msw'
import { OpenAPIV3 } from 'openapi-types'
import { evolveJsonSchema } from '../../schema/evolve'
import { toString } from '../../utils/toString'

export function getHeadersTransformers(
  responseObject: OpenAPIV3.ResponseObject,
  _req: MockedRequest,
  ctx: RestContext,
): ResponseTransformer[] {
  if (!responseObject.headers) {
    return []
  }

  const transformers = Object.entries(responseObject.headers).reduce<
    ResponseTransformer[]
  >((transformers, [headerName, headerObject]) => {
    const headerSchema = (headerObject as OpenAPIV3.HeaderObject)
      .schema as OpenAPIV3.SchemaObject

    if (!headerSchema) {
      return transformers
    }

    const headerValue = evolveJsonSchema(headerSchema)
    if (typeof headerValue === 'undefined') {
      return transformers
    }

    return transformers.concat(ctx.set(headerName, toString(headerValue)))
  }, [])

  return transformers
}
