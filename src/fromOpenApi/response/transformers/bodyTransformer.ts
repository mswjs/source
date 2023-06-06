import { headersToObject } from 'headers-utils/lib'
import { MockedRequest, ResponseTransformer, RestContext } from 'msw'
import { OpenAPIV3 } from 'openapi-types'
import { evolveJsonSchema } from '../../schema/evolve'
import { toString } from '../../utils/toString'

export function getBodyTransformers(
  responseObject: OpenAPIV3.ResponseObject,
  req: MockedRequest,
  ctx: RestContext,
): ResponseTransformer[] {
  if (!('content' in responseObject && responseObject.content != null)) {
    return []
  }

  const requestHeaders = headersToObject(req.headers)
  const acceptedMimeTypes = ([] as string[]).concat(requestHeaders.accept)
  const explicitContentType = acceptedMimeTypes[0] || ''
  const explicitContentTypeRegexp = new RegExp(
    explicitContentType.replace(/\/+/g, '\\/').replace(/\*/g, '.+?'),
  )

  const allContentTypes = Object.keys(responseObject.content)

  const contentType =
    allContentTypes.find((contentType) => {
      // Find the first declared response content type
      // that matches the "Accept" request header.
      // Keep in mind that values like "*/*" and "application/*"
      // are completely valid.
      return explicitContentTypeRegexp.test(contentType)
    }) || allContentTypes[0]

  const mediaTypeObject = responseObject.content[contentType]

  const body = (() => {
    if (mediaTypeObject.example) {
      return mediaTypeObject.example
    }

    if (mediaTypeObject.examples) {
      const { value } = Object.values(
        mediaTypeObject.examples,
      )[0] as OpenAPIV3.ExampleObject

      return value
    }

    if (mediaTypeObject.schema) {
      return evolveJsonSchema(mediaTypeObject.schema as OpenAPIV3.SchemaObject)
    }
  })()

  const transformers: ResponseTransformer[] = [
    ctx.set('Content-Type', contentType),
  ]

  if (body) {
    transformers.push(ctx.body(toString(body)))
  }

  return transformers
}
