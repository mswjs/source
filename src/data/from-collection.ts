import type { StandardSchemaV1 } from '@standard-schema/spec'
import { capitalize, get, merge } from 'lodash-es'
import {
  graphql as executeGraphQL,
  GraphQLObjectType,
  GraphQLSchema,
} from 'graphql'
import { type Collection, Query } from '@msw/data'
import {
  http,
  HttpResponse,
  type HttpHandler,
  GraphQLHandler,
  graphql,
} from 'msw'
import { createGraphQLSchemaFromZod } from './vendors/zod'

export type HandlerFormat = 'http' | 'graphql'

interface CollectionOptions<Schema extends StandardSchemaV1> {
  /**
   * Name of this collection.
   * This gets included in the paths of the generated handlers.
   * E.g. given `"users"` name, the handler paths will be `/users`, `/users/:id`, etc.
   */
  name: string
  /**
   * Property name to use as the primary key.
   */
  key: keyof StandardSchemaV1.InferOutput<Schema> & string
  format: HandlerFormat | Array<HandlerFormat>
  /**
   * Base URL to apply to all the generated paths.
   */
  baseUrl?: URL | string
}

/**
 * Generate request handlers from the given `@msw/data` collection.
 *
 * @example
 * import { Collection } from '@msw/data'
 * const users = new Collection({ schema: userSchema })
 *
 * const handlers = fromCollection({
 *   name: 'users',
 *   key: 'id',
 *   collection: users,
 * })
 */
export function fromCollection<Schema extends StandardSchemaV1>(
  collection: Collection<Schema>,
  options: CollectionOptions<Schema>,
) {
  const httpHandlers = createHttpHandlers(
    options.name,
    options.key,
    collection,
    options.baseUrl?.toString() || '',
  )

  const graphqlHandlers = createGraphQLHandlers(
    options.name,
    options.key,
    collection,
  )

  return httpHandlers
}

function createKeyQuery(key: string, expectedValue: string) {
  return new Query((record) => get(record, key) == expectedValue)
}

/**
 * Create HTTP handlers from the given collection.
 * @param namespace Namespace to use as path prefixes.
 * @param collection A reference to the collection.
 * @returns A list of handlers.
 */
function createHttpHandlers(
  name: string,
  key: string,
  collection: Collection<any>,
  baseUrl: string,
): Array<HttpHandler> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '')
  const buildUrl = (path: string) => {
    return `${normalizedBaseUrl}${path}`
  }

  return [
    http.get(buildUrl(`/${name}`), () => {
      return HttpResponse.json(collection.all())
    }),

    http.get<{ [key]: string }>(buildUrl(`/${name}/:${key}`), ({ params }) => {
      const record = collection.findFirst(createKeyQuery(key, params[key]!))

      if (record == null) {
        return new HttpResponse(null, { status: 404 })
      }

      return HttpResponse.json(record)
    }),

    http.post(buildUrl(`/${name}`), async ({ request }) => {
      const input = await request.json()
      const record = await collection.create(input)
      return HttpResponse.json(record, { status: 201 })
    }),

    http.put<{ [key]: string }>(
      buildUrl(`/${name}/:${key}`),
      async ({ params, request }) => {
        const input = await request.json()
        const nextRecord = await collection
          .update(createKeyQuery(key, params[key]!), {
            strict: true,
            data(record) {
              merge(record, input)
            },
          })
          .catch((error) => {
            throw new HttpResponse(null, { status: 404 })
          })

        return HttpResponse.json(nextRecord)
      },
    ),

    http.delete<{ [key]: string }>(
      buildUrl(`/${name}/:${key}`),
      ({ params }) => {
        const deletedRecord = collection.delete(
          createKeyQuery(key, params[key]!),
        )

        if (deletedRecord == null) {
          return new HttpResponse(null, { status: 404 })
        }

        return HttpResponse.json(deletedRecord)
      },
    ),
  ]
}

function createGraphQLHandlers(
  name: string,
  key: string,
  collection: Collection<any>,
): Array<GraphQLHandler> {
  const schema = collection['options']['schema'] as StandardSchemaV1
  const capitalizedName = capitalize(name)

  let graphqlSchema: GraphQLSchema

  if (schema['~standard'].vendor === 'zod') {
    graphqlSchema = createGraphQLSchemaFromZod({
      schema,
      name: capitalizedName,
      key,
      collection,
    })
  }

  return [
    graphql.operation(async ({ query, variables }) => {
      const result = await executeGraphQL({
        schema: graphqlSchema,
        source: query,
        variableValues: variables,
      })

      return HttpResponse.json(result)
    }),
  ]
}
