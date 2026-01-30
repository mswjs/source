import type { ResponseResolver, StrictRequest, DefaultBodyType } from 'msw'
import { OpenAPI, OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types'
import { seedSchema } from '@yellow-ticket/seed-json-schema'
import { toString } from './to-string.js'
import { STATUS_CODES } from './status-codes.js'

/**
 * Create a resolver function based on the responses defined for a given operation.
 */
export function createResponseResolver(
  operation: OpenAPI.Operation,
): ResponseResolver {
  return ({ request }) => {
    const { responses } = operation

    // Get the status code that we will return for this request.
    const responseStatus = getResponseStatusCode(responses, request)

    // Handle default `Not Implemented` response.

    if (responseStatus === 501) {
      return new Response('Not Implemented', {
        status: 501,
        statusText: 'Not Implemented',
      })
    }

    // After this point we know that `responses` is not `null` or `undefined`
    // since, if it were, `responseStatus` would have been `501`.

    if (responseStatus === 'default') {
      const responseObject = responses!.default as
        | OpenAPIV3.ResponseObject
        | OpenAPIV3_1.ResponseObject

      return new Response(toBody(request, responseObject), {
        status: 200,
        statusText: STATUS_CODES[200],
        headers: toHeaders(request, responseObject),
      })
    }

    // After this point we know that `responseStatus` is a number
    // and that `responses[responseStatus]` is defined.

    const responseObject = responses![responseStatus.toString()] as
      | OpenAPIV3.ResponseObject
      | OpenAPIV3_1.ResponseObject

    return new Response(toBody(request, responseObject), {
      status: responseStatus,
      statusText: STATUS_CODES[responseStatus],
      headers: toHeaders(request, responseObject),
    })
  }
}

/**
 * Returns the status code (as a string) that a given handler will return,
 * based on defined responses to the given operation and the captured url.
 *
 * The following logic path is used to determine the status to return:
 *
 * - Explicit response status if provided by request query string,
 *    - 501 Not Implemented if explicit response is provided but not defined in spec,
 * - 200,
 * - The first matching 2xx,
 * - responses.default if defined,
 * - 501 Not Implemented otherwise.
 *
 * @param {ResponseObject} responses - The object mapping defined status codes to response objects.
 * @param {StrictRequest} request - The request that the handler will be responding to.
 */
export function getResponseStatusCode(
  responses:
    | OpenAPIV2.ResponsesObject
    | OpenAPIV3.ResponsesObject
    | OpenAPIV3_1.ResponsesObject
    | undefined,
  request: StrictRequest<DefaultBodyType> | undefined,
): number | 'default' {
  // First, if operation has no responses described, always return `Not Implemented`.
  if (responses == null || Object.keys(responses).length === 0) {
    return 501
  }

  // Next, check if client has specified a "response" query in url.
  // (Wrapped to allow unit testing with blank or incomplete `request` objects.)
  if (request?.url) {
    const url = new URL(request.url)
    const explicitResponseStatus = url.searchParams.get('response')
    if (explicitResponseStatus) {
      // If so, send that response, or `Not Implemented` if specified but not defined.
      if (responses[explicitResponseStatus]) {
        explicitResponseStatus
      } else {
        return 501
      }
    }
  }

  // Next, check for a 200 code response explicitly.
  if (responses[200]) {
    return 200
  }

  // Next, check for success (2XX) status code responses.
  for (const key of Object.keys(STATUS_CODES)) {
    if (key.startsWith('2') && responses[key]) {
      return Number(key)
    }
  }

  // Next, check for a `default` response.
  if (responses.default) {
    return 'default'
  }

  // As a last resort, send `Not Implemented`.
  return 501
}

/**
 * Get the Fetch API `Headers` from the OpenAPI response object.
 */
export function toHeaders(
  request: Request,
  responseObject: OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject,
): Headers | undefined {
  const { content } = responseObject
  if (!content) {
    return undefined
  }

  // See what "Content-Type" the request accepts.
  const acceptedContentTypes = getAcceptedContentTypes(request.headers)

  const responseContentTypes = Object.keys(content)

  // Lookup the first response content type that satisfies
  // the expected request's "Accept" header.
  let selectedContentType: string | undefined
  if (acceptedContentTypes.length > 0) {
    for (const acceptedContentType of acceptedContentTypes) {
      const contentTypeRegExp = contentTypeToRegExp(acceptedContentType)
      const matchingResponseContentType = responseContentTypes.find(
        (responseContentType) => {
          return contentTypeRegExp.test(responseContentType)
        },
      )

      if (matchingResponseContentType) {
        selectedContentType = matchingResponseContentType
        break
      }
    }
  } else {
    // If the request didn't specify any "Accept" header,
    // use the first response content type from the spec.
    selectedContentType = responseContentTypes[0] as string
  }

  if (typeof responseObject.headers === 'undefined' && selectedContentType) {
    const headers = new Headers()
    headers.set('content-type', selectedContentType)
    return headers
  }

  const responseHeaders = responseObject.headers ?? {}
  const headerNames = Object.keys(responseHeaders)
  if (headerNames.length === 0) {
    return undefined
  }

  const headers = new Headers()

  for (const [headerName, headerObject] of Object.entries(responseHeaders)) {
    const headerSchema = (
      headerObject as OpenAPIV3.HeaderObject | OpenAPIV3_1.HeaderObject
    ).schema as OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject | undefined

    if (!headerSchema) {
      continue
    }

    const headerValue = seedSchema(headerSchema as any)

    if (typeof headerValue === 'undefined') {
      continue
    }

    headers.append(headerName, toString(headerValue))
  }

  if (headers.get('content-type') === null && selectedContentType) {
    headers.set('content-type', selectedContentType)
  }

  return headers
}

/**
 * Get the Fetch API `BodyInit` from the OpenAPI response object.
 */
export function toBody(
  request: Request,
  responseObject: OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject,
): RequestInit['body'] {
  const { content } = responseObject

  if (content == null) {
    return null
  }

  // See what "Content-Type" the request accepts.
  const acceptedContentTypes = getAcceptedContentTypes(request.headers)

  let mediaTypeObject:
    | OpenAPIV3.MediaTypeObject
    | OpenAPIV3_1.MediaTypeObject
    | undefined
  const responseContentTypes = Object.keys(content)

  // Lookup the first response content type that satisfies
  // the expected request's "Accept" header.
  let selectedContentType: string | undefined
  if (acceptedContentTypes.length > 0) {
    for (const acceptedContentType of acceptedContentTypes) {
      const contentTypeRegExp = contentTypeToRegExp(acceptedContentType)
      const matchingResponseContentType = responseContentTypes.find(
        (responseContentType) => {
          return contentTypeRegExp.test(responseContentType)
        },
      )

      if (matchingResponseContentType) {
        selectedContentType = matchingResponseContentType
        mediaTypeObject = content[selectedContentType]
        break
      }
    }
  } else {
    // If the request didn't specify any "Accept" header,
    // use the first response content type from the spec.
    selectedContentType = responseContentTypes[0] as string
    mediaTypeObject = content[selectedContentType]
  }

  if (!mediaTypeObject) {
    return null
  }

  // First, if the response has a literal example, use it.
  if (mediaTypeObject.example) {
    if (typeof mediaTypeObject.example === 'object') {
      return JSON.stringify(mediaTypeObject.example)
    }
    return mediaTypeObject.example
  }

  // If the response has multiple literal examples, use the first one.
  if (mediaTypeObject.examples) {
    // Support exact response example specified in the
    // "example" request URL search parameter.
    const url = new URL(request.url)
    const exampleName = url.searchParams.get('example')

    if (exampleName) {
      const exampleByName = mediaTypeObject.examples[exampleName] as
        | OpenAPIV3.ExampleObject
        | OpenAPIV3_1.ExampleObject
        | undefined
      return exampleByName
        ? exampleByName.value
        : `Cannot find example by name "${exampleName}"`
    }

    // Otherwise, use the first example.
    const firstExample = Object.values(mediaTypeObject.examples)[0] as
      | OpenAPIV3.ExampleObject
      | OpenAPIV3_1.ExampleObject

    if (typeof firstExample.value === 'object') {
      return JSON.stringify(firstExample.value)
    }

    return firstExample.value
  }

  /**
   * Then, if the response has a schema example, use it.
   * @note `example` is always nested under `schema`.
   * `examples` is a sibling to `schema`.
   */
  const schemaExample = (
    mediaTypeObject.schema as OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject
  )?.example

  if (schemaExample) {
    if (typeof schemaExample === 'object') {
      return JSON.stringify(schemaExample)
    }

    return schemaExample
  }

  // If the response is a JSON Schema, evolve and use it.
  if (mediaTypeObject.schema) {
    const resolvedResponse = seedSchema(mediaTypeObject.schema as any)

    return JSON.stringify(resolvedResponse)
  }

  return null
}

export function getAcceptedContentTypes(headers: Headers): string[] {
  const accept = headers.get('accept') || ''
  return accept
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length !== 0)
}

function contentTypeToRegExp(contentType: string): RegExp {
  return new RegExp(contentType.replace(/\/+/g, '\\/').replace(/\*/g, '.+?'))
}
