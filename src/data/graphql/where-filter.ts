/**
 * The `where` argument of the generated GraphQL operations:
 * a map of record properties to their comparators
 * (e.g. `{ name: { contains: "John" } }`).
 */
export type WhereArgument = Record<string, Record<string, unknown> | null>

type ComparatorFunction = (
  actualValue: unknown,
  expectedValue: unknown,
) => boolean

const looseEquals: ComparatorFunction = (actualValue, expectedValue) => {
  if (actualValue === expectedValue) {
    return true
  }

  // Support comparing values of different types, like the number 123
  // and the string "123" coming from an `ID` input.
  if (actualValue == null || expectedValue == null) {
    return false
  }

  return String(actualValue) === String(expectedValue)
}

const includedIn: ComparatorFunction = (actualValue, expectedValues) => {
  return (
    Array.isArray(expectedValues) &&
    expectedValues.some((expectedValue) => {
      return looseEquals(actualValue, expectedValue)
    })
  )
}

const withinRange: ComparatorFunction = (actualValue, expectedRange) => {
  if (!Array.isArray(expectedRange) || expectedRange.length !== 2) {
    return false
  }

  const [minValue, maxValue] = expectedRange

  return (
    Number(actualValue) >= Number(minValue) &&
    Number(actualValue) <= Number(maxValue)
  )
}

const comparatorFunctions: Record<string, ComparatorFunction> = {
  equals: looseEquals,
  notEquals: (actualValue, expectedValue) => {
    return !looseEquals(actualValue, expectedValue)
  },
  contains: (actualValue, expectedValue) => {
    return String(actualValue).includes(String(expectedValue))
  },
  notContains: (actualValue, expectedValue) => {
    return !String(actualValue).includes(String(expectedValue))
  },
  in: includedIn,
  notIn: (actualValue, expectedValues) => {
    return !includedIn(actualValue, expectedValues)
  },
  gt: (actualValue, expectedValue) => {
    return Number(actualValue) > Number(expectedValue)
  },
  gte: (actualValue, expectedValue) => {
    return Number(actualValue) >= Number(expectedValue)
  },
  lt: (actualValue, expectedValue) => {
    return Number(actualValue) < Number(expectedValue)
  },
  lte: (actualValue, expectedValue) => {
    return Number(actualValue) <= Number(expectedValue)
  },
  between: withinRange,
  notBetween: (actualValue, expectedRange) => {
    return !withinRange(actualValue, expectedRange)
  },
}

/**
 * Returns true if the given record matches all the comparators
 * described by the given `where` argument.
 */
export function matchesWhere(record: unknown, where: WhereArgument): boolean {
  if (record == null || typeof record !== 'object') {
    return false
  }

  return Object.entries(where).every(([propertyName, comparators]) => {
    if (comparators == null) {
      return true
    }

    const actualValue = (record as Record<string, unknown>)[propertyName]

    return Object.entries(comparators).every(
      ([comparatorName, expectedValue]) => {
        if (expectedValue == null) {
          return true
        }

        const comparator = comparatorFunctions[comparatorName]

        if (comparator == null) {
          return false
        }

        return comparator(actualValue, expectedValue)
      },
    )
  })
}
