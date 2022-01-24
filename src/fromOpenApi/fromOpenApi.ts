import { invariant } from 'outvariant'
import { headersToObject } from 'headers-utils'
import {
  RestContext,
  MockedRequest,
  RequestHandler,
  ResponseResolver,
  ResponseTransformer,
  rest,
} from 'msw'
import { OpenAPIV3, OpenAPIV2 } from 'openapi-types'
import * as SwaggerParser from '@apidevtools/swagger-parser'
import { evolveJsonSchema } from './schema/evolve'

const parser = new SwaggerParser()

/**
 * Generates request handlers from the given OpenAPI V2/V3 document.
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
        if (!operation) {
          continue
        }

        const baseUrl =
          'basePath' in specification
            ? specification.basePath
            : window.document.baseURI

        const resolvedUrl = new URL(normalizeUrl(url), baseUrl).href

        const handler = rest[method](
          resolvedUrl,
          createResponseResolver(operation),
        )

        handlers.push(handler)
      }

      return handlers
    },
    [],
  )

  return handlers
}

function normalizeUrl(url: string): string {
  return (
    url
      // Replace OpenAPI style parameters (/pet/{petId})
      // with the common path parameters (/pet/:petId).
      .replace(/\{(.+?)\}/g, ':$1')
  )
}

function createResponseResolver(
  operation: OpenAPIV2.OperationObject | OpenAPIV3.OperationObject,
): ResponseResolver<MockedRequest, RestContext> {
  return (req, res, ctx) => {
    // Operations that do not describe any responses
    // are treated as not implemented.
    if (
      operation.responses == null ||
      Object.keys(operation.responses || {}).length === 0
    ) {
      return res(ctx.status(501))
    }

    let response: OpenAPIV3.ResponseObject
    const explicitResponseStatus = req.url.searchParams.get('response')

    if (explicitResponseStatus) {
      const explicitResponse = operation.responses[explicitResponseStatus]

      if (!explicitResponse) {
        return res(ctx.status(501))
      }

      response = explicitResponse
    } else {
      const fallbackResponse =
        operation.responses['200'] || operation.responses.default

      if (!fallbackResponse) {
        return res()
      }

      response = fallbackResponse
    }

    const status = explicitResponseStatus || '200'
    const transformers: ResponseTransformer[] = []
    transformers.push(ctx.status(Number(status)))

    // Set response headers.
    if (response.headers) {
      for (const [headerName, headerDefinition] of Object.entries(
        response.headers,
      )) {
        invariant(
          !('$ref' in headerDefinition),
          'Failed to generate mock response headers: found an unresolved reference',
          headerDefinition,
        )

        const headerSchema = headerDefinition.schema as OpenAPIV3.SchemaObject
        const headerValue = evolveJsonSchema(headerSchema)
        if (!headerValue) {
          continue
        }

        transformers.push(ctx.set(headerName, toString(headerValue)))
      }
    }

    if ('content' in response && response.content != null) {
      let body: unknown

      const requestHeaders = headersToObject(req.headers)
      const acceptedMimeTypes = ([] as string[]).concat(requestHeaders.accept)
      const explicitContentType = acceptedMimeTypes[0]
      const explicitContentTypeRegexp = new RegExp(
        explicitContentType.replace(/\/+/g, '\\/').replace(/\*/g, '.+?'),
      )

      const allContentTypes = Object.keys(response.content)

      const contentType =
        allContentTypes.find((contentType) => {
          // Find the first declared response content type
          // that matches the "Accept" request header.
          // Keep in mind that values like "*/*" and "application/*"
          // are completely valid.
          return explicitContentTypeRegexp.test(contentType)
        }) || allContentTypes[0]

      transformers.push(ctx.set('Content-Type', contentType))

      const mediaTypeObject = response.content[contentType]

      // An explicit example is used first.
      if (mediaTypeObject.example) {
        body = mediaTypeObject.example
      }
      // The first of the multiple "examples"
      // is used afterwards.
      else if (mediaTypeObject.examples) {
        const { value } = Object.values(
          mediaTypeObject.examples,
        )[0] as OpenAPIV3.ExampleObject

        // Response body must always be a string.
        body = value
      }
      // JSON Schema is populated with random values.
      else if (mediaTypeObject.schema) {
        invariant(
          !('$ref' in mediaTypeObject.schema),
          'Failed to use a JSON schema (%j) as a mocked response body: found an unresolved reference.',
          mediaTypeObject.schema,
        )

        body = evolveJsonSchema(mediaTypeObject.schema)
      }

      if (body) {
        transformers.push(ctx.body(toString(body)))
      }
    }

    return res(...transformers)
  }
}

function toString(value: unknown): string {
  return typeof value !== 'string' ? JSON.stringify(value) : value
}
