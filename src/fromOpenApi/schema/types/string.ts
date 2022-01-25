import { datatype, internet, finance } from 'faker'
import { OpenAPIV3 } from 'openapi-types'
import { randexp } from 'randexp'
import { toBase64 } from '../../utils/toBase64'
import { toBinary } from '../../utils/toBinary'

export function evolveString(schema: OpenAPIV3.SchemaObject): string {
  if (schema.pattern) {
    return randexp(schema.pattern)
  }

  switch (schema.format?.toLowerCase()) {
    case 'byte': {
      return toBase64(datatype.string())
    }

    case 'binary': {
      return toBinary([
        datatype.number({ min: 0, max: 255 }),
        datatype.number({ min: 0, max: 255 }),
        datatype.number({ min: 0, max: 255 }),
        datatype.number({ min: 0, max: 255 }),
      ])
    }

    case 'uuid': {
      return datatype.uuid()
    }

    case 'email': {
      return internet.email()
    }

    case 'password': {
      return internet.password()
    }

    case 'date': {
      return datatype
        .datetime(schema.maximum)
        .toISOString()
        .replace(/T.+$/g, '')
    }

    case 'date-time': {
      return datatype.datetime(schema.maximum).toISOString()
    }

    case 'uri': {
      return internet.url()
    }

    case 'hostname': {
      return internet.domainName()
    }

    case 'ipv4': {
      return internet.ip()
    }

    case 'ipv6': {
      return internet.ipv6()
    }

    case 'creditcard': {
      return finance.creditCardNumber()
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
