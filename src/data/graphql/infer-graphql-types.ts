import {
  type GraphQLFieldConfigMap,
  type GraphQLInputFieldConfigMap,
  type GraphQLInputType,
  type GraphQLOutputType,
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLString,
  valueFromASTUntyped,
} from 'graphql'

/**
 * An arbitrary JSON value. Used as the type for the mutation
 * inputs (the collection schema performs the actual validation)
 * and as the fallback type for the fields whose type cannot
 * be inferred from the collection records.
 */
export const GraphQLJson = new GraphQLScalarType({
  name: 'JSON',
  description: 'An arbitrary JSON value.',
  serialize(value) {
    return value
  },
  parseValue(value) {
    return value
  },
  parseLiteral(ast, variables) {
    return valueFromASTUntyped(ast, variables)
  },
})

function createComparatorInputType(
  name: string,
  scalarType: GraphQLScalarType,
  comparatorNames: Array<string>,
): GraphQLInputObjectType {
  const listComparatorNames = ['in', 'notIn', 'between', 'notBetween']
  const fields: GraphQLInputFieldConfigMap = {}

  for (const comparatorName of comparatorNames) {
    const isListComparator = listComparatorNames.includes(comparatorName)

    fields[comparatorName] = {
      type: isListComparator ? new GraphQLList(scalarType) : scalarType,
    }
  }

  return new GraphQLInputObjectType({ name, fields })
}

const equalityComparators = ['equals', 'notEquals', 'in', 'notIn']
const stringComparators = equalityComparators.concat([
  'contains',
  'notContains',
])
const numberComparators = equalityComparators.concat([
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'notBetween',
])

export const comparatorInputTypes = {
  id: createComparatorInputType(
    'IdComparatorInput',
    GraphQLID,
    stringComparators,
  ),
  string: createComparatorInputType(
    'StringComparatorInput',
    GraphQLString,
    stringComparators,
  ),
  int: createComparatorInputType(
    'IntComparatorInput',
    GraphQLInt,
    numberComparators,
  ),
  float: createComparatorInputType(
    'FloatComparatorInput',
    GraphQLFloat,
    numberComparators,
  ),
  boolean: createComparatorInputType('BooleanComparatorInput', GraphQLBoolean, [
    'equals',
    'notEquals',
  ]),
}

export interface InferredCollectionTypes {
  entityType: GraphQLObjectType
  entityInputType: GraphQLInputObjectType
  whereInputType: GraphQLInputObjectType
}

export interface InferCollectionTypesOptions {
  /**
   * Name of the GraphQL object type describing a collection record.
   */
  typeName: string
  /**
   * The record property representing its identity (typed as `ID`).
   */
  primaryKey: string
}

/**
 * Infers the GraphQL runtime types for the collection from
 * the given (serialized) collection records. The collection schema
 * is a Standard Schema and cannot be introspected, so the types
 * are derived from the actual record values instead.
 */
export function inferCollectionTypes(
  records: Array<unknown>,
  options: InferCollectionTypesOptions,
): InferredCollectionTypes {
  const { typeName, primaryKey } = options
  const recordSamples = records.filter(isPlainObject)

  const entityFields = inferObjectFields(typeName, recordSamples, primaryKey)

  // An object type must have at least one field. Assume the identity
  // field for the collections that have no records to infer from.
  if (Object.keys(entityFields).length === 0) {
    entityFields[primaryKey] = { type: GraphQLID }
  }

  const entityType = new GraphQLObjectType({
    name: typeName,
    fields: entityFields,
  })

  const whereInputFields: GraphQLInputFieldConfigMap = {}

  for (const [fieldName, fieldConfig] of Object.entries(entityFields)) {
    const comparatorInputType = getComparatorInputType(fieldConfig.type)

    if (comparatorInputType != null) {
      whereInputFields[fieldName] = { type: comparatorInputType }
    }
  }

  if (Object.keys(whereInputFields).length === 0) {
    whereInputFields[primaryKey] = { type: comparatorInputTypes.id }
  }

  const whereInputType = new GraphQLInputObjectType({
    name: `${typeName}WhereInput`,
    fields: whereInputFields,
  })

  const entityInputType = toInputObjectType(entityType)

  return { entityType, entityInputType, whereInputType }
}

/**
 * Derives a GraphQL input object type from the given object type,
 * mirroring its fields (e.g. the `UserInput` type for `User`).
 * The input types describe the `data` argument of the mutations,
 * making them strictly typed.
 */
function toInputObjectType(
  objectType: GraphQLObjectType,
): GraphQLInputObjectType {
  return new GraphQLInputObjectType({
    name: `${objectType.name}Input`,
    fields: () => {
      const inputFields: GraphQLInputFieldConfigMap = {}

      for (const [fieldName, field] of Object.entries(objectType.getFields())) {
        inputFields[fieldName] = { type: toInputType(field.type) }
      }

      return inputFields
    },
  })
}

function toInputType(outputType: GraphQLOutputType): GraphQLInputType {
  if (outputType instanceof GraphQLList) {
    return new GraphQLList(toInputType(outputType.ofType))
  }

  if (outputType instanceof GraphQLObjectType) {
    return toInputObjectType(outputType)
  }

  if (outputType instanceof GraphQLScalarType) {
    return outputType
  }

  // The inferred types consist of scalars, lists, and object types
  // only, so any other type is a sign of a mistake.
  throw new TypeError(
    `Failed to derive an input type from "${String(outputType)}": unsupported type`,
  )
}

function inferObjectFields(
  typeName: string,
  samples: Array<Record<string, unknown>>,
  primaryKey?: string,
): GraphQLFieldConfigMap<unknown, unknown> {
  const fields: GraphQLFieldConfigMap<unknown, unknown> = {}
  const fieldNames = new Set<string>()

  for (const sample of samples) {
    for (const fieldName of Object.keys(sample)) {
      fieldNames.add(fieldName)
    }
  }

  for (const fieldName of fieldNames) {
    const fieldValues: Array<unknown> = []

    for (const sample of samples) {
      if (sample[fieldName] !== undefined) {
        fieldValues.push(sample[fieldName])
      }
    }

    fields[fieldName] = {
      type: inferValueType(
        `${typeName}${capitalize(fieldName)}`,
        fieldValues,
        fieldName === primaryKey,
      ),
    }
  }

  return fields
}

/**
 * Infers a GraphQL output type from the given value samples.
 * Falls back to the `JSON` scalar for the values whose type
 * cannot be represented (mixed types, empty objects, no samples).
 */
function inferValueType(
  typeName: string,
  values: Array<unknown>,
  isPrimaryKey: boolean,
): GraphQLOutputType {
  const definedValues = values.filter((value) => {
    return value != null
  })

  if (definedValues.length === 0) {
    return GraphQLJson
  }

  if (isPrimaryKey && definedValues.every(isScalar)) {
    return GraphQLID
  }

  if (definedValues.every((value) => typeof value === 'boolean')) {
    return GraphQLBoolean
  }

  if (definedValues.every((value) => typeof value === 'number')) {
    const isIntegerOnly = definedValues.every((value) => {
      return Number.isInteger(value)
    })

    return isIntegerOnly ? GraphQLInt : GraphQLFloat
  }

  if (definedValues.every((value) => typeof value === 'string')) {
    return GraphQLString
  }

  if (definedValues.every(Array.isArray)) {
    const itemValues = definedValues.flat(1)

    return new GraphQLList(inferValueType(typeName, itemValues, false))
  }

  if (definedValues.every(isPlainObject)) {
    const objectFields = inferObjectFields(typeName, definedValues)

    if (Object.keys(objectFields).length === 0) {
      return GraphQLJson
    }

    return new GraphQLObjectType({
      name: typeName,
      fields: objectFields,
    })
  }

  return GraphQLJson
}

function getComparatorInputType(
  fieldType: GraphQLOutputType,
): GraphQLInputType | undefined {
  switch (fieldType) {
    case GraphQLID: {
      return comparatorInputTypes.id
    }
    case GraphQLString: {
      return comparatorInputTypes.string
    }
    case GraphQLInt: {
      return comparatorInputTypes.int
    }
    case GraphQLFloat: {
      return comparatorInputTypes.float
    }
    case GraphQLBoolean: {
      return comparatorInputTypes.boolean
    }
    default: {
      return undefined
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isScalar(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
