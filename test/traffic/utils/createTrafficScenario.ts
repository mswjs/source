import { HttpServer, HttpServerMiddleware } from '@open-draft/test-server/http'
import { generateHttpArchive, TrafficDefinition } from './generateHttpArchive'

export async function createTrafficScenario(
  middleware: HttpServerMiddleware,
  getTraffic: (server: HttpServer) => TrafficDefinition,
): Promise<void> {
  const httpServer = new HttpServer((app) => {
    app.use((req, res, next) => {
      res.set('Access-Control-Allow-Origin', '*')
      return next()
    })

    middleware(app)
  })
  await httpServer.listen()

  console.log('server is running at %s', httpServer.http.url())

  process.on('exit', async () => {
    console.error('process exited, closing the server...')
    await httpServer.close()
  })

  await generateHttpArchive(getTraffic(httpServer))
  await httpServer.close()
}
