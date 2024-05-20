import type { ResponseResolver } from 'msw'
import { OpenAPIV3 } from 'openapi-types'
import { evolveJsonSchema } from '../schema/evolve'
import { toString } from './toString'

export function createResponseResolver(
  operation: OpenAPIV3.OperationObject,
): ResponseResolver {
  return ({ request }) => {
    const { responses } = operation

    // Treat operations that describe no responses as not implemented.
    if (responses == null) {
      return new Response('Not implemented', { status: 501 })
    }
    if (Object.keys(responses).length === 0) {
      return new Response('Not implemented', { status: 501 })
    }

    let responseObject: OpenAPIV3.ResponseObject

    const url = new URL(request.url)
    const explicitResponseStatus = url.searchParams.get('response')

    if (explicitResponseStatus) {
      const responseByStatus = responses[
        explicitResponseStatus
      ] as OpenAPIV3.ResponseObject

      if (!responseByStatus) {
        return new Response('Not implemented', { status: 501 })
      }

      responseObject = responseByStatus
    } else {
      const fallbackResponse =
        (responses['200'] as OpenAPIV3.ResponseObject) ||
        (responses.default as OpenAPIV3.ResponseObject)

      if (!fallbackResponse) {
        return new Response('Not implemented', { status: 501 })
      }

      responseObject = fallbackResponse
    }

    return new Response(toBody(request, responseObject), {
      status: Number(explicitResponseStatus || '200'),
      headers: toHeaders(responseObject),
    })
  }
}

/**
 * Get the Fetch API `Headers` from the OpenAPI response object.
 */
export function toHeaders(
  responseObject: OpenAPIV3.ResponseObject,
): Headers | undefined {
  if (!responseObject.headers) {
    return undefined
  }

  const headers = new Headers()

  for (const [headerName, headerObject] of Object.entries(
    responseObject.headers,
  )) {
    const headerSchema = (headerObject as OpenAPIV3.HeaderObject).schema as
      | OpenAPIV3.SchemaObject
      | undefined

    if (!headerSchema) {
      continue
    }

    const headerValue = evolveJsonSchema(headerSchema)
    if (typeof headerValue === 'undefined') {
      continue
    }

    headers.append(headerName, toString(headerValue))
  }

  return headers
}

/**
 * Get the Fetch API `BodyInit` from the OpenAPI response object.
 */
export function toBody(
  request: Request,
  responseObject: OpenAPIV3.ResponseObject,
): BodyInit {
  const { content } = responseObject

  if (!content) {
    return null
  }

  // See what "Content-Type" the request accepts.
  const accept = request.headers.get('accept') || ''
  const acceptedContentTypes = accept.split(',')

  let mediaTypeObject: OpenAPIV3.MediaTypeObject | undefined
  const responseContentTypes = Object.keys(content)

  // Lookup the first response content type that satisfies
  // the expected request's "Accept" header.
  if (acceptedContentTypes.length > 0) {
    for (const acceptedContentType of acceptedContentTypes) {
      const contentTypeRegExp = contentTypeToRegExp(acceptedContentType)
      const matchingResponseContentType = responseContentTypes.find(
        (responseContentType) => {
          return contentTypeRegExp.test(responseContentType)
        },
      )

      if (matchingResponseContentType) {
        mediaTypeObject = content[matchingResponseContentType]
        break
      }
    }
  } else {
    // If the request didn't specify any "Accept" header,
    // use the first response content type from the spec.
    mediaTypeObject = content[responseContentTypes[0]]
  }

  if (!mediaTypeObject) {
    return null
  }

  // If the response object has the body example, use it.
  if (mediaTypeObject.example) {
    return mediaTypeObject.example
  }

  if (mediaTypeObject.examples) {
    // Support exact response example specified in the
    // "example" request URL search parameter.
    const url = new URL(request.url)
    const exampleName = url.searchParams.get('example')

    if (exampleName) {
      const exampleByName = mediaTypeObject.examples[exampleName] as
        | OpenAPIV3.ExampleObject
        | undefined
      return exampleByName
        ? exampleByName.value
        : `Cannot find example by name "${exampleName}"`
    }

    // Otherwise, use the first example.
    const firstExample = Object.values(
      mediaTypeObject.examples,
    )[0] as OpenAPIV3.ExampleObject

    return firstExample.value
  }

  // If the response is a JSON Schema, evolve and use it.
  if (mediaTypeObject.schema) {
    return evolveJsonSchema(mediaTypeObject.schema as OpenAPIV3.SchemaObject)
  }

  return null
}

function contentTypeToRegExp(contentType: string): RegExp {
  return new RegExp(contentType.replace(/\/+/g, '\\/').replace(/\*/g, '.+?'))
}