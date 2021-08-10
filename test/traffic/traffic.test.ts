import * as fs from 'fs'
import * as path from 'path'
import { Har } from 'har-format'
import { fromTraffic } from 'src/traffic/fromTraffic'

function readHar(filePath: string): Har {
  return JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '..', filePath), 'utf8'),
  ) as Har
}

const fixtures = {
  empty: readHar('fixtures/har/empty.har'),
  example: readHar('fixtures/har/example.har'),
}

beforeAll(() => {
  jest.spyOn(global.console, 'warn').mockImplementation()
  jest.spyOn(global.console, 'error').mockImplementation()
})

afterAll(() => {
  jest.restoreAllMocks()
})

it('throws an exception given an HAR file with no entries', () => {
  expect(() => fromTraffic(fixtures.empty)).toThrow(
    'Failed to generate request handlers from traffic: given HAR file has no entries.',
  )
})

it('generates request handlers from a given HAR file', () => {
  const handlers = fromTraffic(fixtures.example)

  expect(handlers.length).toEqual(fixtures.example.log.entries.length)
  expect(console.error).not.toHaveBeenCalled()
  expect(console.warn).not.toHaveBeenCalled()
})
