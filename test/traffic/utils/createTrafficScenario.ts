import {
  createServer,
  ServerApi,
  ServerMiddleware,
} from '@open-draft/test-server'
import { generateHttpArchive, TrafficDefinition } from './generateHttpArchive'

export async function createTrafficScenario(
  middleware: ServerMiddleware,
  getTraffic: (server: ServerApi) => TrafficDefinition,
): Promise<void> {
  const httpServer = await createServer(middleware)
  console.log('server is running at %s', httpServer.http.makeUrl(''))

  process.on('exit', async () => {
    console.error('process exited, closing the server...')
    await httpServer.close()
  })

  await generateHttpArchive(getTraffic(httpServer))
  await httpServer.close()
}
