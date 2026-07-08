import type { StandardSchemaV1 } from '@standard-schema/spec'
import { type Collection, Query } from '@msw/data'
import {
  graphql as executeGraphQL,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  parse,
  valueFromASTUntyped,
  visit,
} from 'graphql'
import {
  graphql,
  HttpResponse,
  type GraphQLHandler,
  type GraphQLQuery,
  type GraphQLResponseBody,
} from 'msw'
import { invariant } from 'outvariant'
import pluralize from 'pluralize'
import { getValueAtPath } from '../utils/get-value-at-path.js'
import { toSerializable } from '../utils/to-serializable.js'
import { capitalize, inferCollectionTypes } from './infer-graphql-types.js'
import { matchesWhere, type WhereArgument } from './where-filter.js'

export interface FromCollectionGraphQLOptions {
  format: 'graphql'
  /**
   * Name of the resource represented by this collection (singular).
   * Used to derive the operation and type names, including
   * the pluralized ones (e.g. `person` -> `person`, `people`,
   * `createPerson`, `Person`).
   */
  name: string
  /**
   * The URL of the GraphQL endpoint to scope the handlers to.
   * If not provided, the handlers match GraphQL operations
   * against any endpoint.
   */
  baseUrl?: string
  /**
   * The record property representing its identity.
   * Typed as `ID` and used to resolve the `cursor` pagination argument.
   * @default "id"
   */
  primaryKey?: string
}

interface PaginationArguments {
  skip?: number | null
  take?: number | null
  cursor?: string | null
}

/**
 * Generates GraphQL request handlers representing
 * a GraphQL API for the given collection.
 *
 * The following operations are supported (for `name: 'user'`):
 *
 * - `user(where)`, returns the first matching record or null.
 * - `users(where, skip, take, cursor)`, returns all matching records.
 * - `createUser(data)`, creates a new record.
 * - `updateUser(where, data)` / `updateUsers(where, data)`, merges
 * `data` into the matching record(s).
 * - `deleteUser(where)` / `deleteUsers(where)`, deletes the matching record(s).
 *
 * The GraphQL types are inferred from the collection records
 * on each request since the collection schema (a Standard Schema)
 * cannot be introspected.
 */
export function generateGraphQLHandlers<Schema extends StandardSchemaV1>(
  collection: Collection<Schema>,
  options: FromCollectionGraphQLOptions,
): Array<GraphQLHandler> {
  const { name, primaryKey = 'id' } = options

  invariant(
    typeof name === 'string' && name.length > 0,
    'Failed to generate GraphQL handlers from collection: expected the "name" option to be a non-empty string but got %j. The resource name is required to derive the GraphQL operation and type names.',
    name,
  )

  const pluralName = pluralize(name)

  invariant(
    pluralName !== name,
    'Failed to generate GraphQL handlers from collection: the plural form of the "name" option ("%s") equals its singular form, making the list operations indistinguishable. Please choose a different resource name.',
    name,
  )

  const target =
    options.baseUrl == null ? graphql : graphql.link(options.baseUrl)

  return [
    target.operation<GraphQLQuery>(
      async ({ request, query, variables, operationName }) => {
        const schema = generateGraphQLSchema(collection, {
          name,
          pluralName,
          primaryKey,
          /**
           * @note Provide the "data" mutation arguments as the fallback
           * type inference samples. When the collection has no records
           * to infer from yet, the first create mutation bootstraps
           * the types from its own input, making its properties both
           * accepted and selectable.
           */
          fallbackRecordSamples: extractDataArgumentValues(query, variables),
        })

        const result = await executeGraphQL({
          schema,
          source: query,
          variableValues: variables,
          /**
           * @note Read the operation name from the request itself.
           * The resolver argument is derived from the first operation
           * in the document, which is wrong for the requests that
           * execute one of multiple defined operations.
           */
          operationName:
            (await getRequestedOperationName(request)) ?? operationName,
        })

        return HttpResponse.json(
          toSerializable(result) as GraphQLResponseBody<GraphQLQuery>,
        )
      },
    ),
  ]
}

/**
 * Returns the name of the operation this GraphQL request executes.
 */
async function getRequestedOperationName(
  request: Request,
): Promise<string | undefined> {
  try {
    if (request.method === 'GET') {
      const url = new URL(request.url)

      return url.searchParams.get('operationName') ?? undefined
    }

    if (request.headers.get('content-type')?.includes('application/json')) {
      const body: unknown = await request.clone().json()

      if (
        body != null &&
        typeof body === 'object' &&
        'operationName' in body &&
        typeof body.operationName === 'string'
      ) {
        return body.operationName
      }
    }
  } catch {
    // Ignore the request body errors and defer
    // to the operation name derived from the document.
  }

  return undefined
}

/**
 * Extracts the values of all `data` arguments from the given
 * GraphQL operation (e.g. `createUser(data: { name: "John" })`).
 */
function extractDataArgumentValues(
  source: string,
  variables?: Record<string, unknown>,
): Array<unknown> {
  const dataValues: Array<unknown> = []

  try {
    visit(parse(source), {
      Argument(node) {
        if (node.name.value === 'data') {
          dataValues.push(valueFromASTUntyped(node.value, variables))
        }
      },
    })
  } catch {
    // Ignore the operations that cannot be parsed. The parsing error
    // will surface in the operation execution result.
  }

  return dataValues
}

/**
 * Generates a GraphQL schema for the given collection,
 * inferring the entity types from the collection records.
 */
export function generateGraphQLSchema<Schema extends StandardSchemaV1>(
  collection: Collection<Schema>,
  options: {
    name: string
    pluralName: string
    primaryKey: string
    fallbackRecordSamples?: Array<unknown>
  },
): GraphQLSchema {
  const { name, pluralName, primaryKey } = options
  const typeName = capitalize(name)

  const serializedRecords = collection.all().map((record) => {
    return toSerializable(record)
  })

  /**
   * @note The records are the source of truth for the type inference.
   * The fallback samples only bootstrap the types for empty collections.
   */
  const recordSamples =
    serializedRecords.length > 0
      ? serializedRecords
      : (options.fallbackRecordSamples ?? [])

  const { entityType, entityInputType, whereInputType } = inferCollectionTypes(
    recordSamples,
    { typeName, primaryKey },
  )

  const createWhereQuery = (where: WhereArgument | null | undefined) => {
    return new Query<StandardSchemaV1.InferOutput<Schema>>(
      (record: unknown) => {
        return where == null || matchesWhere(record, where)
      },
    )
  }

  const createPrimaryKeyQuery = (expectedValue: string) => {
    return new Query<StandardSchemaV1.InferOutput<Schema>>(
      (record: unknown) => {
        const actualValue = getValueAtPath(record, [primaryKey])

        return actualValue != null && String(actualValue) === expectedValue
      },
    )
  }

  const updateData = (data: unknown) => {
    invariant(
      data != null && typeof data === 'object' && !Array.isArray(data),
      'Failed to update the collection record: expected the "data" argument to be an object but got %j.',
      data,
    )

    return (draft: unknown) => {
      Object.assign(draft as Record<string, unknown>, data)
    }
  }

  const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      // Get the first record matching the query.
      [name]: {
        type: entityType,
        args: {
          where: { type: whereInputType },
        },
        resolve(_: unknown, args: { where?: WhereArgument | null }) {
          const record = collection.findFirst(createWhereQuery(args.where))

          if (record == null) {
            return null
          }

          return toSerializable(record)
        },
      },
      // Get all records matching the query.
      [pluralName]: {
        type: new GraphQLList(entityType),
        args: {
          where: { type: whereInputType },
          skip: { type: GraphQLInt },
          take: { type: GraphQLInt },
          cursor: { type: GraphQLID },
        },
        resolve(
          _: unknown,
          args: { where?: WhereArgument | null } & PaginationArguments,
        ) {
          const cursorRecord =
            args.cursor == null
              ? undefined
              : collection.findFirst(createPrimaryKeyQuery(args.cursor))

          if (args.cursor != null && cursorRecord == null) {
            return []
          }

          const records = collection.findMany(createWhereQuery(args.where), {
            skip: args.skip ?? undefined,
            take: args.take ?? undefined,
            cursor: cursorRecord,
          })

          return records.map((record) => {
            return toSerializable(record)
          })
        },
      },
    },
  })

  const mutationType = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
      // Create a new record.
      [`create${typeName}`]: {
        type: entityType,
        args: {
          data: { type: new GraphQLNonNull(entityInputType) },
        },
        async resolve(_: unknown, args: { data: unknown }) {
          const createdRecord = await collection.create(
            args.data as StandardSchemaV1.InferInput<Schema>,
          )

          return toSerializable(createdRecord)
        },
      },
      // Update the first record matching the query.
      [`update${typeName}`]: {
        type: entityType,
        args: {
          where: { type: new GraphQLNonNull(whereInputType) },
          data: { type: new GraphQLNonNull(entityInputType) },
        },
        async resolve(
          _: unknown,
          args: { where: WhereArgument; data: unknown },
        ) {
          const updatedRecord = await collection.update(
            createWhereQuery(args.where),
            {
              strict: true,
              data: updateData(args.data),
            },
          )

          return toSerializable(updatedRecord)
        },
      },
      // Update all records matching the query.
      [`update${capitalize(pluralName)}`]: {
        type: new GraphQLList(entityType),
        args: {
          where: { type: new GraphQLNonNull(whereInputType) },
          data: { type: new GraphQLNonNull(entityInputType) },
        },
        async resolve(
          _: unknown,
          args: { where: WhereArgument; data: unknown },
        ) {
          const updatedRecords = await collection.updateMany(
            createWhereQuery(args.where),
            {
              data: updateData(args.data),
            },
          )

          return updatedRecords.map((record) => {
            return toSerializable(record)
          })
        },
      },
      // Delete the first record matching the query.
      [`delete${typeName}`]: {
        type: entityType,
        args: {
          where: { type: new GraphQLNonNull(whereInputType) },
        },
        resolve(_: unknown, args: { where: WhereArgument }) {
          const deletedRecord = collection.delete(
            createWhereQuery(args.where),
            {
              strict: true,
            },
          )

          return toSerializable(deletedRecord)
        },
      },
      // Delete all records matching the query.
      [`delete${capitalize(pluralName)}`]: {
        type: new GraphQLList(entityType),
        args: {
          where: { type: new GraphQLNonNull(whereInputType) },
        },
        resolve(_: unknown, args: { where: WhereArgument }) {
          const deletedRecords = collection.deleteMany(
            createWhereQuery(args.where),
          )

          return deletedRecords.map((record) => {
            return toSerializable(record)
          })
        },
      },
    },
  })

  return new GraphQLSchema({
    query: queryType,
    mutation: mutationType,
  })
}
