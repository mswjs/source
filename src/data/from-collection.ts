import type { StandardSchemaV1 } from '@standard-schema/spec'
import { type Collection, OperationError, Query } from '@msw/data'
import {
  type DefaultBodyType,
  type GraphQLHandler,
  type HttpResponseResolver,
  type PathParams,
  http,
  HttpHandler,
  HttpResponse,
} from 'msw'
import { getValueAtPath } from './utils/get-value-at-path.js'
import { toSerializable } from './utils/to-serializable.js'
import {
  generateGraphQLHandlers,
  type FromCollectionGraphQLOptions,
} from './graphql/generate-graphql-handlers.js'

export type { FromCollectionGraphQLOptions }

export interface FromCollectionHttpOptions {
  /**
   * Format of the generated handlers.
   * @default "http"
   */
  format?: 'http'
  /**
   * The URL of the resource represented by this collection.
   * Can be a path or an absolute URL. All generated handlers
   * are nested under this URL.
   * @default "/"
   *
   * @example
   * fromCollection(users, { baseUrl: '/api/users' })
   * // GET /api/users
   * // GET /api/users/:id
   * // ...
   */
  baseUrl?: string
  /**
   * The record property to match against the path parameter
   * in the record-scoped routes (e.g. `GET /users/:id`).
   * @default "id"
   */
  primaryKey?: string
}

export type FromCollectionOptions =
  | FromCollectionHttpOptions
  | FromCollectionGraphQLOptions

const paginationParameterNames = ['skip', 'take']

const responseStatusByOperationErrorCode: Record<string, number> = {
  STRICT_QUERY_WITHOUT_RESULTS: 404,
  INVALID_INITIAL_VALUES: 400,
}

class GeneratedHandlerError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GeneratedHandlerError'
  }
}

/**
 * Generates request handlers representing a RESTful API
 * for the given collection.
 *
 * The following handlers are generated:
 *
 * - `GET {baseUrl}`, returns all records. Supports offset-based
 * pagination with the `skip` and `take` query parameters. Any other
 * query parameters are treated as record property filters
 * (e.g. `GET /users?name=John`).
 * - `GET {baseUrl}/:key`, returns a record by its `primaryKey`.
 * - `POST {baseUrl}`, creates a new record from the request body.
 * - `PUT {baseUrl}/:key`, replaces a record with the request body.
 * - `PATCH {baseUrl}/:key`, merges the request body into a record.
 * - `DELETE {baseUrl}/:key`, deletes a record by its `primaryKey`.
 *
 * Provide the `format: 'graphql'` option to generate GraphQL
 * handlers instead (see {@link FromCollectionGraphQLOptions}).
 *
 * @example
 * import { Collection } from '@msw/data'
 * import { fromCollection } from '@msw/source/data'
 *
 * const users = new Collection({ schema: userSchema })
 * const handlers = fromCollection(users, { baseUrl: '/api/users' })
 *
 * @example
 * // Generate GraphQL handlers instead.
 * fromCollection(users, { format: 'graphql', name: 'user' })
 */
export function fromCollection<Schema extends StandardSchemaV1>(
  collection: Collection<Schema>,
  options?: FromCollectionHttpOptions,
): Array<HttpHandler>
export function fromCollection<Schema extends StandardSchemaV1>(
  collection: Collection<Schema>,
  options: FromCollectionGraphQLOptions,
): Array<GraphQLHandler>
export function fromCollection<Schema extends StandardSchemaV1>(
  collection: Collection<Schema>,
  options: FromCollectionOptions = {},
): Array<HttpHandler> | Array<GraphQLHandler> {
  if (options.format === 'graphql') {
    return generateGraphQLHandlers(collection, options)
  }

  const { baseUrl = '/', primaryKey = 'id' } = options

  const collectionUrl = baseUrl.replace(/\/+$/, '')
  const listUrl = collectionUrl === '' ? '/' : collectionUrl
  const recordUrl = `${collectionUrl}/:${primaryKey}`

  const createPrimaryKeyQuery = (
    expectedValue: string,
  ): Query<StandardSchemaV1.InferOutput<Schema>> => {
    return new Query((record: unknown) => {
      const actualValue = getValueAtPath(record, [primaryKey])

      /**
       * @note Path parameters are always strings so compare
       * the stringified property value. This supports non-string
       * primary keys, like numbers.
       */
      return actualValue != null && String(actualValue) === expectedValue
    })
  }

  const updateRecord = async (
    primaryKeyValue: string,
    produceNextRecord: (draftRecord: Record<string, unknown>) => void,
  ) => {
    return collection
      .update(createPrimaryKeyQuery(primaryKeyValue), {
        strict: true,
        data(draft) {
          /**
           * @note The draft is opaque for an arbitrary schema but the
           * record-scoped routes only make sense for object records.
           */
          produceNextRecord(draft as Record<string, unknown>)
        },
      })
      .catch((error) => {
        if (error instanceof OperationError) {
          throw error
        }

        // Failing to produce the next record means the request body
        // has resulted in a record that violates the collection schema.
        throw new GeneratedHandlerError(
          400,
          `Failed to update a record with "${primaryKey}" equal to "${primaryKeyValue}": the updated record does not match the collection schema.`,
        )
      })
  }

  return [
    http.get(
      listUrl,
      withErrorResponses(({ request }) => {
        const url = new URL(request.url)
        const pagination = parsePaginationParameters(url.searchParams)
        const filterQuery = new Query<StandardSchemaV1.InferOutput<Schema>>(
          createSearchParametersPredicate(url.searchParams),
        )

        const records = collection.findMany(filterQuery, pagination)

        return jsonResponse(records)
      }),
    ),
    http.get(
      recordUrl,
      withErrorResponses(({ params }) => {
        const primaryKeyValue = getRequiredPathParameter(params, primaryKey)
        const record = collection.findFirst(
          createPrimaryKeyQuery(primaryKeyValue),
          { strict: true },
        )

        return jsonResponse(record)
      }),
    ),
    http.post(
      listUrl,
      withErrorResponses(async ({ request }) => {
        const initialValues = await parseJsonBody(request)
        const createdRecord = await collection.create(
          initialValues as StandardSchemaV1.InferInput<Schema>,
        )

        return jsonResponse(createdRecord, { status: 201 })
      }),
    ),
    http.put(
      recordUrl,
      withErrorResponses(async ({ request, params }) => {
        const primaryKeyValue = getRequiredPathParameter(params, primaryKey)
        const nextValues = await parseJsonObjectBody(request)

        const nextRecord = await updateRecord(
          primaryKeyValue,
          (draftRecord) => {
            for (const key of Object.keys(draftRecord)) {
              const isReplaced = Object.prototype.hasOwnProperty.call(
                nextValues,
                key,
              )

              /**
               * @note The primary key is never removed nor replaced:
               * the record identity is described by the request URL.
               */
              if (key !== primaryKey && !isReplaced) {
                delete draftRecord[key]
              }
            }

            for (const [key, value] of Object.entries(nextValues)) {
              if (key !== primaryKey) {
                draftRecord[key] = value
              }
            }
          },
        )

        return jsonResponse(nextRecord)
      }),
    ),
    http.patch(
      recordUrl,
      withErrorResponses(async ({ request, params }) => {
        const primaryKeyValue = getRequiredPathParameter(params, primaryKey)
        const nextValues = await parseJsonObjectBody(request)

        const nextRecord = await updateRecord(
          primaryKeyValue,
          (draftRecord) => {
            for (const [key, value] of Object.entries(nextValues)) {
              if (key !== primaryKey) {
                draftRecord[key] = value
              }
            }
          },
        )

        return jsonResponse(nextRecord)
      }),
    ),
    http.delete(
      recordUrl,
      withErrorResponses(({ params }) => {
        const primaryKeyValue = getRequiredPathParameter(params, primaryKey)
        const deletedRecord = collection.delete(
          createPrimaryKeyQuery(primaryKeyValue),
          { strict: true },
        )

        return jsonResponse(deletedRecord)
      }),
    ),
  ]
}

/**
 * Wraps the given response resolver, translating the errors
 * it throws to the respective error responses.
 */
function withErrorResponses(
  resolver: HttpResponseResolver<PathParams>,
): HttpResponseResolver<PathParams> {
  return async (info) => {
    try {
      return await resolver(info)
    } catch (error) {
      return createErrorResponse(error)
    }
  }
}

function createErrorResponse(error: unknown): Response {
  if (error instanceof GeneratedHandlerError) {
    return HttpResponse.json(
      { message: error.message },
      { status: error.status },
    )
  }

  if (error instanceof OperationError) {
    const status = responseStatusByOperationErrorCode[String(error.code)] ?? 500

    return HttpResponse.json({ message: error.message }, { status })
  }

  if (error instanceof Error) {
    return HttpResponse.json({ message: error.message }, { status: 500 })
  }

  return HttpResponse.json({ message: 'Unexpected error' }, { status: 500 })
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  /**
   * @note Serialize the body manually to resolve relations
   * and handle circular references between related records.
   */
  return HttpResponse.json(toSerializable(body) as DefaultBodyType, init)
}

function getRequiredPathParameter(
  params: PathParams,
  parameterName: string,
): string {
  const parameterValue = params[parameterName]

  if (typeof parameterValue !== 'string') {
    throw new GeneratedHandlerError(
      400,
      `Failed to handle the request: expected the "${parameterName}" path parameter to be a string.`,
    )
  }

  return parameterValue
}

async function parseJsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => {
    throw new GeneratedHandlerError(
      400,
      'Failed to handle the request: expected a valid JSON request body.',
    )
  })
}

async function parseJsonObjectBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const body = await parseJsonBody(request)

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new GeneratedHandlerError(
      400,
      'Failed to handle the request: expected the request body to be a JSON object.',
    )
  }

  return body as Record<string, unknown>
}

function parsePaginationParameters(searchParams: URLSearchParams): {
  skip?: number
  take?: number
} {
  const pagination: { skip?: number; take?: number } = {}
  const rawSkip = searchParams.get('skip')
  const rawTake = searchParams.get('take')

  if (rawSkip != null) {
    const skip = Number(rawSkip)

    if (!Number.isInteger(skip) || skip < 0) {
      throw new GeneratedHandlerError(
        400,
        `Failed to query the collection: expected the "skip" query parameter to be a non-negative integer but got "${rawSkip}".`,
      )
    }

    pagination.skip = skip
  }

  if (rawTake != null) {
    const take = Number(rawTake)

    if (!Number.isInteger(take)) {
      throw new GeneratedHandlerError(
        400,
        `Failed to query the collection: expected the "take" query parameter to be an integer but got "${rawTake}".`,
      )
    }

    pagination.take = take
  }

  return pagination
}

/**
 * Creates a record predicate from the given search parameters.
 * Every search parameter (except the pagination parameters) is
 * treated as an equality filter on the record property. Nested
 * properties are expressed with dots (e.g. `?address.city=NY`).
 */
function createSearchParametersPredicate(
  searchParams: URLSearchParams,
): (record: unknown) => boolean {
  const filters: Array<(record: unknown) => boolean> = []

  for (const parameterName of new Set(searchParams.keys())) {
    if (paginationParameterNames.includes(parameterName)) {
      continue
    }

    const expectedValues = searchParams.getAll(parameterName)
    const propertyPath = parameterName.split('.')

    filters.push((record) => {
      const actualValue = getValueAtPath(record, propertyPath)

      if (actualValue == null) {
        return false
      }

      // Match records whose array property contains
      // any of the expected values (e.g. `?roles=admin`).
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) => {
          return expectedValues.includes(String(item))
        })
      }

      return expectedValues.includes(String(actualValue))
    })
  }

  return (record) => {
    return filters.every((filter) => {
      return filter(record)
    })
  }
}
