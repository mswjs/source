/**
 * @jest-environment jsdom
 */
import * as fs from 'fs'
import * as path from 'path'
import fetch from 'cross-fetch'
import { Har } from 'har-format'
import * as compression from 'compression'
import { ServerApi, createServer } from '@open-draft/test-server'
import { headersToObject } from 'headers-utils'
import { setupServer } from 'msw/node'
import { fromTraffic } from 'src/traffic/fromTraffic'
import { emulateNetwork, headersAfterMsw } from './utils'

let httpServer: ServerApi
const server = setupServer()

const imageBase64 = fs.readFileSync(
  path.resolve(__dirname, 'fixtures/image.jpg'),
  'base64',
)

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.get('/text', (req, res) => {
      return res.status(200).send('hello world')
    })

    app.get('/json', (req, res) => {
      res.status(200).json({ id: 'abc-123', name: 'Yellow box' })
    })

    app.get('/binary', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'image/jpg',
        'Content-Legth': imageBase64.length,
      })
      res.end(imageBase64)
    })

    app.get('/cookie', (req, res) => {
      res
        .status(200)
        .cookie('secret-token', 'abc-123')
        .set('x-custom-header', 'true')
        .end()
    })

    app.get('/json-gzip', compression(), (req, res) => {
      res.status(200).json({ compressed: true })
    })
  })

  server.listen({
    onUnhandledRequest: 'bypass',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  jest.restoreAllMocks()
  await httpServer.close()
})

it('throws an exception given an HAR file with no entries', () => {
  const traffic: Har = {
    log: {
      version: '1.2',
      creator: {
        name: 'WebInspector',
        version: '537.36',
      },
      entries: [],
    },
  }

  expect(() => fromTraffic(traffic)).toThrow(
    'Failed to generate request handlers from traffic: given HAR file has no entries.',
  )
})

it('mocks a recorded text response', async () => {
  const traffic = await emulateNetwork((request) => [
    request(httpServer.http.makeUrl('/text')),
  ])
  const handlers = fromTraffic(traffic)

  expect(handlers.length).toEqual(1)

  server.use(...handlers)
  const res = await fetch(httpServer.http.makeUrl('/text'))

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(traffic.log.entries[0].response.headers),
  )
  expect(await res.text()).toEqual('hello world')
})

it('mocks a recorded JSON response', async () => {
  const traffic = await emulateNetwork((request) => [
    request(httpServer.http.makeUrl('/json')),
  ])
  const handlers = fromTraffic(traffic)

  expect(handlers.length).toEqual(1)

  server.use(...handlers)
  const res = await fetch(httpServer.http.makeUrl('/json'))

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(traffic.log.entries[0].response.headers),
  )
  expect(await res.json()).toEqual({
    id: 'abc-123',
    name: 'Yellow box',
  })
})

it('mocks a recorded binary response', async () => {
  const traffic = await emulateNetwork((request) => [
    request(httpServer.http.makeUrl('/binary')),
  ])
  const handlers = fromTraffic(traffic)
  expect(handlers.length).toEqual(1)

  server.use(...handlers)
  const res = await fetch(httpServer.http.makeUrl('/binary'))
  const blob = await res.blob()

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(traffic.log.entries[0].response.headers),
  )
  expect(blob.type).toEqual('image/jpg')
  expect(blob.size).toEqual(imageBase64.length)
  expect(await blob.text()).toEqual(imageBase64)
})

it('mocks a compressed recorded JSON response', async () => {
  const traffic = await emulateNetwork((request) => [
    request(httpServer.http.makeUrl('/json-gzip')),
  ])
  const handlers = fromTraffic(traffic)

  expect(handlers.length).toEqual(1)

  server.use(...handlers)
  const res = await fetch(httpServer.http.makeUrl('/json-gzip'))

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(traffic.log.entries[0].response.headers),
  )
  expect(await res.json()).toEqual({
    compressed: true,
  })
})

it('propagates recoded response cookies to the mocked response', async () => {
  const traffic = await emulateNetwork((request) => [
    request(httpServer.http.makeUrl('/cookie')),
  ])
  const handlers = fromTraffic(traffic)

  expect(handlers.length).toEqual(1)

  server.use(...handlers)
  const res = await fetch(httpServer.http.makeUrl('/cookie'))

  expect(res.status).toEqual(200)
  expect(headersToObject(res.headers)).toEqual(
    headersAfterMsw(traffic.log.entries[0].response.headers),
  )
  expect(document.cookie).toEqual('secret-token=abc-123')
})

it.todo('respects the order of the same recorded requests')
