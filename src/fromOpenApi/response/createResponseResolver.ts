import {
  MockedRequest,
  ResponseResolver,
  ResponseTransformer,
  RestContext,
} from 'msw'
import { OpenAPIV3 } from 'openapi-types'
import { getBodyTransformers } from './transformers/bodyTransformer'
import { getHeadersTransformers } from './transformers/headersTransformer'

export function createResponseResolver(
  operation: OpenAPIV3.OperationObject,
): ResponseResolver<MockedRequest, RestContext> {
  return (req, res, ctx) => {
    // Treat the opeartions that don't describe any
    // responses as not implemented.
    if (
      operation.responses == null ||
      Object.keys(operation.responses || {}).length === 0
    ) {
      return res(ctx.status(501))
    }

    // Get the response object from the schema.
    let responseObject: OpenAPIV3.ResponseObject
    const explicitResponseStatus = req.url.searchParams.get('response')

    if (explicitResponseStatus) {
      const explicitResponse = operation.responses[
        explicitResponseStatus
      ] as OpenAPIV3.ResponseObject

      if (!explicitResponse) {
        return res(ctx.status(501))
      }

      responseObject = explicitResponse
    } else {
      const fallbackResponse =
        (operation.responses['200'] as OpenAPIV3.ResponseObject) ||
        (operation.responses.default as OpenAPIV3.ResponseObject)

      if (!fallbackResponse) {
        return res()
      }

      responseObject = fallbackResponse
    }

    // Response status.
    const responseStatus = explicitResponseStatus || '200'

    const transformers: ResponseTransformer[] = [
      ctx.status(Number(responseStatus)),
      ...getHeadersTransformers(responseObject, req, ctx),
      ...getBodyTransformers(responseObject, req, ctx),
    ]

    return res(...transformers)
  }
}
