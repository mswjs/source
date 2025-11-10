import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFieldConfigMap,
  GraphQLFieldMap,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLType,
  printSchema,
  printType,
} from 'graphql'
import { type Schema } from 'zod'
import { type Collection } from '@msw/data'
import { capitalize } from 'lodash-es'

export function createGraphQLSchemaFromZod(args: {
  schema: Schema
  name: string
  key: string
  collection: Collection<any>
}): GraphQLSchema {
  const { schema, name, key, collection } = args

  const RecordType = new GraphQLObjectType({
    name,
    fields: toGraphQLType(schema, name),
  })

  const graphqlSchema = new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        [name]: {
          type: new GraphQLList(RecordType),
          args: {
            where: { type: '' },
          },
          resolve(_, args) {
            return Object.keys(args).length > 0
              ? collection.findMany()
              : collection.all()
          },
        },
      },
    }),
  })

  console.log('\n\n', printSchema(graphqlSchema))

  return graphqlSchema
}

export function toGraphQLType(typeName: string, schema: Schema): GraphQLType {
  switch (schema.def.type) {
    case 'string': {
      return GraphQLString
    }

    case 'number': {
      return GraphQLFloat
    }

    case 'int':
    case 'bigint': {
      return GraphQLInt
    }

    case 'boolean': {
      return GraphQLBoolean
    }

    case 'object': {
      /**
       * @todo Due to how GraphQL works, nested objects MUST be their own types.
       * But what if the same schema has multiple `address` that have different shapes?
       * Should we do `Address1` and `Address2` then? Huh.
       */
      return new GraphQLObjectType({
        name: typeName,
        fields: Object.fromEntries(
          Object.entries(schema.def.shape).map(([key, value]) => {
            return [key, { type: toGraphQLType(capitalize(key), value as any) }]
          }),
        ),
      })
    }

    case 'array': {
      return new GraphQLList(toGraphQLType('item', schema.def.element))
    }

    default: {
      throw new Error(`Unknown schema type "${schema.def.type}"`)
    }
  }
}
