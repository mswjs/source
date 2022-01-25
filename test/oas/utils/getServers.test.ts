/**
 * @jest-environment jsdom
 */
import { getServers } from '../../../src/fromOpenApi/utils/getServers'
import { createOpenApiSpec } from '../../support/createOpenApiSpec'

it('returns the "basePath" if present', () => {
  const servers = getServers(
    createOpenApiSpec({
      basePath: 'https://example.com',
    }),
  )
  expect(servers).toEqual(['https://example.com'])
})

it('returns the "servers" urls as-is', () => {
  const servers = getServers(
    createOpenApiSpec({
      servers: [{ url: 'https://example.com' }, { url: 'https://v2.mswjs.io' }],
    }),
  )
  expect(servers).toEqual(['https://example.com', 'https://v2.mswjs.io'])
})

it('returns explicit "/" when no servers were specified', () => {
  const servers = getServers(createOpenApiSpec({}))
  expect(servers).toEqual(['/'])
})
