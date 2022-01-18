import { invariant } from 'outvariant'
import { datatype, internet } from 'faker'
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

        const resolvedUrl = new URL(url, baseUrl).href

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

function createResponseResolver(
  operation: OpenAPIV2.OperationObject | OpenAPIV3.OperationObject,
): ResponseResolver<MockedRequest, RestContext> {
  return (req, res, ctx) => {
    const status = req.url.searchParams.get('response') || '200'
    const response = operation.responses?.[status] as
      | OpenAPIV2.ResponseObject
      | OpenAPIV3.ResponseObject
      | undefined

    if (!response) {
      return res(ctx.status(501))
    }

    const transformers: ResponseTransformer[] = []
    transformers.push(ctx.status(Number(status)))

    /**
     * @todo Support "response.headers" schema.
     */

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

function evolveJsonSchema(
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
      }

      const value = datatype.string(schema.minLength)
      return value.slice(0, schema.maxLength)
    }

    case 'integer': {
      const value = datatype.float({
        min: schema.minimum,
        max: schema.maximum,
      })
      return value
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

      // Otherwise evolve the properties to the value object.
      if (schema.properties) {
        const json = Object.entries(schema.properties).reduce<
          Record<string, unknown>
        >((json, [key, propertyDefinition]) => {
          invariant(
            !('$ref' in propertyDefinition),
            'Failed to generate mock from the schema property definition (%j): found unresolved reference.',
            propertyDefinition,
          )

          const value = evolveJsonSchema(propertyDefinition)

          if (typeof value !== 'undefined') {
            json[key] = value
          }

          return json
        }, {})

        return json
      }
    }
  }
}

function toString(value: unknown): string {
  return typeof value !== 'string' ? JSON.stringify(value) : value
}
