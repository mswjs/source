import { invariant } from 'outvariant'
import { datatype, internet, random } from 'faker'
import { randexp } from 'randexp'
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

      const explicitContentType = req.url.searchParams.get('type')
      const contentType = explicitContentType
        ? explicitContentType
        : Object.keys(response.content)[0]

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

        // Response body must always be string.
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

export function evolveJsonSchema(
  schema: OpenAPIV3.SchemaObject,
): string | number | boolean | unknown[] | Record<string, unknown> | undefined {
  // Always use an explicit example first.
  if (schema.example) {
    return schema.example
  }

  // Otherwise evolve the schema recursively.
  switch (schema.type) {
    case 'string': {
      if (schema.pattern) {
        return randexp(schema.pattern)
      }

      switch (schema.format?.toLowerCase()) {
        case 'uuid': {
          return datatype.uuid()
        }

        case 'email': {
          return internet.email()
        }

        case 'password': {
          return internet.password()
        }

        case 'date-time': {
          return datatype.datetime(schema.maximum).toISOString()
        }
      }

      // Use a random value from the specified enums list.
      if (schema.enum) {
        const enumIndex = datatype.number({
          min: 0,
          max: schema.enum.length - 1,
        })

        return schema.enum[enumIndex]
      }

      const value = datatype.string(schema.minLength)
      return value.slice(0, schema.maxLength)
    }

    case 'integer': {
      switch (schema.format) {
        case 'int16':
        case 'int32':
        case 'int64': {
          return datatype.number({
            min: schema.minimum,
            max: schema.maximum,
          })
        }

        default: {
          return datatype.float({
            min: schema.minimum,
            max: schema.maximum,
          })
        }
      }
    }

    case 'boolean': {
      return datatype.boolean()
    }

    case 'number': {
      const value = datatype.number({
        min: schema.minimum,
        max: schema.maximum,
      })
      return value
    }

    case 'array': {
      const { items: arraySchema } = schema

      invariant(
        !('$ref' in arraySchema),
        'Failed to generate mock from schema array (%j): found unresolved reference.',
        arraySchema,
      )

      const minLength = schema.minLength || 2
      const arrayLength = datatype.number({
        min: minLength,
        max: schema.maxLength || minLength + 4,
      })

      const value: unknown[] = new Array(arrayLength)
        .fill(null)
        .reduce<unknown[]>((array) => {
          const value = evolveJsonSchema(arraySchema)
          if (value) {
            // Push instead of concating to support
            // nested arrays.
            array.push(value)
          }
          return array
        }, [])

      return value
    }

    case 'object': {
      // Always us an explicit example, if provided.
      if (schema.example) {
        return schema.example
      }

      const json: Record<string, unknown> = {}

      // Support explicit "properties".
      if (schema.properties) {
        for (const [key, propertyDefinition] of Object.entries(
          schema.properties,
        )) {
          invariant(
            !('$ref' in propertyDefinition),
            'Failed to generate mock from the schema property definition (%j): found unresolved reference.',
            propertyDefinition,
          )

          const value = evolveJsonSchema(propertyDefinition)
          if (typeof value !== 'undefined') {
            json[key] = value
          }
        }
      }

      // Support "additionalProperties".
      if (schema.additionalProperties) {
        const additionalPropertiesSchema = schema.additionalProperties

        if (additionalPropertiesSchema === true) {
          repeat(0, 4, () => {
            const propertyName = random.word().toLowerCase()
            json[propertyName] = datatype.string()
          })

          return json
        }

        invariant(
          !('$ref' in additionalPropertiesSchema),
          'Failed to generate mock from the "additionalProperties" schema: found unresolved reference.',
        )

        repeat(0, 4, () => {
          const propertyName = random.word().toLowerCase()
          json[propertyName] = evolveJsonSchema(additionalPropertiesSchema)
        })
      }

      return json
    }
  }
}

function toString(value: unknown): string {
  return typeof value !== 'string' ? JSON.stringify(value) : value
}

function repeat(minTimes: number, maxTimes: number, callback: () => void) {
  const count = datatype.number({ min: minTimes, max: maxTimes })
  for (let i = 0; i < count; i++) {
    callback()
  }
}
