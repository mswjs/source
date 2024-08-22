// @vitest-environment happy-dom
import { readFile } from 'fs/promises'
import { fromOpenApi } from '../../src/open-api/from-open-api.js'
import { InspectedHandler, inspectHandlers } from '../support/inspect.js'

it('supports YAML string', async () => {
  const yamlSpecification = await readFile(
    require.resolve('./fixtures/response-example.yaml'),
    'utf-8',
  )
  const handlers = await fromOpenApi(yamlSpecification)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    expect.objectContaining({
      handler: {
        method: 'GET',
        path: 'https://example.com/user',
      },
    }),
  ])
})

it('supports JSON string', async () => {
  const jsonSpecification = await readFile(
    require.resolve('./fixtures/response-example.json'),
    'utf-8',
  )
  const handlers = await fromOpenApi(jsonSpecification)
  expect(await inspectHandlers(handlers)).toEqual<InspectedHandler[]>([
    expect.objectContaining({
      handler: {
        method: 'GET',
        path: 'https://example.com/user',
      },
    }),
  ])
})
