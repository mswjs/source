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
  process.on('exit', async () => {
    await httpServer.close()
  })

  await generateHttpArchive(getTraffic(httpServer))
  await httpServer.close()
}
